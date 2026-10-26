// Score tracking: "Sign in with Google" (university accounts only) and syncing
// each student's progress to the Apps Script score sheet.
// Built to fail soft: if it isn't configured, or Google / Apps Script can't be
// reached, the deck keeps working and progress stays saved in the browser.
(function (root) {
  const cfg = root.INSTADB_CONFIG || {};
  // allowedDomains is a list; a single allowedDomain string also works
  const domains = [].concat(cfg.allowedDomains || [], cfg.allowedDomain || []).map((d) => String(d).toLowerCase()).filter(Boolean);
  const enabled = !!(cfg.googleClientId && domains.length && cfg.scriptUrl);
  const domainList = domains.map((d) => "@" + d).join(" or ");
  const AUTH_KEY = "instadb-auth", OUTBOX_KEY = "instadb-outbox";
  const RETRY = [5, 15, 30, 60, 120];

  const store = {
    get(k, area = localStorage) { try { return JSON.parse(area.getItem(k)); } catch (e) { return null; } },
    set(k, v, area = localStorage) { try { area.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k, area = localStorage) { try { area.removeItem(k); } catch (e) {} },
  };

  let opts = { getSnapshot: () => ({}), onUser: () => {}, onChange: () => {}, onSaved: () => {} };
  let user = null;          // { email, name, picture, token, exp }
  let status = enabled ? "loading" : "off"; // off | loading | unavailable | signin | wrong-domain | saving | saved | offline | expired
  let detail = "";
  let gisReady = false, timer = null, inFlight = false, retryN = 0;

  const expired = (u) => !u || u.exp * 1000 < Date.now() + 60000;
  const outbox = () => store.get(OUTBOX_KEY) || [];
  const setStatus = (s, d = "") => { status = s; detail = d; opts.onChange(); };

  function decodeJwt(t) {
    const part = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(part + "===".slice((part.length + 3) % 4));
    return JSON.parse(decodeURIComponent(bin.split("").map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")));
  }

  function signedIn(credential) {
    let c;
    try { c = decodeJwt(credential); } catch (e) { setStatus("signin", "That sign-in didn't work. Try again."); return; }
    const email = String(c.email || "").toLowerCase();
    if (!domains.includes(email.split("@")[1]) && !domains.includes(String(c.hd || "").toLowerCase())) {
      setStatus("wrong-domain", `${email} isn't a university account. Sign in with your ${domainList} account.`);
      return;
    }
    const changed = !user || user.email !== email;
    user = { email, name: c.name || email, picture: c.picture || "", token: credential, exp: c.exp };
    store.set(AUTH_KEY, user, sessionStorage);
    retryN = 0;
    if (changed) opts.onUser(user);
    setStatus("saving");
    sync(0);
  }

  function signOut() {
    if (!enabled) return;
    store.del(AUTH_KEY, sessionStorage);
    if (root.google && google.accounts) google.accounts.id.disableAutoSelect();
    user = null;
    opts.onUser(null);
    setStatus("signin");
    renderButtons();
  }

  function loadGoogle() {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    const giveUp = setTimeout(() => { if (!gisReady) unavailable(); }, 8000);
    s.onerror = () => { clearTimeout(giveUp); unavailable(); };
    s.onload = () => {
      clearTimeout(giveUp);
      try {
        google.accounts.id.initialize({
          client_id: cfg.googleClientId,
          callback: (r) => signedIn(r.credential),
          // with one domain, Google's account chooser shows only those accounts
          hd: domains.length === 1 ? domains[0] : undefined,
          auto_select: true,
          cancel_on_tap_outside: false,
          // Chrome's built-in sign-in (FedCM) needs no pop-up window, so pop-up blockers can't stop it
          use_fedcm_for_prompt: true,
          use_fedcm_for_button: true,
        });
        gisReady = true;
        if (!user) { setStatus(status === "loading" ? "signin" : status); google.accounts.id.prompt(); }
        renderButtons();
      } catch (e) { unavailable(); }
    };
    document.head.appendChild(s);
  }
  function unavailable() {
    // a student who is already signed in keeps saving; only new sign-ins need Google's script
    if (gisReady || user) return;
    setStatus("unavailable", "Google sign-in couldn't load, so your score isn't being recorded. You can still practise.");
  }

  // Draw a Google button into every empty .g-signin slot on the page.
  function renderButtons() {
    if (!gisReady) return;
    document.querySelectorAll(".g-signin").forEach((el) => {
      if (el.dataset.drawn) return;
      el.dataset.drawn = "1";
      try { google.accounts.id.renderButton(el, { theme: "outline", size: el.dataset.size || "large", text: "signin_with", shape: "pill" }); } catch (e) {}
    });
  }

  // ---- syncing ----
  function event(ev) {
    if (!enabled) return;
    const box = outbox();
    box.push(Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), t: Date.now() }, ev));
    store.set(OUTBOX_KEY, box.slice(-500));
    sync();
  }
  function sync(delay = 800) {
    if (!enabled) return;
    clearTimeout(timer);
    timer = setTimeout(send, delay);
  }
  async function send() {
    if (inFlight) { sync(1000); return; }
    if (!user) return;
    if (expired(user)) {
      setStatus("expired", "Your sign-in has run out. Sign in again to keep saving; nothing is lost.");
      if (gisReady) google.accounts.id.prompt();
      renderButtons();
      return;
    }
    const events = outbox().slice(0, 50);
    inFlight = true;
    setStatus("saving");
    try {
      const res = await fetch(cfg.scriptUrl, {
        method: "POST",
        // text/plain keeps this a "simple" request, which Apps Script answers without a CORS preflight
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(Object.assign({ idToken: user.token, events }, opts.getSnapshot())),
      });
      const data = await res.json();
      if (data.ok) {
        const sent = new Set(events.map((e) => e.id));
        store.set(OUTBOX_KEY, outbox().filter((e) => !sent.has(e.id)));
        retryN = 0;
        setStatus("saved");
        try { opts.onSaved(data); } catch (e) {}
        if (outbox().length) sync(300);
      } else if (data.code === 401) {
        store.del(AUTH_KEY, sessionStorage);
        const email = user.email;
        user = Object.assign({}, user, { exp: 0 });
        setStatus("expired", data.error || `Sign in again as ${email} to keep saving.`);
        if (gisReady) google.accounts.id.prompt();
        renderButtons();
      } else throw new Error(data.error || "save failed");
    } catch (e) {
      const wait = RETRY[Math.min(retryN++, RETRY.length - 1)];
      setStatus("offline", `Couldn't reach the score sheet. Trying again in ${wait} s; your progress is safe on this device.`);
      sync(wait * 1000);
    } finally {
      inFlight = false;
    }
  }

  function init(o) {
    opts = Object.assign(opts, o);
    if (!enabled) return;
    const saved = store.get(AUTH_KEY, sessionStorage);
    if (saved && !expired(saved)) { user = saved; status = "saving"; }
    if (user) { opts.onUser(user); sync(0); }
    loadGoogle();
    window.addEventListener("online", () => sync(0));
  }

  root.Score = {
    get enabled() { return enabled; },
    get user() { return user; },
    get status() { return status; },
    get detail() { return detail; },
    get domains() { return domains; },
    // the deck should wait for sign-in: only when configured, required, and Google sign-in actually loaded
    mustSignIn: () => enabled && !!cfg.requireSignIn && !user && status !== "unavailable",
    init, event, sync, signOut, renderButtons,
  };
})(typeof window !== "undefined" ? window : globalThis);
