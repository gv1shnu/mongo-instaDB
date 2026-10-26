(function () {
  const E = window.InstaEngine, STORY = window.STORY, SEED = window.SEED, assemble = window.assemble, canonical = window.canonical, stepNow = window.stepNow;
  const steps = STORY.steps;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const blanksOf = (st) => (st.code || []).filter((p) => typeof p !== "string").map((p) => p.b);
  const norm = (s) => String(s).trim().replace(/^(["'`])(.*)\1$/, "$2").trim();
  const isWrite = (st) => st.mode === "write";
  const ordered = (st) => canonical(st).includes(".sort(");

  // database state before each step, following the canonical story
  const states = [SEED];
  steps.forEach((st, i) => {
    const r = E.run(canonical(st), states[i], { now: stepNow(st) });
    states.push(r.ok ? r.state : states[i]);
  });

  const KEY = "instadb-story-v3";
  let progress = { step: 0, revealed: [] };
  try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved && Number.isInteger(saved.step) && saved.step <= steps.length) progress = saved; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) {} };

  // ---------- rendering ----------
  function blankCodeHTML(st, mode) {
    let bi = 0;
    return st.code.map((p) => {
      if (typeof p === "string") return esc(p);
      const i = bi++;
      if (mode === "done") return `<span class="filled">${esc(p.b)}</span>`;
      return `<input class="blank" data-i="${i}" size="5" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="blank ${i + 1}">`;
    }).join("");
  }
  const doneCodeHTML = (st) => (isWrite(st) ? `<span class="filled">${esc(st.answer)}</span>` : blankCodeHTML(st, "done"));
  const chapterOf = (st) => STORY.chapters.find((c) => c.id === st.chapter);
  const modeTag = (st) => (isWrite(st) ? '<span class="tag mode-write">✍️ write the query</span>' : '<span class="tag mode-blank">🧩 fill the operator</span>');

  function renderIntro() { $("intro").innerHTML = `<h2>${esc(STORY.title)}</h2><p>${STORY.intro}</p>`; }

  function renderTimeline() {
    const out = [];
    let lastCh = null;
    for (let i = 0; i < Math.min(progress.step, steps.length); i++) {
      const st = steps[i];
      if (st.chapter !== lastCh) { out.push(`<h3 class="chapter">${esc(chapterOf(st).title)}</h3>`); lastCh = st.chapter; }
      const rev = progress.revealed.includes(i);
      out.push(`<article class="done-step">
        <div class="step-meta"><span class="num">${i + 1}</span><span class="tag">${esc(st.op)}</span>${rev ? '<span class="rev">answer shown</span>' : ""}</div>
        <div class="before">${st.before}</div>
        <div class="code small-code">${doneCodeHTML(st)}</div>
        <p class="after">${st.after}</p>
        ${st.trapNote ? `<p class="trap">${st.trapNote}</p>` : ""}
      </article>`);
    }
    $("timeline").innerHTML = out.join("");
    return lastCh;
  }

  function renderCurrent(lastCh) {
    const i = progress.step;
    const cur = $("current");
    if (i >= steps.length) {
      const end = states[steps.length];
      cur.innerHTML = `<div class="card finale">
        <h2>That's the day on instaDB 🌙</h2>
        <p>You created a user and her posts, read profiles, filtered with comparison, logical, regex and array operators, paged through a sorted feed, changed fields and arrays with update operators, replaced a whole document and cleaned up. instaDB ends the day with <b>${end.users.length} users</b> and <b>${end.posts.length} posts</b>.</p>
        <p class="muted">${progress.revealed.length ? `You used "Show answer" on ${progress.revealed.length} step${progress.revealed.length > 1 ? "s" : ""}. Restart the day and try those again without it.` : "You solved every step without revealing an answer."}</p>
        <button class="btn primary" id="again">Restart the day</button>
      </div>`;
      $("again").onclick = restart;
      phone({ finale: true, before: end, spec: { time: "0:05" } });
      return;
    }
    const st = steps[i];
    const chHead = st.chapter !== lastCh ? `<h3 class="chapter">${esc(chapterOf(st).title)}</h3>` : "";
    const editor = isWrite(st)
      ? `<textarea class="editor" id="editor" rows="3" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Your query" placeholder="Type the whole query, e.g. db.collection.method( ... )"></textarea>`
      : `<div class="code" id="code">${blankCodeHTML(st, "edit")}</div>`;
    cur.innerHTML = `${chHead}
      <div class="card now">
        <div class="step-meta"><span class="num">${i + 1}</span><span class="tag">Step ${i + 1} of ${steps.length}</span>${modeTag(st)}${st.trap ? '<span class="tag warn">⚠️ predict first</span>' : ""}</div>
        <div class="before big">${st.before}</div>
        ${editor}
        <div class="actions">
          <button class="btn primary" id="run">Run ▶</button>
          <button class="btn" id="hint">Hint</button>
          <button class="btn" id="reveal">Show answer</button>
        </div>
        <p class="kbd-tip">${isWrite(st) ? "Press <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> to run. Watch the phone." : "Fill the operator, then press <kbd>Enter</kbd> or Run. Watch the phone."}</p>
        <div class="feedback" id="feedback" hidden></div>
      </div>`;
    if (isWrite(st)) {
      const ed = $("editor");
      const grow = () => { ed.style.height = "auto"; ed.style.height = ed.scrollHeight + 2 + "px"; };
      ed.addEventListener("input", () => { grow(); ed.classList.remove("bad", "ok"); });
      ed.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); check(); }
        else if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); ed.setRangeText("  ", ed.selectionStart, ed.selectionEnd, "end"); }
      });
      if (document.activeElement === document.body) ed.focus({ preventScroll: true });
    } else {
      const inputs = [...cur.querySelectorAll(".blank")];
      inputs.forEach((inp) => {
        inp.addEventListener("input", () => { inp.size = Math.max(5, inp.value.length + 1); inp.classList.remove("bad", "ok"); });
        inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); check(); } });
      });
      if (inputs[0] && document.activeElement === document.body) inputs[0].focus({ preventScroll: true });
    }
    $("run").onclick = check;
    $("hint").onclick = () => feedback("info", "Hint", esc(st.hint));
    $("reveal").onclick = reveal;
    phone({ idle: true, before: states[i], spec: st.screen });
  }

  function feedback(kind, head, body, extra) {
    const f = $("feedback");
    f.hidden = false;
    f.className = "feedback " + kind;
    f.innerHTML = `<div class="head">${head}</div><div>${body}</div>${extra || ""}`;
  }

  function renderProgress() {
    const n = Math.min(progress.step, steps.length);
    $("bar-fill").style.width = (n / steps.length) * 100 + "%";
    $("progress-label").textContent = n >= steps.length ? "Day complete" : `Step ${n + 1} of ${steps.length} · ${chapterOf(steps[n]).title.split(":")[0]}`;
  }

  function renderData() {
    const st = states[Math.min(progress.step, steps.length)];
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

  function render() {
    renderIntro();
    const lastCh = renderTimeline();
    renderCurrent(lastCh);
    renderProgress();
    renderData();
  }

  // ---------- phone + terminal ----------
  const phone = (ctx) => { if (window.Phone) window.Phone.render($("phone"), ctx); };

  function terminal(code, res, before) {
    const out = $("output");
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
    out.innerHTML = `instaDB&gt; ${esc(code)}\n${body}`;
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
      return ordered(st) ? "Right number of documents, but not the right ones in the right order. Check the sort direction and how many you skip." : "Right number of documents, but not the right ones. Check your filter.";
    }
    if (gk === "doc") return "You got a single document, but not the one this step asks for. Check your filter.";
    if (gk === "insertOne" || gk === "insertMany") return "The inserted document doesn't match the form. Check every field name, spelling, and value type: numbers without quotes, true/false without quotes, text in quotes.";
    if (gk === "update") {
      if (g.matchedCount !== w.matchedCount) return `Your update matched ${g.matchedCount} document${g.matchedCount === 1 ? "" : "s"}; this step should match ${w.matchedCount}. Check the method (updateOne vs updateMany) and the filter.`;
      return "Right documents, but they changed differently from what the story asks. Check each update operator and its value. The phone and the terminal show what your update did.";
    }
    if (gk === "delete") {
      if (g.deletedCount !== w.deletedCount) return `You deleted ${g.deletedCount} post${g.deletedCount === 1 ? "" : "s"}; this step should delete ${w.deletedCount}. Check the method (deleteOne vs deleteMany) and the filter.`;
      return "Right number deleted, but not the right posts. Check your filter.";
    }
    return "Not the result this step needs.";
  }

  // ---------- actions ----------
  function check() {
    const i = progress.step, st = steps[i];
    let code, right;
    if (isWrite(st)) {
      code = $("editor").value;
      if (!code.trim()) { feedback("info", "Type your query first", "Write the whole command, starting with <code>db.</code>"); return; }
    } else {
      const inputs = [...document.querySelectorAll("#current .blank")];
      const vals = inputs.map((x) => x.value);
      if (vals.some((v) => !v.trim())) { feedback("info", "Fill every blank first", "Each dashed box needs an operator before the query can run."); return; }
      code = assemble(st.code, vals);
      const want = blanksOf(st);
      right = vals.map((v, k) => norm(v) === norm(want[k]));
      inputs.forEach((inp, k) => { inp.classList.toggle("ok", right[k]); inp.classList.toggle("bad", !right[k]); });
    }
    const res = E.run(code, states[i], { now: stepNow(st) });
    terminal(code.trim(), res, states[i]);
    phone({ res, before: states[i], after: res.ok ? res.state : null, spec: st.screen });

    if (isWrite(st)) {
      const want = E.run(canonical(st), states[i], { now: stepNow(st) });
      const ok = res.ok && E.fingerprint(res, ordered(st)) === E.fingerprint(want, ordered(st));
      $("editor").classList.toggle("ok", ok); $("editor").classList.toggle("bad", !ok);
      if (ok) return advance();
      if (!res.ok) return feedback("bad", "MongoDB rejected the query", esc(res.error) + "<br><span class='muted'>The error is also in the terminal below.</span>");
      return feedback("bad", "It ran, but it's not what the story needs", explainDiff(st, res, want));
    }
    if (right.every(Boolean) && res.ok) return advance();
    const want = blanksOf(st);
    const vals = [...document.querySelectorAll("#current .blank")].map((x) => x.value);
    const wrongIdx = right.map((r, k) => (r ? -1 : k)).filter((k) => k >= 0);
    let tip = res.ok ? "The query ran, but it isn't the one this step needs. Compare the phone and the terminal with what the story asks for." : "MongoDB rejected the query. Read the error in the terminal below.";
    if (wrongIdx.some((k) => norm(want[k]).startsWith("$") && !norm(vals[k]).startsWith("$"))) tip = "Operators always start with <code>$</code>.";
    feedback("bad", wrongIdx.length === 1 ? "Not quite: one blank is off" : `Not quite: ${wrongIdx.length} blanks are off`, tip);
  }

  function reveal() {
    const i = progress.step, st = steps[i];
    if (isWrite(st)) {
      const ed = $("editor"); ed.value = st.answer; ed.classList.add("revealed"); ed.dispatchEvent(new Event("input"));
    } else {
      const want = blanksOf(st);
      document.querySelectorAll("#current .blank").forEach((inp, k) => { inp.value = want[k]; inp.size = Math.max(5, want[k].length + 1); inp.classList.add("revealed"); });
    }
    if (!progress.revealed.includes(i)) progress.revealed.push(i);
    save();
    feedback("info", "Here's the answer", "Read it, press <b>Run ▶</b> to see what it does, then continue the story.");
  }

  function advance() {
    const i = progress.step, st = steps[i];
    feedback("ok", "Correct ✓", st.after, (st.trapNote ? `<p class="trap">${st.trapNote}</p>` : "") +
      `<div class="actions"><button class="btn primary" id="continue">${i + 1 < steps.length ? "Continue the story →" : "Finish the day →"}</button></div>`);
    const go = () => { progress.step = i + 1; save(); render(); const now = document.querySelector("#current .chapter, #current .card"); if (now) now.scrollIntoView({ behavior: "smooth", block: "start" }); };
    $("continue").onclick = go;
    $("continue").focus({ preventScroll: true });
    document.querySelectorAll("#current .blank, #current .editor").forEach((x) => (x.disabled = true));
    $("run").disabled = true; $("reveal").disabled = true;
  }

  function restart() {
    if (progress.step > 0 && !confirm("Restart the day from step 1? Your progress on this device will be cleared.")) return;
    progress = { step: 0, revealed: [] };
    save();
    $("output").innerHTML = 'instaDB&gt; <span class="muted">// run a query to see the result here</span>';
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  $("restart").onclick = restart;

  render();
})();
