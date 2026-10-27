// Slide-deck exam: slide 0 is the intro, slides 1..N are the story steps,
// slide N+1 is the results. The phone beside the slide always shows the story.
// Exam rules: one submitted answer per slide, a hint halves that slide's points,
// and solutions only appear once every slide is answered.
(function () {
  const E = window.InstaEngine, STORY = window.STORY, SEED = window.SEED;
  // Score tracking is optional: a stand-in that does nothing keeps the deck working without score.js
  const Score = window.Score || { enabled: false, mustSignIn: () => false, init() {}, event() {}, sync() {}, renderButtons() {}, signOut() {} };
  const { assemble, canonical, stepNow, chipsFor } = window;
  const steps = STORY.steps, N = steps.length, LAST = N + 1;
  const POINTS = 10, HINT_COST = 5, MAX = POINTS * N;
  // seconds per slide; when they run out, the current selection is submitted (or the slide counts as wrong)
  const TIME = { write: 120, pick: 60, choice: 65, bug: 65, predict: 65 }; // worst case for all 24: 29 min 35 s
  const TIMEOUT = "(no answer: time ran out)";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const blanksOf = (st) => st.code.filter((p) => typeof p !== "string");
  const ordered = (st) => canonical(st).includes(".sort(");
  const LETTERS = "ABCD";
  const MODES = {
    write: ["✍️", "write the query"], pick: ["🧩", "pick the operator"], choice: ["☑️", "choose the query"],
    bug: ["🐞", "fix the bug"], predict: ["🔮", "predict"],
  };
  const KIND = { write: "Code writing", pick: "Fill in the blanks", choice: "Multiple choice", bug: "Multiple choice", predict: "Multiple choice" };

  // database state before each step, following the canonical story
  const states = [SEED];
  steps.forEach((st, i) => {
    const r = E.run(canonical(st), states[i], { now: stepNow(st) });
    states.push(r.ok ? r.state : states[i]);
  });
  const runAt = (code, i) => E.run(code, states[i], { now: stepNow(steps[i]) });

  // ---------- progress ----------
  // Lives in the browser, one copy per signed-in student (shared lab computers), plus one
  // for whoever hasn't signed in. answers[i] = { ok, given, sel } once slide i is submitted.
  // DECK names this set of slides; answers saved for a different set are never mixed in
  const DECK = "common-24";
  const BASE_KEY = "instadb-exam-" + DECK;
  let key = BASE_KEY;
  // deadlines[i] is set when slide i first opens, so reloading or going back doesn't reset its timer
  const fresh = () => ({ at: 0, answers: {}, hints: [], deadlines: {}, activity: { tabs: 0, away: 0 } });
  function load(k) {
    try {
      const saved = JSON.parse(localStorage.getItem(k));
      if (saved && Number.isInteger(saved.at) && saved.answers) return Object.assign(fresh(), saved);
    } catch (e) {}
    return fresh();
  }
  let progress = load(key);
  const save = () => { try { localStorage.setItem(key, JSON.stringify(progress)); } catch (e) {} };
  const answer = (i) => progress.answers[i];
  const answeredCount = () => Object.keys(progress.answers).length;
  const finished = () => answeredCount() === N;
  const hinted = (i) => progress.hints.includes(i);
  const pointsFor = (i) => { const a = answer(i); return a && a.ok ? (hinted(i) ? POINTS - HINT_COST : POINTS) : 0; };
  const total = () => steps.reduce((s, st, i) => s + pointsFor(i), 0);
  const firstOpen = () => { for (let i = 0; i < N; i++) if (!answer(i)) return i; return N; };
  const snapshot = () => ({
    deck: DECK, slides: N, at: progress.at, hints: progress.hints, activity: progress.activity, board: finished(),
    answers: Object.fromEntries(Object.entries(progress.answers).map(([i, a]) => [i, { ok: a.ok, given: a.given }])),
  });
  // the score sheet keeps each student's first answer per slide; adopt it, so clearing the
  // browser or switching devices can't undo an answer
  let board = null;
  function fromServer(data) {
    let changed = false;
    Object.entries(data.answers || {}).forEach(([i, a]) => {
      const mine = progress.answers[i];
      if (!mine || mine.ok !== a.ok || mine.given !== a.given) { progress.answers[i] = { ok: !!a.ok, given: String(a.given || ""), sel: mine && mine.given === a.given ? mine.sel : null }; changed = true; }
    });
    (data.hints || []).forEach((i) => { if (!hinted(i)) { progress.hints.push(i); changed = true; } });
    if (data.board) { board = data.board; if (progress.at > N) changed = true; }
    if (changed) { save(); ui = {}; render(); }
  }

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
    board = null;
    progress.at = Math.min(progress.at, reach());
    setHash(progress.at);
    ui = {};
    render();
  }

  // per-slide state that isn't saved: the current selection before Submit
  let ui = {};

  // ---------- navigation ----------
  const slideFromHash = () => { const n = parseInt(location.hash.replace(/^#\/?/, ""), 10); return Number.isInteger(n) ? n : null; };
  const setHash = (n) => history.replaceState(null, "", location.pathname + location.search + "#" + n);
  const gated = () => Score.mustSignIn();
  // the furthest slide a student can open: the first unanswered one, or the results
  const reach = () => (finished() ? LAST : firstOpen() + 1);
  const canGoNext = () => {
    const s = progress.at;
    if (s > N || gated()) return false;
    return s === 0 || !!answer(s - 1);
  };
  function go(slide) {
    slide = Math.max(0, Math.min(LAST, reach(), slide));
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
  // chapter titles end in the topic, e.g. "(replaceOne, Delete)"; keep that out of sight until the end
  const plainTitle = (t) => (finished() ? t : t.replace(/\s*\([^)]*\)\s*$/, ""));

  function render() {
    stopTimer();
    stopAutoNext();
    const s = progress.at;
    if (s === 0) renderIntro();
    else if (gated()) renderGate();
    else if (s > N) renderResults();
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
    $("next").textContent = s === 0 ? "Start →" : s === N ? "See results →" : "Next →";
    $("next").classList.toggle("ready", s > 0 && s <= N && !!answer(s - 1));
    $("nav-note").textContent = gated() ? "Sign in with your university Google account to start."
      : s > 0 && s <= N && !canGoNext() ? "Submit an answer to unlock Next." : "";
    $("counter").textContent = s === 0 ? "Intro" : s > N ? "Results" : `Slide ${s} of ${N}`;
  }
  function renderProgress() {
    const s = progress.at, n = answeredCount();
    $("bar-fill").style.width = (n / N) * 100 + "%";
    $("progress-label").textContent = s === 0 ? `${n} of ${N} answered` + (finished() ? ` · ${total()} / ${MAX}` : "")
      : s > N ? (finished() ? `Score ${total()} / ${MAX}` : `${n} of ${N} answered`) : `Slide ${s} of ${N} · ${chapterOf(steps[s - 1]).title.split(":")[0]}`;
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

  const rulesHTML = () => `<div class="rules"><b>How it's marked</b>
    <ul>
      <li><b>One try per slide.</b> Pick or type your answer, then press <b>Submit</b>. It locks after that.</li>
      <li><b>${POINTS} points</b> for each right answer, <b>${POINTS - HINT_COST}</b> if you used the hint, <b>0</b> if it's wrong. ${N} slides, ${MAX} points.</li>
      <li><b>Every slide has a timer:</b> ${TIME.write} s to write a query, ${TIME.pick} s to fill in a blank, ${TIME.choice} s for a multiple-choice question. When it runs out, whatever you've picked or typed is submitted (if nothing, the slide counts as wrong) and you move on to the next slide. Leaving the slide or reloading doesn't stop it.</li>
      <li><b>Solutions come at the end.</b> You'll see every answer and why it's right${Score.enabled ? ", and where you stand on the class leaderboard," : ""} once all ${N} slides are answered.</li>
    </ul></div>`;

  function renderIntro() {
    const counts = {};
    steps.forEach((st) => (counts[st.mode] = (counts[st.mode] || 0) + 1));
    $("slide").innerHTML = `<div class="eyebrow">${Score.enabled ? "MongoDB exam · Lectures 2 and 3" : "MongoDB in one day · CRUD and operators"}</div>
      <h2 class="slide-title">${esc(STORY.title)}</h2>
      <p class="lead">${STORY.intro}</p>
      ${rulesHTML()}
      <div class="kinds">${Object.keys(MODES).filter((m) => counts[m]).map((m) => `<span class="tag mode-${m}">${MODES[m][0]} ${MODES[m][1]} · ${counts[m]}</span>`).join("")}</div>
      <ol class="agenda">${STORY.chapters.map((c) => {
        const nums = steps.map((s, k) => (s.chapter === c.id ? k + 1 : 0)).filter(Boolean);
        const [time, what] = plainTitle(c.title).split(/:\s*/);
        const range = nums.length > 1 ? `slides ${nums[0]}–${nums[nums.length - 1]}` : `slide ${nums[0]}`;
        return `<li><span class="ag-time">${esc(time)}</span><span class="ag-what">${esc(what)}</span><span class="ag-range">${range}</span></li>`;
      }).join("")}</ol>
      ${signInPanel()}`;
    resetTerminal();
    phone({ idle: true, before: SEED, spec: { time: "6:59" } });
  }

  // ---------- sign-in ----------
  function signInPanel() {
    if (!Score.enabled) return "";
    const u = Score.user;
    if (u) return `<div class="signin-panel ok"><b>Signed in as ${esc(u.email)}.</b> Your answers are saved to the class sheet as you go.
      <span class="muted small">Switching tabs or windows is recorded with your score.</span>
      <span class="muted" id="signin-detail">${esc(Score.detail)}</span></div>`;
    return `<div class="signin-panel"><b>Sign in with your university Google account</b> (${Score.domains.map((d) => `<code>@${esc(d)}</code>`).join(" or ")}) so your score is recorded.
      Your personal Gmail won't work. Once you're signed in, switching tabs or windows is recorded with your score.${Score.status === "unavailable" ? "" : '<div class="g-signin"></div><span class="muted small">Nothing happens when you click? Allow pop-ups for this site, or open the link in Chrome instead of an app\'s built-in browser.</span>'}<span class="muted" id="signin-detail">${esc(Score.detail)}</span></div>`;
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
      saving: "Saving…", saved: "Saved ✓", offline: "Offline: will retry", expired: "Sign in again to save" };
    if (shape !== accountShape) {
      accountShape = shape;
      el.innerHTML = `${u ? `<span class="acct-name" title="${esc(u.email)}">${esc(u.email)}</span>` : ""}
        <span class="acct-status" id="acct-status"></span>
        ${needsButton ? '<span class="g-signin" data-size="small"></span>' : ""}
        ${u ? '<button class="acct-out" id="acct-out" type="button">Sign out</button>' : ""}`;
      if (u) $("acct-out").onclick = () => { if (confirm("Sign out? Your saved answers stay in the class sheet.")) Score.signOut(); };
    }
    $("acct-status").textContent = `${labels[st] || ""}${u ? ` · ${answeredCount()}/${N} answered` : ""}`;
    $("acct-status").className = "acct-status " + st;
    el.title = Score.detail || "";
    const d = document.getElementById("signin-detail");
    if (d) d.textContent = Score.detail;
    Score.renderButtons();
  }

  // ---------- a question slide ----------
  function renderStep(i) {
    const st = steps[i], [icon, label] = MODES[st.mode], a = answer(i);
    const pts = a ? `<span class="tag ${a.ok ? "pts-ok" : "pts-bad"}">${a.ok ? `+${pointsFor(i)}` : "0"} points</span>` : "";
    // the topic tag (e.g. "insertOne()") names the answer, so it only appears once the exam is done
    $("slide").innerHTML = `<div class="eyebrow">${esc(plainTitle(chapterOf(st).title))}</div>
      <div class="step-meta"><span class="num">${i + 1}</span><span class="tag mode-${st.mode}">${icon} ${label}</span>${finished() ? `<span class="tag">${esc(st.op)}</span>` : ""}${st.trap && !a ? '<span class="tag warn">⚠️ predict first</span>' : ""}${hinted(i) ? '<span class="tag hint-used">hint used</span>' : ""}${pts}${a ? "" : '<span class="timer" id="timer" role="timer" aria-live="off"></span>'}</div>
      <div class="before big">${st.before}</div>
      <div id="widget"></div>
      <div class="hint-box" id="hint-box" ${hinted(i) ? "" : "hidden"}><b>Hint:</b> ${esc(st.hint)}</div>
      <div class="actions" id="actions" ${a ? "hidden" : ""}>
        <button class="btn primary" id="submit" disabled>Submit answer</button>
        ${hinted(i) ? "" : `<button class="btn" id="hint">Hint (−${HINT_COST} points)</button>`}
      </div>
      <div class="feedback" id="feedback" hidden></div>
      <div id="solution"></div>`;
    if (st.mode === "write" && !a) document.querySelectorAll("#slide .given").forEach(addCopy);
    const w = WIDGETS[st.mode];
    w.draw(i);
    if (a) {
      showAnswered(i);
    } else {
      $("submit").onclick = () => submit(i);
      if ($("hint")) $("hint").onclick = () => useHint(i);
      resetTerminal();
      phone({ idle: true, before: states[i], spec: st.screen });
      startTimer(i);
    }
  }

  // ---------- per-slide timer ----------
  let timer = null;
  const stopTimer = () => { clearInterval(timer); timer = null; };
  function startTimer(i) {
    if (!progress.deadlines) progress.deadlines = {};
    if (!progress.deadlines[i]) { progress.deadlines[i] = Date.now() + TIME[steps[i].mode] * 1000; save(); }
    const tick = () => {
      const left = Math.max(0, Math.ceil((progress.deadlines[i] - Date.now()) / 1000));
      const el = $("timer");
      if (el) {
        el.textContent = `⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
        el.className = "timer" + (left <= 5 ? " urgent" : left <= 15 ? " low" : "");
      }
      if (left <= 0) timeUp(i);
    };
    tick();
    if (!answer(i)) timer = setInterval(tick, 250);
  }
  function timeUp(i) {
    stopTimer();
    if (answer(i) || progress.at !== i + 1) return;
    const st = steps[i];
    if (WIDGETS[st.mode].value(i) != null) return submit(i, true);
    progress.answers[i] = { ok: false, given: TIMEOUT, sel: null, timeout: true };
    save();
    record(i, "timeout", "");
    ui = {};
    renderStep(i);
    renderNav(); renderProgress(); renderAccount();
    autoNext(i);
  }
  // after any submit or time-out, show the result for a moment, then move on by itself
  let autoTimer = null;
  const stopAutoNext = () => { clearInterval(autoTimer); autoTimer = null; };
  function autoNext(i) {
    let n = 3;
    $("feedback").insertAdjacentHTML("beforeend", `<p class="auto-next">Moving to ${i + 1 < N ? "the next slide" : "your results"} in <b id="auto-n">${n}</b> s…</p>`);
    autoTimer = setInterval(() => {
      n--;
      if ($("auto-n")) $("auto-n").textContent = n;
      if (n <= 0) { stopAutoNext(); if (progress.at === i + 1) next(); }
    }, 1000);
  }
  // the widget calls this whenever the selection changes
  const selectionChanged = (i) => { if ($("submit")) $("submit").disabled = WIDGETS[steps[i].mode].value(i) == null; };

  function useHint(i) {
    if (hinted(i) || answer(i)) return;
    if (!confirm(`Use the hint? A right answer on this slide will then be worth ${POINTS - HINT_COST} points instead of ${POINTS}.`)) return;
    progress.hints.push(i); save();
    record(i, "hint", "");
    $("hint-box").hidden = false;
    $("hint").remove();
    const meta = document.querySelector("#slide .step-meta");
    meta.insertAdjacentHTML("beforeend", '<span class="tag hint-used">hint used</span>');
  }

  function submit(i, timedOut) {
    const st = steps[i], w = WIDGETS[st.mode], sel = w.value(i);
    if (sel == null || answer(i)) return;
    stopTimer();
    const code = w.codeFor(i, sel), res = runAt(code, i);
    const ok = w.correct(i, sel, res);
    progress.answers[i] = { ok, given: w.label(i, sel), sel, timeout: !!timedOut };
    save();
    record(i, ok ? "right" : "wrong", progress.answers[i].given + (hinted(i) ? " (after hint)" : "") + (timedOut ? " (submitted when time ran out)" : ""));
    ui = {};
    renderStep(i);
    renderNav(); renderProgress(); renderAccount();
    autoNext(i);
  }

  // a submitted slide: the student's own answer, locked, and what it did on the phone
  function showAnswered(i) {
    const st = steps[i], w = WIDGETS[st.mode], a = answer(i);
    w.lock(i, a);
    if (a.sel != null) {
      const code = w.codeFor(i, a.sel);
      showRun(i, code, runAt(code, i));
      $("phone-col").classList.remove("open");
    } else {
      resetTerminal();
      phone({ idle: true, before: states[i], spec: st.screen });
    }
    const last = i + 1 === N;
    const nextBtn = `<div class="actions"><button class="btn primary" id="continue">${last ? "See results →" : "Next slide →"}</button></div>`;
    const late = a.timeout ? (a.sel != null ? "⏱ Time's up: your answer was submitted. " : "⏱ Time's up. ") : "";
    if (a.ok) feedback("ok", `${late}Correct ✓ · +${pointsFor(i)} points${hinted(i) ? " (hint used)" : ""}`, st.after, nextBtn);
    else feedback("bad", `${late}${a.given === TIMEOUT ? "No answer" : "Not right"} · 0 points`, finished()
      ? "The solution is below."
      : `You'll see the right answer and why once you've answered all ${N} slides.`, nextBtn);
    $("continue").onclick = next;
    if (finished()) $("solution").innerHTML = solutionHTML(i, true);
  }

  // ---------- solutions (only once every slide is answered) ----------
  // a fill-in-the-blank solution, with the chosen chips highlighted
  const filledCode = (st) => st.code.map((p) => (typeof p === "string" ? esc(p) : `<mark>${esc(p.b)}</mark>`)).join("");
  function whyWrong(i) {
    const st = steps[i], a = answer(i);
    if (!a || a.ok || a.sel == null) return "";
    if (st.mode === "pick") return blanksOf(st).map((b, k) => b.why[a.sel[k]]).filter(Boolean).join(" ");
    if (st.mode === "write") {
      const res = runAt(a.sel, i);
      return res.ok ? explainDiff(st, res, runAt(canonical(st), i)) : `MongoDB rejected it: ${esc(res.error)}`;
    }
    return esc((st.options[a.sel] || {}).why || "");
  }
  // the question exactly as the slide asked it, options included
  function questionHTML(i) {
    const st = steps[i], a = answer(i) || {};
    let extra = "";
    if (st.mode === "pick") extra = `<pre class="code sol-q-code">${st.code.map((p) => (typeof p === "string" ? esc(p) : '<span class="sol-blank">____</span>')).join("")}</pre>`;
    if (st.mode === "bug") extra = `<p class="sol-sub">The query that fails:</p><pre class="code sol-q-code">${esc(st.broken)}</pre>`;
    if (st.mode === "predict") extra = `<pre class="code sol-q-code">${esc(st.query)}</pre>`;
    if (st.options) extra += `<ol class="sol-opts">${st.options.map((o, k) => {
      const tags = (o.ok ? '<span class="sol-tag ok">right answer</span>' : "") + (a.sel === k ? `<span class="sol-tag ${o.ok ? "ok" : "bad"}">your pick</span>` : "");
      return `<li class="${o.ok ? "right" : a.sel === k ? "mine" : ""}"><b>${LETTERS[k]}.</b> ${o.code ? `<code class="sol-code">${esc(o.code)}</code>` : esc(o.text)} ${tags}</li>`;
    }).join("")}</ol>`;
    return `<div class="sol-q">${st.before}${extra}</div>`;
  }
  // withQuestion: the results page repeats the question; under a slide it's already on screen
  function solutionHTML(i, open, withQuestion) {
    const st = steps[i], a = answer(i) || { ok: false, given: "" };
    const why = whyWrong(i), code = canonical(st);
    const right = st.options && st.options.find((o) => o.ok);
    const rightPick = right && st.mode === "predict" && !a.ok ? `<p><span class="sol-label">Right answer</span><b>${LETTERS[st.options.indexOf(right)]}.</b> ${esc(right.text)}</p>` : "";
    return `<details class="sol ${a.ok ? "ok" : "bad"}" ${open ? "open" : ""}>
      <summary><span class="sol-num">${i + 1}</span><span class="sol-op">${esc(st.op)}</span><span class="sol-kind">${MODES[st.mode][0]}</span>
        <span class="sol-pts">${a.ok ? "✓" : "✗"} ${pointsFor(i)}/${POINTS}${hinted(i) ? " · hint" : ""}</span></summary>
      <div class="sol-body">
        ${withQuestion ? `<span class="sol-label">Question</span>${questionHTML(i)}` : ""}
        <p><span class="sol-label">Your answer</span>${a.given ? `<code class="sol-code">${esc(a.given)}</code>` : "<i>none</i>"}</p>
        ${why ? `<p><span class="sol-label">Why yours isn't right</span>${why}</p>` : ""}
        ${rightPick}
        ${right && right.why ? `<p><span class="sol-label">Why it's right</span>${esc(right.why)}</p>` : ""}
        <span class="sol-label">${st.mode === "predict" ? "The query and its output" : "Solution and its output"}</span>
        ${st.mode === "pick" ? `<pre class="code sol-q-code">${filledCode(st)}</pre>` : ""}
        <pre class="terminal sol-out">${runText(code, runAt(code, i), states[i])}</pre>
        <p><span class="sol-label">What happens</span>${st.after}</p>
        ${st.trapNote ? `<p class="trap">${st.trapNote}</p>` : ""}
      </div></details>`;
  }

  // ---------- results ----------
  function breakdownHTML() {
    const rows = (groups) => groups.map(([name, idx]) => {
      const got = idx.reduce((s, i) => s + pointsFor(i), 0), max = idx.length * POINTS;
      const right = idx.filter((i) => answer(i) && answer(i).ok).length;
      return `<tr><td>${esc(name)}</td><td>${right} / ${idx.length}</td><td class="bd-bar"><span style="width:${(got / max) * 100}%"></span></td><td><b>${got}</b> / ${max}</td></tr>`;
    }).join("");
    const byChapter = STORY.chapters.map((c) => [c.title, steps.map((s, i) => (s.chapter === c.id ? i : -1)).filter((i) => i >= 0)]);
    const kinds = [...new Set(steps.map((s) => KIND[s.mode]))];
    const byKind = kinds.map((k) => [k, steps.map((s, i) => (KIND[s.mode] === k ? i : -1)).filter((i) => i >= 0)]);
    const head = "<thead><tr><th></th><th>Right</th><th></th><th>Points</th></tr></thead>";
    return `<h3 class="res-h">Breakdown</h3>
      <table class="breakdown">${head}<tbody>${rows(byKind)}</tbody></table>
      <table class="breakdown">${head}<tbody>${rows(byChapter)}</tbody></table>`;
  }
  function leaderboardHTML() {
    if (!Score.enabled) return "";
    if (!Score.enabled) return "";
    if (!Score.user) return `<h3 class="res-h">Leaderboard</h3><p class="muted">Sign in with your university account to appear on the class leaderboard.</p>`;
    if (!board) return `<h3 class="res-h">Leaderboard</h3><p class="muted">${Score.status === "offline" || Score.status === "expired" ? esc(Score.detail) : "Loading the class leaderboard…"}</p>`;
    const ord = (n) => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
    const you = board.rank ? `You are <b>${ord(board.rank)}</b> of ${board.of} student${board.of === 1 ? "" : "s"} who have finished.` : esc(board.note || "You'll be ranked once your score is saved.");
    return `<h3 class="res-h">Leaderboard</h3>
      <p>${you} Class average: <b>${board.average}</b> / ${MAX}.</p>
      <table class="board"><thead><tr><th>#</th><th>Student</th><th>Score</th></tr></thead><tbody>
        ${(board.top || []).map((r) => `<tr class="${r.you ? "you" : ""}"><td>${r.rank}</td><td>${esc(r.name)}${r.you ? " (you)" : ""}</td><td>${r.score}</td></tr>`).join("")}
      </tbody></table>
      <p class="muted small">Top 10 by first name. Ties share a rank.</p>`;
  }
  function renderResults() {
    const end = states[N];
    resetTerminal();
    phone({ finale: true, before: end, spec: { time: "0:05" } });
    if (!finished()) {
      const open = steps.map((s, i) => (answer(i) ? -1 : i + 1)).filter((n) => n > 0);
      $("slide").innerHTML = `<div class="eyebrow">Almost there</div>
        <h2 class="slide-title">${open.length} slide${open.length > 1 ? "s" : ""} left</h2>
        <p class="lead">Answer every slide to see your score and the solutions${Score.enabled ? " and the leaderboard" : ""}. Still open: ${open.join(", ")}.</p>
        <div class="actions"><button class="btn primary" id="goto">Go to slide ${open[0]} →</button></div>`;
      $("goto").onclick = () => go(open[0]);
      return;
    }
    const right = steps.filter((s, i) => answer(i).ok).length, hints = progress.hints.length;
    $("slide").innerHTML = `<div class="eyebrow">Midnight · results</div>
      <h2 class="slide-title">That's the day on instaDB 🌙</h2>
      <div class="score-big"><b>${total()}</b><span>/ ${MAX}</span></div>
      <p class="score-sub">${right} of ${N} right · ${N - right} wrong · ${hints} hint${hints === 1 ? "" : "s"} used${Score.user ? ` · saved as ${esc(Score.user.email)}` : ""}</p>
      ${leaderboardHTML()}
      ${breakdownHTML()}
      <h3 class="res-h">Solutions</h3>
      <div class="sol-tools"><label class="only-wrong"><input type="checkbox" id="only-wrong"> Show only the ones I got wrong</label><button class="btn" id="open-all" type="button">Open all</button></div>
      <div class="sols" id="sols">${steps.map((s, i) => solutionHTML(i, false, true)).join("")}</div>
      ${Score.enabled ? "" : '<div class="actions"><button class="btn primary" id="again" type="button">Play again ↺</button></div>'}`;
    // without a score sheet there's nothing to protect, so anyone can replay the day
    if (!Score.enabled) $("again").onclick = () => {
      if (!confirm("Start the day again? Your answers and score here will be cleared.")) return;
      progress = fresh(); save(); ui = {};
      go(0);
    };
    $("only-wrong").onchange = (e) => $("sols").classList.toggle("only-wrong", e.target.checked);
    $("open-all").onclick = () => {
      const all = [...document.querySelectorAll("#sols .sol")], open = !all.every((d) => d.open);
      all.forEach((d) => (d.open = open));
      $("open-all").textContent = open ? "Close all" : "Open all";
    };
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
  const resetTerminal = () => { $("output").innerHTML = 'instaDB&gt; <span class="muted">// your submitted query and its result show here</span>'; };
  function showRun(i, code, res) {
    terminal(code.trim(), res, states[i]);
    phone({ res, before: states[i], after: res.ok ? res.state : null, spec: steps[i].screen });
    if (window.matchMedia("(max-width: 940px)").matches) $("phone-col").classList.add("open");
  }
  function terminal(code, res, before) { $("output").innerHTML = runText(code, res, before); }
  function runText(code, res, before) {
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
    return `instaDB&gt; ${esc(code)}\n${body}`;
  }
  const short = (res) => (res.ok ? E.show(res.value).replace(/\s*\n\s*/g, " ") : res.error);
  const record = (i, kind, detail) => Score.event({ slide: i, op: steps[i].op, kind, answer: String(detail == null ? "" : detail).slice(0, 300) });

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
      return "Right documents, but they changed differently from what the story asks. Check each operator and its value.";
    }
    if (gk === "delete") {
      if (g.deletedCount !== w.deletedCount) return `You deleted ${g.deletedCount} post${g.deletedCount === 1 ? "" : "s"}; this step should delete ${w.deletedCount}. Check the method (deleteOne vs deleteMany) and the filter.`;
      return "Right number deleted, but not the right posts. Check your filter.";
    }
    return "Not the result this step needs.";
  }

  // ---------- question widgets ----------
  // Each widget draws the question, reports the current selection (value), turns a
  // selection into a query (codeFor), marks it (correct), labels it for the sheet,
  // and redraws itself locked on the submitted answer (lock).
  const optionButtons = (st, render) => `<div class="opts" role="radiogroup">${st.options.map((o, k) =>
    `<button class="opt" data-k="${k}" role="radio" aria-checked="false"><span class="opt-key">${LETTERS[k]}</span>${render(o)}</button>`).join("")}</div>`;
  const choiceBase = {
    bind(i) {
      document.querySelectorAll("#widget .opt").forEach((b) => (b.onclick = () => {
        if (answer(i)) return;
        ui.k = +b.dataset.k;
        document.querySelectorAll("#widget .opt").forEach((x) => { const on = +x.dataset.k === ui.k; x.classList.toggle("sel", on); x.setAttribute("aria-checked", on); });
        selectionChanged(i);
      }));
    },
    value: () => (Number.isInteger(ui.k) ? ui.k : null),
    codeFor: (i, k) => steps[i].options[k].code,
    correct: (i, k, res) => !!steps[i].options[k].ok,
    label: (i, k) => `${LETTERS[k]}: ${steps[i].options[k].code || steps[i].options[k].text}`,
    lock(i, a) {
      document.querySelectorAll("#widget .opt").forEach((b) => {
        b.disabled = true;
        const k = +b.dataset.k, mine = a.sel === k, right = !!steps[i].options[k].ok;
        if (mine) b.classList.add(a.ok ? "ok" : "bad");
        if (right && finished() && !a.ok) b.classList.add("ok");
      });
    },
  };

  const WIDGETS = {
    write: {
      draw(i) {
        $("widget").innerHTML = `<textarea class="editor" id="editor" rows="3" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Your query" placeholder="Type the whole query, e.g. db.collection.method( ... )"></textarea>
          <p class="kbd-tip">Check your query carefully: <b>Submit</b> runs it once and locks it.</p>`;
        const ed = $("editor");
        const grow = () => { ed.style.height = "auto"; ed.style.height = ed.scrollHeight + 2 + "px"; };
        ed.addEventListener("input", () => { grow(); selectionChanged(i); });
      },
      value: () => { const v = $("editor") && $("editor").value.trim(); return v ? v : null; },
      codeFor: (i, code) => code,
      correct(i, code, res) {
        const st = steps[i], want = runAt(canonical(st), i);
        return res.ok && E.fingerprint(res, ordered(st)) === E.fingerprint(want, ordered(st));
      },
      label: (i, code) => code,
      lock(i, a) {
        const ed = $("editor");
        ed.value = a.sel != null ? a.sel : a.given;
        ed.dispatchEvent(new Event("input"));
        ed.disabled = true;
        ed.classList.add(a.ok ? "ok" : "bad");
        document.querySelector("#widget .kbd-tip").remove();
      },
    },

    pick: {
      draw(i) {
        const st = steps[i], blanks = blanksOf(st), a = answer(i);
        if (!ui.picks) { ui.picks = a && Array.isArray(a.sel) ? a.sel.slice() : blanks.map(() => null); ui.active = 0; }
        let bi = 0;
        const code = st.code.map((p) => {
          if (typeof p === "string") return esc(p);
          const k = bi++, v = ui.picks[k];
          const state = a ? (a.ok ? "ok" : finished() ? (v === blanks[k].b ? "ok" : "bad") : "bad") : "";
          return `<button class="slot ${v ? "filled" : ""} ${k === ui.active && !a ? "active" : ""} ${state}" data-k="${k}" aria-label="blank ${k + 1}" ${a ? "disabled" : ""}>${v ? esc(v) : "&nbsp;?&nbsp;"}</button>`;
        }).join("");
        const chips = a ? "" : chipsFor(st, blanks[ui.active]).map((c) =>
          `<button class="pick-chip ${ui.picks[ui.active] === c ? "on" : ""}" data-v="${esc(c)}">${esc(c)}</button>`).join("");
        $("widget").innerHTML = `<div class="code pick-code">${code}</div>` + (a && !Array.isArray(a.sel) ? `<p class="muted small">Your answer: <code>${esc(a.given)}</code></p>` : "") +
          (a ? "" : `<div class="bank"><span class="bank-label">${blanks.length > 1 ? `Blank ${ui.active + 1} of ${blanks.length}` : "Pick one"}</span>${chips}</div>`);
        document.querySelectorAll("#widget .slot").forEach((b) => (b.onclick = () => { ui.active = +b.dataset.k; this.draw(i); }));
        document.querySelectorAll("#widget .pick-chip").forEach((b) => (b.onclick = () => {
          ui.picks[ui.active] = b.dataset.v;
          const empty = ui.picks.findIndex((p) => p === null);
          if (empty >= 0) ui.active = empty;
          this.draw(i);
          selectionChanged(i);
        }));
      },
      value: () => (ui.picks && ui.picks.every((p) => p !== null) ? ui.picks.slice() : null),
      codeFor: (i, picks) => assemble(steps[i].code, picks),
      correct: (i, picks, res) => res.ok && picks.every((v, k) => v === blanksOf(steps[i])[k].b),
      label: (i, picks) => picks.join(" · "),
      lock(i) { ui.picks = null; this.draw(i); },
    },

    choice: Object.assign({}, choiceBase, {
      draw(i) {
        $("widget").innerHTML = optionButtons(steps[i], (o) => `<code class="opt-code">${esc(o.code)}</code>`);
        this.bind(i);
      },
    }),

    predict: Object.assign({}, choiceBase, {
      draw(i) {
        const st = steps[i];
        $("widget").innerHTML = `<div class="code">${esc(st.query)}</div>` + optionButtons(st, (o) => `<span class="opt-text">${esc(o.text)}</span>`);
        this.bind(i);
      },
      // a prediction runs the given query, so the phone shows what really happens
      codeFor: (i) => steps[i].query,
      label: (i, k) => `${LETTERS[k]}: ${steps[i].options[k].text}`,
    }),
  };
  // "fix the bug" is a choice with the broken query (and what mongosh said about it) on top
  WIDGETS.bug = Object.assign({}, WIDGETS.choice, {
    draw(i) {
      const st = steps[i], res = runAt(st.broken, i);
      $("widget").innerHTML = `<div class="broken"><div class="broken-label">The intern's query</div><div class="code">${esc(st.broken)}</div>
        <pre class="said ${res.ok ? "" : "err"}">${res.ok ? "→ " : "✖ "}${esc(short(res))}</pre></div>
        <div class="opts-label">Which one fixes it?</div>` + optionButtons(st, (o) => `<code class="opt-code">${esc(o.code)}</code>`);
      this.bind(i);
    },
  });

  // ---------- activity: tab and window switches ----------
  // Recorded only for signed-in students, who are told so on the sign-in panel.
  let hiddenAt = 0, blurAt = 0;
  function noteActivity(kind, detail) {
    if (!Score.user) return;
    const a = progress.activity = Object.assign({ tabs: 0, away: 0 }, progress.activity);
    a.tabs++;
    save();
    const i = progress.at - 1; // -1 is the intro, N the results
    Score.event({ slide: i, op: steps[i] ? steps[i].op : i < 0 ? "intro" : "results", kind, answer: detail });
  }
  const awayFor = (since, kind) => {
    const secs = Math.round((Date.now() - since) / 1000);
    progress.activity = Object.assign({ tabs: 0, away: 0 }, progress.activity);
    if (Score.user) progress.activity.away += secs;
    noteActivity(kind, `away ${secs} s`);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hiddenAt = Date.now(); blurAt = 0; }
    else if (hiddenAt) { awayFor(hiddenAt, "left tab"); hiddenAt = 0; }
  });
  // another window or app in front while this tab stays visible; clicks into the
  // Google sign-in button (an iframe) and blurs shorter than 3 s don't count
  window.addEventListener("blur", () => setTimeout(() => {
    const el = document.activeElement;
    if (!document.hidden && !(el && el.tagName === "IFRAME")) blurAt = Date.now();
  }, 0));
  window.addEventListener("focus", () => {
    if (blurAt && !document.hidden && Date.now() - blurAt >= 3000) awayFor(blurAt, "left window");
    blurAt = 0;
  });

  // ---------- wiring ----------
  $("prev").onclick = prev;
  $("next").onclick = next;
  $("phone-toggle").onclick = () => $("phone-col").classList.toggle("open");
  window.addEventListener("hashchange", () => { const s = slideFromHash(); if (s !== null && s !== progress.at) go(s); });

  const start = slideFromHash();
  progress.at = Math.max(0, Math.min(reach(), start !== null ? start : progress.at));
  setHash(progress.at);
  render();

  // score tracking starts after the first render, so the deck shows up even if Google is slow or blocked
  let wasGated = gated(), lastStatus = Score.status;
  Score.init({
    getSnapshot: snapshot,
    onUser: switchOwner,
    onSaved: fromServer,
    onChange: () => {
      renderAccount();
      // redraw when the sign-in gate opens or closes, the intro's sign-in panel changes,
      // or the results are waiting on the leaderboard
      const redraw = gated() !== wasGated
        || (progress.at === 0 && Score.status !== lastStatus && ["signin", "unavailable", "wrong-domain"].includes(Score.status))
        || (progress.at > N && finished() && !board && Score.status !== lastStatus);
      wasGated = gated(); lastStatus = Score.status;
      if (redraw) render();
    },
  });
})();
