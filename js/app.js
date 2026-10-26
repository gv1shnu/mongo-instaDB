// Slide-deck player: slide 0 is the intro, slides 1..N are the story steps,
// slide N+1 is the finale. The phone beside the slide always shows the story.
(function () {
  const E = window.InstaEngine, STORY = window.STORY, SEED = window.SEED;
  // Score tracking is optional: a stand-in that does nothing keeps the deck working without score.js
  const Score = window.Score || { enabled: false, mustSignIn: () => false, init() {}, event() {}, sync() {}, renderButtons() {}, signOut() {} };
  const { assemble, canonical, stepNow, chipsFor } = window;
  const steps = STORY.steps, N = steps.length, LAST = N + 1;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const blanksOf = (st) => st.code.filter((p) => typeof p !== "string");
  const ordered = (st) => canonical(st).includes(".sort(");
  const LETTERS = "ABCD";
  const MODES = {
    write: ["✍️", "write the query"], pick: ["🧩", "pick the operator"], choice: ["☑️", "choose the query"],
    bug: ["🐞", "fix the bug"], predict: ["🔮", "predict"],
  };

  // database state before each step, following the canonical story
  const states = [SEED];
  steps.forEach((st, i) => {
    const r = E.run(canonical(st), states[i], { now: stepNow(st) });
    states.push(r.ok ? r.state : states[i]);
  });
  const runAt = (code, i) => E.run(code, states[i], { now: stepNow(steps[i]) });

  // Progress lives in the browser, one copy per signed-in student (shared lab computers),
  // plus one for whoever hasn't signed in.
  const BASE_KEY = "instadb-deck-v1";
  let key = BASE_KEY;
  const fresh = () => ({ at: 0, solved: [], tried: [], revealed: [], firstTry: [], wrong: {} });
  function load(k) {
    try {
      const saved = JSON.parse(localStorage.getItem(k));
      if (saved && Number.isInteger(saved.at) && Array.isArray(saved.solved)) return Object.assign(fresh(), saved);
    } catch (e) {}
    return fresh();
  }
  let progress = load(key);
  const save = () => { try { localStorage.setItem(key, JSON.stringify(progress)); } catch (e) {} };
  const mark = (list, i) => { if (!progress[list].includes(i)) progress[list].push(i); };
  const isSolved = (i) => progress.solved.includes(i);
  // score: slides solved without "Show answer"
  const scoreOf = (p) => p.solved.filter((i) => !p.revealed.includes(i)).length;
  const snapshot = () => ({ slides: N, at: progress.at, solved: progress.solved, firstTry: progress.firstTry, revealed: progress.revealed, wrong: progress.wrong });

  function switchOwner(u) {
    const nextKey = u ? BASE_KEY + ":" + u.email : BASE_KEY;
    if (nextKey === key) return;
    let mine = null;
    try { mine = localStorage.getItem(nextKey); } catch (e) {}
    if (u && !mine) {
      // first sign-in on this device: what was done before signing in counts for this student
      key = nextKey; save();
      try { localStorage.removeItem(BASE_KEY); } catch (e) {}
    } else {
      key = nextKey;
      progress = u ? load(key) : fresh();
    }
    setHash(progress.at);
    ui = {};
    render();
  }

  // per-slide state that isn't saved: picks for blanks, the active blank
  let ui = {};

  // ---------- navigation ----------
  const slideFromHash = () => { const n = parseInt(location.hash.replace(/^#\/?/, ""), 10); return Number.isInteger(n) ? n : null; };
  const setHash = (n) => history.replaceState(null, "", location.pathname + location.search + "#" + n);
  const gated = () => Score.mustSignIn();
  const canGoNext = () => {
    const s = progress.at;
    if (s > N || gated()) return false;
    return s === 0 || isSolved(s - 1) || progress.tried.includes(s - 1);
  };
  function go(slide) {
    slide = Math.max(0, Math.min(LAST, slide));
    progress.at = slide; save();
    if (slideFromHash() !== slide) setHash(slide);
    ui = {};
    render();
    $("stage").scrollIntoView({ block: "start", behavior: "smooth" });
  }
  const next = () => { if (canGoNext()) go(progress.at + 1); };
  const prev = () => go(progress.at - 1);

  // ---------- rendering ----------
  const chapterOf = (st) => STORY.chapters.find((c) => c.id === st.chapter);

  function render() {
    const s = progress.at;
    if (s === 0) renderIntro();
    else if (gated()) renderGate();
    else if (s > N) renderFinale();
    else renderStep(s - 1);
    renderNav();
    renderProgress();
    renderData();
    renderAccount();
    Score.renderButtons();
  }

  function renderNav() {
    const s = progress.at;
    $("prev").disabled = s === 0;
    $("next").disabled = s > N || !canGoNext();
    $("next").textContent = s === 0 ? "Start →" : s === N ? "Finish →" : "Next →";
    $("next").classList.toggle("ready", s > 0 && s <= N && isSolved(s - 1));
    $("nav-note").textContent = gated() ? "Sign in with your university Google account to start."
      : s > 0 && s <= N && !canGoNext() ? "Answer this slide to unlock Next. A wrong try counts." : "";
    $("jump").value = String(s);
  }
  function renderProgress() {
    const s = progress.at;
    $("bar-fill").style.width = (progress.solved.length / N) * 100 + "%";
    $("progress-label").textContent = s === 0 ? `${progress.solved.length} of ${N} solved · score ${scoreOf(progress)}`
      : s > N ? "Day complete" : `Slide ${s} of ${N} · ${chapterOf(steps[s - 1]).title.split(":")[0]}`;
  }
  function renderData() {
    const st = states[Math.min(Math.max(progress.at - 1, 0), N)];
    $("data-count").textContent = `(${st.users.length} users · ${st.posts.length} posts)`;
    const table = (id, name, docs) => {
      const cols = [...new Set(docs.flatMap((d) => Object.keys(d)))];
      const fmt = (v) => v instanceof Date ? (v.getUTCHours() || v.getUTCMinutes() ? v.toISOString().slice(0, 16).replace("T", " ") : v.toISOString().slice(0, 10))
        : v instanceof E.ObjectId ? "ObjectId(…" + String(v).slice(-4) + ")" : v instanceof E.Timestamp ? String(v)
        : Array.isArray(v) ? "[" + v.map((x) => JSON.stringify(x)).join(", ") + "]" : typeof v === "string" ? v : String(v);
      const cell = (v) => (v === undefined ? '<td class="missing">—</td>' : `<td>${esc(fmt(v))}</td>`);
      $(id).innerHTML = `<caption>${name}</caption><thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
        <tbody>${docs.map((d) => `<tr>${cols.map((c) => cell(d[c])).join("")}</tr>`).join("")}</tbody>`;
    };
    table("users-table", "users", st.users);
    table("posts-table", "posts", st.posts);
  }

  function renderIntro() {
    const counts = {};
    steps.forEach((st) => (counts[st.mode] = (counts[st.mode] || 0) + 1));
    $("slide").innerHTML = `<div class="eyebrow">MongoDB practice · Lectures 2 and 3</div>
      <h2 class="slide-title">${esc(STORY.title)}</h2>
      <p class="lead">${STORY.intro}</p>
      <div class="kinds">${Object.keys(MODES).filter((m) => counts[m]).map((m) => `<span class="tag mode-${m}">${MODES[m][0]} ${MODES[m][1]} · ${counts[m]}</span>`).join("")}</div>
      <ol class="agenda">${STORY.chapters.map((c) => {
        const first = steps.findIndex((s) => s.chapter === c.id);
        return `<li><a href="#${first + 1}">${esc(c.title)}</a></li>`;
      }).join("")}</ol>
      ${signInPanel()}
      <p class="muted small">Use <kbd>←</kbd> <kbd>→</kbd> to move between slides and <kbd>1</kbd>–<kbd>4</kbd> to pick an option.</p>`;
    resetTerminal();
    phone({ idle: true, before: SEED, spec: { time: "6:59" } });
  }

  // ---------- sign-in and score ----------
  const scoreLine = () => `Your score: <b>${scoreOf(progress)} / ${N}</b> (slides solved without "Show answer"), ${progress.firstTry.length} of them on the first try.`;
  function signInPanel() {
    if (!Score.enabled) return "";
    const u = Score.user;
    if (u) return `<div class="signin-panel ok"><b>Signed in as ${esc(u.email)}.</b> Your score is saved to the class sheet after every answer.
      <span class="muted" id="signin-detail">${esc(Score.detail)}</span></div>`;
    return `<div class="signin-panel"><b>Sign in with your university Google account</b> (${Score.domains.map((d) => `<code>@${esc(d)}</code>`).join(" or ")}) so your score is recorded.
      Your personal Gmail won't work.${Score.status === "unavailable" ? "" : '<div class="g-signin"></div><span class="muted small">Nothing happens when you click? Allow pop-ups for this site, or open the link in Chrome instead of an app\'s built-in browser.</span>'}<span class="muted" id="signin-detail">${esc(Score.detail)}</span></div>`;
  }
  function renderGate() {
    $("slide").innerHTML = `<div class="eyebrow">Before you start</div>
      <h2 class="slide-title">Sign in to record your score</h2>
      ${signInPanel()}
      <p class="muted small">${Score.status === "loading" ? "Loading Google sign-in…" : "Once you're signed in, this slide opens by itself."}</p>`;
    resetTerminal();
    phone({ idle: true, before: SEED, spec: { time: "6:59" } });
  }
  // the account chip in the header; rebuilt only when its shape changes so the Google button doesn't flicker
  let accountShape = "";
  function renderAccount() {
    const el = $("account");
    if (!Score.enabled) { el.hidden = true; return; }
    el.hidden = false;
    const u = Score.user, st = Score.status;
    const needsButton = !u || st === "expired" || st === "wrong-domain";
    const shape = (u ? u.email : "-") + "|" + needsButton;
    const labels = { loading: "Loading sign-in…", unavailable: "Score not recorded", signin: "Not signed in", "wrong-domain": "Use your university account",
      saving: "Saving…", saved: "Score saved ✓", offline: "Offline: will retry", expired: "Sign in again to save" };
    if (shape !== accountShape) {
      accountShape = shape;
      el.innerHTML = `${u ? `<span class="acct-name" title="${esc(u.email)}">${esc(u.email)}</span>` : ""}
        <span class="acct-status" id="acct-status"></span>
        ${needsButton ? '<span class="g-signin" data-size="small"></span>' : ""}
        ${u ? '<button class="acct-out" id="acct-out" type="button">Sign out</button>' : ""}`;
      if (u) $("acct-out").onclick = () => { if (confirm("Sign out? Your saved score stays in the class sheet.")) Score.signOut(); };
    }
    $("acct-status").textContent = `${labels[st] || ""}${u ? ` · ${scoreOf(progress)}/${N}` : ""}`;
    $("acct-status").className = "acct-status " + st;
    el.title = Score.detail || "";
    const d = document.getElementById("signin-detail");
    if (d) d.textContent = Score.detail;
    Score.renderButtons();
  }

  function renderFinale() {
    const end = states[N];
    const rev = progress.revealed.length;
    $("slide").innerHTML = `<div class="eyebrow">Midnight</div>
      <h2 class="slide-title">That's the day on instaDB 🌙</h2>
      <p class="lead">You created a user and her posts, read profiles, filtered with comparison, logical, regex and array operators, paged through a sorted feed, changed fields and arrays with update operators, replaced a whole document and cleaned up. instaDB ends the day with <b>${end.users.length} users</b> and <b>${end.posts.length} posts</b>.</p>
      <p class="score-line">${scoreLine()}${Score.user ? ` Saved to the class sheet as ${esc(Score.user.email)}.` : ""}</p>
      <p class="muted">${progress.solved.length} of ${N} slides solved. ${rev ? `You used "Show answer" on ${rev} slide${rev > 1 ? "s" : ""}: ${progress.revealed.slice().sort((a, b) => a - b).map((i) => `<a href="#${i + 1}">${i + 1}</a>`).join(", ")}. Try those again without it.` : "You didn't reveal a single answer."}</p>
      <div class="actions"><button class="btn primary" id="again">Restart the day</button></div>`;
    $("again").onclick = restart;
    resetTerminal();
    phone({ finale: true, before: end, spec: { time: "0:05" } });
  }

  function renderStep(i) {
    const st = steps[i], [icon, label] = MODES[st.mode];
    $("slide").innerHTML = `<div class="eyebrow">${esc(chapterOf(st).title)}</div>
      <div class="step-meta"><span class="num">${i + 1}</span><span class="tag mode-${st.mode}">${icon} ${label}</span><span class="tag">${esc(st.op)}</span>${st.trap ? '<span class="tag warn">⚠️ predict first</span>' : ""}${progress.revealed.includes(i) ? '<span class="rev">answer shown</span>' : ""}</div>
      <div class="before big">${st.before}</div>
      <div id="widget"></div>
      <div class="actions" id="actions">
        ${st.mode === "write" ? '<button class="btn primary" id="run">Run ▶</button>' : ""}
        <button class="btn" id="hint">Hint</button>
        <button class="btn" id="reveal">Show answer</button>
      </div>
      <div class="feedback" id="feedback" hidden></div>`;
    if (st.mode === "write") document.querySelectorAll("#slide .given").forEach(addCopy);
    $("hint").onclick = () => feedback("info", "Hint", esc(st.hint));
    $("reveal").onclick = () => reveal(i);
    WIDGETS[st.mode].draw(i);
    if (isSolved(i)) showSolved(i);
    else { resetTerminal(); phone({ idle: true, before: states[i], spec: st.screen }); }
  }

  // A Copy button on a given document, so write slides test the query, not retyping the fields.
  function addCopy(pre) {
    const text = pre.textContent;
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.type = "button";
    btn.textContent = "Copy";
    btn.setAttribute("aria-label", "Copy this document");
    const done = (ok) => {
      if (!ok) { // no clipboard access: select the document so Ctrl+C copies it
        const range = document.createRange(); range.selectNodeContents(pre.firstChild);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      }
      btn.textContent = ok ? "Copied ✓" : "Selected: press Ctrl+C";
      setTimeout(() => (btn.textContent = "Copy"), ok ? 1600 : 4000);
    };
    const fallback = () => {
      const ta = Object.assign(document.createElement("textarea"), { value: text });
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      ta.remove(); done(ok);
    };
    btn.onclick = () => {
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => done(true), fallback);
      else fallback();
    };
    pre.appendChild(btn);
  }

  function feedback(kind, head, body, extra) {
    const f = $("feedback");
    f.hidden = false;
    f.className = "feedback " + kind;
    f.innerHTML = `<div class="head">${head}</div><div>${body}</div>${extra || ""}`;
  }

  // ---------- phone + terminal ----------
  // the phone is only a preview: if drawing it fails, say so on the phone and keep the slide working
  const phone = (ctx) => {
    if (!window.Phone) return;
    try { window.Phone.render($("phone"), ctx); }
    catch (e) { $("phone").innerHTML = '<div class="ph-frame"><div class="ph-screen"><div class="ph-emptystate"><div class="ph-empty-icon">📵</div><b>Preview unavailable</b><small>The terminal below still shows the result.</small></div></div></div>'; }
  };
  const resetTerminal = () => { $("output").innerHTML = 'instaDB&gt; <span class="muted">// every query you run or pick shows its result here</span>'; };
  function showRun(i, code, res) {
    terminal(code.trim(), res, states[i]);
    phone({ res, before: states[i], after: res.ok ? res.state : null, spec: steps[i].screen });
    if (window.matchMedia("(max-width: 940px)").matches) $("phone-col").classList.add("open");
  }
  function terminal(code, res, before) {
    let body;
    if (!res.ok) body = `<span class="err">${esc(res.error)}</span>`;
    else {
      const v = res.value;
      if (Array.isArray(v)) body = esc(E.show(v)) + `\n<span class="count">// ${v.length} document${v.length === 1 ? "" : "s"}</span>`;
      else if (v && typeof v === "object" && "acknowledged" in v) {
        body = esc(E.show(v));
        if ("matchedCount" in v) {
          const changed = res.state.users.concat(res.state.posts).filter((d, k) => JSON.stringify(before.users.concat(before.posts)[k]) !== JSON.stringify(d));
          if (changed.length) body += `\n<span class="muted">// changed document${changed.length > 1 ? "s" : ""}:</span>\n` + esc(E.show(changed.length === 1 ? changed[0] : changed));
        } else body += `\n<span class="muted">// now: ${res.state.users.length} users, ${res.state.posts.length} posts</span>`;
      } else body = esc(E.show(v));
    }
    $("output").innerHTML = `instaDB&gt; ${esc(code)}\n${body}`;
  }
  const short = (res) => (res.ok ? E.show(res.value).replace(/\s*\n\s*/g, " ") : res.error);

  // ---------- solving ----------
  const record = (i, kind, answer) => Score.event({ slide: i, op: steps[i].op, kind, answer: String(answer == null ? "" : answer).slice(0, 300) });
  function solve(i, answer, replay) {
    const st = steps[i];
    if (!replay && !isSolved(i)) {
      if (!progress.tried.includes(i)) mark("firstTry", i);
      record(i, "solved", answer);
    }
    mark("solved", i); mark("tried", i); save();
    feedback("ok", "Correct ✓", st.after, (st.trapNote ? `<p class="trap">${st.trapNote}</p>` : "") +
      `<div class="actions"><button class="btn primary" id="continue">${i + 1 < N ? "Next slide →" : "Finish the day →"}</button></div>`);
    $("continue").onclick = next;
    WIDGETS[st.mode].lock(i);
    $("reveal").disabled = true;
    renderNav(); renderProgress(); renderAccount();
  }
  function wrong(i, head, body, answer) {
    mark("tried", i);
    progress.wrong[i] = (progress.wrong[i] || 0) + 1;
    save();
    record(i, "wrong", answer);
    feedback("bad", head, body);
    renderNav();
  }
  function showSolved(i) {
    const st = steps[i];
    WIDGETS[st.mode].fill(i);
    const code = canonical(st);
    const res = runAt(code, i);
    showRun(i, code, res);
    $("phone-col").classList.remove("open");
    solve(i, null, true);
  }
  function reveal(i) {
    if (!progress.revealed.includes(i) && !isSolved(i)) record(i, "shown", "");
    mark("revealed", i); mark("tried", i); save();
    WIDGETS[steps[i].mode].reveal(i);
  }

  // Explain how a write-step answer differs from the expected one.
  function explainDiff(st, got, want) {
    const g = got.value, w = want.value;
    const kind = (v) => Array.isArray(v) ? "list" : v === null ? "null" : v && typeof v === "object" && "acknowledged" in v ? ("deletedCount" in v ? "delete" : "matchedCount" in v ? "update" : "insertedIds" in v ? "insertMany" : "insertOne") : "doc";
    const gk = kind(g), wk = kind(w);
    const names = { list: "a list of documents (find)", doc: "a single document (findOne)", null: "null (findOne found nothing)", insertOne: "an insertOne result", insertMany: "an insertMany result", update: "an update result", delete: "a delete result" };
    if (gk !== wk) return `Your query returned ${names[gk]}, but this step needs ${names[wk]}. Check which method you used.`;
    if (gk === "list") {
      if (g.length !== w.length) return `Your query returned ${g.length} document${g.length === 1 ? "" : "s"}; this step needs ${w.length}.`;
      return ordered(st) ? "Right number of documents, but not the right ones in the right order." : "Right number of documents, but not the right ones. Check your filter.";
    }
    if (gk === "doc") return "You got a single document, but not the one this step asks for. Check your filter.";
    if (gk === "insertOne" || gk === "insertMany") return "The inserted document doesn't match the form. Check every field name, spelling, and value type: numbers without quotes, true/false without quotes, text in quotes.";
    if (gk === "update") {
      if (g.matchedCount !== w.matchedCount) return `Your update matched ${g.matchedCount} document${g.matchedCount === 1 ? "" : "s"}; this step should match ${w.matchedCount}. Check the method (updateOne vs updateMany) and the filter.`;
      return "Right documents, but they changed differently from what the story asks. Check each operator and its value. The phone and the terminal show what your query did.";
    }
    if (gk === "delete") {
      if (g.deletedCount !== w.deletedCount) return `You deleted ${g.deletedCount} post${g.deletedCount === 1 ? "" : "s"}; this step should delete ${w.deletedCount}. Check the method (deleteOne vs deleteMany) and the filter.`;
      return "Right number deleted, but not the right posts. Check your filter.";
    }
    return "Not the result this step needs.";
  }

  // ---------- question widgets ----------
  const optionButtons = (st, render) => `<div class="opts" role="list">${st.options.map((o, k) =>
    `<button class="opt" data-k="${k}" role="listitem"><span class="opt-key">${LETTERS[k]}</span>${render(o)}</button>`).join("")}</div>`;
  const lockOptions = (i) => {
    const okK = steps[i].options.findIndex((o) => o.ok);
    document.querySelectorAll("#widget .opt").forEach((b) => { b.disabled = true; if (+b.dataset.k === okK) b.classList.add("ok"); });
  };

  const WIDGETS = {
    write: {
      draw(i) {
        $("widget").innerHTML = `<textarea class="editor" id="editor" rows="3" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Your query" placeholder="Type the whole query, e.g. db.collection.method( ... )"></textarea>
          <p class="kbd-tip">Press <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> to run. Watch the phone.</p>`;
        const ed = $("editor");
        const grow = () => { ed.style.height = "auto"; ed.style.height = ed.scrollHeight + 2 + "px"; };
        ed.addEventListener("input", () => { grow(); ed.classList.remove("bad", "ok"); });
        ed.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.check(i); }
          else if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); ed.setRangeText("  ", ed.selectionStart, ed.selectionEnd, "end"); }
        });
        $("run").onclick = () => this.check(i);
      },
      check(i) {
        const st = steps[i], code = $("editor").value;
        if (!code.trim()) { feedback("info", "Type your query first", "Write the whole command, starting with <code>db.</code>"); return; }
        const res = runAt(code, i), want = runAt(canonical(st), i);
        showRun(i, code, res);
        const ok = res.ok && E.fingerprint(res, ordered(st)) === E.fingerprint(want, ordered(st));
        $("editor").classList.toggle("ok", ok); $("editor").classList.toggle("bad", !ok);
        if (ok) return solve(i, code);
        if (!res.ok) return wrong(i, "MongoDB rejected the query", esc(res.error) + "<br><span class='muted'>The error is also in the terminal below.</span>", code);
        wrong(i, "It ran, but it's not what the story needs", explainDiff(st, res, want), code);
      },
      fill(i) { const ed = $("editor"); ed.value = canonical(steps[i]); ed.dispatchEvent(new Event("input")); },
      lock() { $("editor").disabled = true; $("editor").classList.add("ok"); $("run").disabled = true; },
      reveal(i) {
        const ed = $("editor"); ed.value = canonical(steps[i]); ed.classList.add("revealed"); ed.dispatchEvent(new Event("input"));
        feedback("info", "Here's the answer", "Read it, then press <b>Run ▶</b> to see what it does.");
        renderNav();
      },
    },

    pick: {
      draw(i) {
        const st = steps[i], blanks = blanksOf(st);
        if (!ui.picks) { ui.picks = blanks.map(() => null); ui.active = 0; }
        let bi = 0;
        const code = st.code.map((p) => {
          if (typeof p === "string") return esc(p);
          const k = bi++, v = ui.picks[k];
          const state = ui.marks ? (ui.marks[k] ? "ok" : "bad") : "";
          return `<button class="slot ${v ? "filled" : ""} ${k === ui.active && !ui.locked ? "active" : ""} ${state}" data-k="${k}" aria-label="blank ${k + 1}">${v ? esc(v) : "&nbsp;?&nbsp;"}</button>`;
        }).join("");
        const chips = ui.locked ? "" : chipsFor(st, blanks[ui.active]).map((c, n) =>
          `<button class="pick-chip ${ui.picks[ui.active] === c ? "on" : ""}" data-v="${esc(c)}"><kbd>${n + 1}</kbd> ${esc(c)}</button>`).join("");
        $("widget").innerHTML = `<div class="code pick-code">${code}</div>` +
          (ui.locked ? "" : `<div class="bank"><span class="bank-label">${blanks.length > 1 ? `Blank ${ui.active + 1} of ${blanks.length}` : "Pick one"}</span>${chips}</div>`);
        document.querySelectorAll("#widget .slot").forEach((b) => (b.onclick = () => { if (ui.locked) return; ui.active = +b.dataset.k; this.draw(i); }));
        document.querySelectorAll("#widget .pick-chip").forEach((b) => (b.onclick = () => this.choose(i, b.dataset.v)));
      },
      choose(i, v) {
        ui.picks[ui.active] = v; ui.marks = null;
        const empty = ui.picks.findIndex((p) => p === null);
        if (empty >= 0) { ui.active = empty; this.draw(i); return; }
        this.draw(i);
        this.check(i);
      },
      key(i, n) { const st = steps[i], c = chipsFor(st, blanksOf(st)[ui.active])[n]; if (c !== undefined && !ui.locked) this.choose(i, c); },
      check(i) {
        const st = steps[i], blanks = blanksOf(st), code = assemble(st.code, ui.picks);
        const res = runAt(code, i);
        showRun(i, code, res);
        ui.marks = ui.picks.map((v, k) => v === blanks[k].b);
        const bad = ui.marks.map((m, k) => (m ? -1 : k)).filter((k) => k >= 0);
        if (!bad.length && res.ok) { this.draw(i); return solve(i, ui.picks.join(" · ")); }
        ui.active = bad.length ? bad[0] : ui.active;
        this.draw(i);
        const why = bad.map((k) => blanks[k].why[ui.picks[k]]).filter(Boolean);
        const which = blanks.length > 1 ? `Blank ${bad.map((k) => k + 1).join(" and ")} ${bad.length > 1 ? "aren't" : "isn't"} right. ` : "";
        const body = why.length ? which + why.join(" ")
          : !res.ok ? which + `MongoDB rejected it: <code>${esc(res.error)}</code>`
          : which + "It ran, but it doesn't do what the task asks. Compare the phone with the task, then pick again.";
        wrong(i, "Not quite", body, ui.picks.join(" · "));
      },
      fill(i) { ui.picks = blanksOf(steps[i]).map((b) => b.b); ui.marks = ui.picks.map(() => true); ui.locked = true; this.draw(i); },
      lock(i) { ui.locked = true; ui.marks = ui.picks.map(() => true); this.draw(i); },
      reveal(i) { ui.picks = blanksOf(steps[i]).map((b) => b.b); this.draw(i); this.check(i); },
    },

    choice: {
      draw(i) {
        const st = steps[i];
        $("widget").innerHTML = optionButtons(st, (o) => `<code class="opt-code">${esc(o.code)}</code>`);
        document.querySelectorAll("#widget .opt").forEach((b) => (b.onclick = () => this.choose(i, +b.dataset.k)));
      },
      choose(i, k) {
        const st = steps[i], o = st.options[k];
        const btn = document.querySelector(`#widget .opt[data-k="${k}"]`);
        if (!btn || btn.disabled) return;
        const res = runAt(o.code, i);
        showRun(i, o.code, res);
        if (o.ok) return solve(i, `${LETTERS[k]}: ${o.code}`);
        btn.classList.add("bad");
        wrong(i, `${LETTERS[k]} isn't it`, esc(o.why || "") + (res.ok ? "" : `<br><span class="muted">MongoDB says: <code>${esc(res.error)}</code></span>`) + "<br><span class='muted'>The phone shows what it did. Try another.</span>", `${LETTERS[k]}: ${o.code}`);
      },
      key(i, n) { if (n < steps[i].options.length) this.choose(i, n); },
      fill() {},
      lock: lockOptions,
      reveal(i) { this.choose(i, steps[i].options.findIndex((o) => o.ok)); },
    },

    predict: {
      draw(i) {
        const st = steps[i];
        $("widget").innerHTML = `<div class="code">${esc(st.query)}</div>` + optionButtons(st, (o) => `<span class="opt-text">${esc(o.text)}</span>`);
        document.querySelectorAll("#widget .opt").forEach((b) => (b.onclick = () => this.choose(i, +b.dataset.k)));
      },
      choose(i, k) {
        const st = steps[i], o = st.options[k];
        const btn = document.querySelector(`#widget .opt[data-k="${k}"]`);
        if (!btn || btn.disabled) return;
        showRun(i, st.query, runAt(st.query, i));
        if (o.ok) return solve(i, `${LETTERS[k]}: ${o.text}`);
        btn.classList.add("bad");
        wrong(i, `${LETTERS[k]} isn't what happens`, esc(o.why || "") + "<br><span class='muted'>The query just ran: the phone shows what really happens. Pick the answer that matches it.</span>", `${LETTERS[k]}: ${o.text}`);
      },
      key(i, n) { if (n < steps[i].options.length) this.choose(i, n); },
      fill() {},
      lock: lockOptions,
      reveal(i) { this.choose(i, steps[i].options.findIndex((o) => o.ok)); },
    },
  };
  // "fix the bug" is a choice with the broken query (and what mongosh said about it) on top
  WIDGETS.bug = Object.assign(Object.create(WIDGETS.choice), {
    draw(i) {
      const st = steps[i], res = runAt(st.broken, i);
      $("widget").innerHTML = `<div class="broken"><div class="broken-label">The intern's query</div><div class="code">${esc(st.broken)}</div>
        <pre class="said ${res.ok ? "" : "err"}">${res.ok ? "→ " : "✖ "}${esc(short(res))}</pre></div>
        <div class="opts-label">Which one fixes it?</div>` + optionButtons(st, (o) => `<code class="opt-code">${esc(o.code)}</code>`);
      document.querySelectorAll("#widget .opt").forEach((b) => (b.onclick = () => this.choose(i, +b.dataset.k)));
    },
  });

  // ---------- keyboard ----------
  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // inside the query box, arrows move the cursor; they turn the slide only while the box is empty
    const typing = t && (t.tagName === "INPUT" || (t.tagName === "TEXTAREA" && t.value.trim() && !t.disabled));
    if (typing) return;
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    else if (/^[1-4]$/.test(e.key) && progress.at > 0 && progress.at <= N) {
      const i = progress.at - 1, w = WIDGETS[steps[i].mode];
      if (w.key && !isSolved(i)) { e.preventDefault(); w.key(i, +e.key - 1); }
    }
  });

  function restart() {
    if (progress.solved.length && !confirm("Restart the day from the first slide? Your progress on this device will be cleared" + (Score.user ? ", and your score in the class sheet starts again from 0." : "."))) return;
    progress = fresh();
    save();
    Score.sync();
    go(0);
  }

  // ---------- wiring ----------
  $("jump").innerHTML = `<option value="0">Intro</option>` +
    steps.map((st, i) => `<option value="${i + 1}">${i + 1}. ${esc(st.op)} (${esc(st.screen.time)})</option>`).join("") +
    `<option value="${LAST}">Finale</option>`;
  $("jump").onchange = (e) => { e.target.blur(); go(+e.target.value); };
  // the jump menu would otherwise eat ← → and change slides one option at a time
  $("jump").addEventListener("keydown", (e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.target.blur(); });
  $("prev").onclick = prev;
  $("next").onclick = next;
  $("restart").onclick = restart;
  $("phone-toggle").onclick = () => $("phone-col").classList.toggle("open");
  window.addEventListener("hashchange", () => { const s = slideFromHash(); if (s !== null && s !== progress.at) go(s); });

  const start = slideFromHash();
  progress.at = start !== null ? Math.max(0, Math.min(LAST, start)) : Math.min(progress.at, LAST);
  setHash(progress.at);
  render();

  // score tracking starts after the first render, so the deck shows up even if Google is slow or blocked
  let wasGated = gated(), lastStatus = Score.status;
  Score.init({
    getSnapshot: snapshot,
    onUser: switchOwner,
    onChange: () => {
      renderAccount();
      // redraw the slide when the sign-in gate opens or closes, or the intro's sign-in panel changes
      const redraw = gated() !== wasGated || (progress.at === 0 && Score.status !== lastStatus && ["signin", "unavailable", "wrong-domain"].includes(Score.status));
      wasGated = gated(); lastStatus = Score.status;
      if (redraw) render();
    },
  });
})();
