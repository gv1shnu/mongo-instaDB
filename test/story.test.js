require("../js/data.js"); require("../js/engine.js"); require("../js/story.js"); require("../js/phone.js");
const { run, fingerprint, show } = globalThis.InstaEngine;
const STORY = globalThis.STORY, canon = globalThis.canonical, stepNow = globalThis.stepNow;
let state = globalThis.SEED, fail = 0;
const states = [state];
const summary = (v) => Array.isArray(v) ? v.length + " docs: " + v.map((d) => d.caption || d.username).join(" | ")
  : v && v.caption ? "doc: " + v.caption : v && v.username ? "doc: " + v.username : JSON.stringify(v);

STORY.steps.forEach((st, i) => {
  const r = run(canon(st), state, { now: stepNow(st) });
  if (!r.ok) { fail++; console.log("ERR step", i + 1, st.op, r.error); states.push(state); return; }
  console.log(`${String(i + 1).padStart(2)} ${st.screen.time.padStart(5)} ${st.mode.padEnd(5)} ${st.op.padEnd(30)} ${summary(r.value)}`);
  state = r.state; states.push(state);
});
const user = (n) => state.users.find((u) => u.username === n);
const post = (c) => state.posts.find((p) => p.caption === c) || {};
console.log("end: users", state.users.length, "posts", state.posts.length);
["neha_eats", "meera.dance", "ananya.reads", "ishaan.films"].forEach((n) => console.log("   ", show(user(n)).replace(/\n\s*/g, " ")));
["First dance cover!", "Spiti valley in 10 frames", "Exam week be like"].forEach((c) => console.log("   ", c, "|", post(c).likes, JSON.stringify(post(c).hashtags)));

// Write steps: equivalent answers must pass, wrong ones must fail.
const at = (op) => { const i = STORY.steps.findIndex((s) => s.op === op); if (i < 0) throw new Error("no step " + op); return i; };
const same = (op, code, ordered) => {
  const i = at(op), now = stepNow(STORY.steps[i]);
  const a = run(canon(STORY.steps[i]), states[i], { now }), b = run(code, states[i], { now });
  return b.ok && fingerprint(a, ordered) === fingerprint(b, ordered);
};
const expect = (label, got, want) => { const ok = got === want; if (!ok) fail++; console.log((ok ? "ok  " : "FAIL") + "  " + label); };
expect("insertOne: fields in another order pass", same("insertOne()", 'db.users.insertOne({ interests: ["dance"], accountType: "creator", verified: false, followers: 0, city: "Pune", age: 20, name: "Meera Nair", username: "meera.dance" })'), true);
expect("insertOne: age as text fails", same("insertOne()", 'db.users.insertOne({ username: "meera.dance", name: "Meera Nair", age: "20", city: "Pune", followers: 0, verified: false, accountType: "creator", interests: ["dance"] })'), false);
expect("insertMany: two insertOne-style args fail", run('db.posts.insertOne({ caption: "a" }, { caption: "b" })', states[at("insertMany()")]).ok, false);
expect("find with $eq passes", same("find()", 'db.posts.find({ username: { $eq: "arjun.clicks" } })'), true);
expect("$all: $in gives a different list", same("$all", 'db.users.find({ interests: { $in: ["travel", "photography"] } })'), false);
expect("$exists: plain $ne gives a different list", same("$exists", 'db.users.find({ accountType: { $ne: "creator" } })'), false);
expect("$min: $set to 8000 gives the same document", same("$min", 'db.posts.updateOne({ caption: "Exam week be like" }, { $set: { likes: 8000 } })'), true);
expect("updateMany: updateOne fails", same("updateMany()", 'db.posts.updateOne({ type: "reel" }, { $inc: { likes: 100 } })'), false);
expect("updateMany: $set to 100 fails", same("updateMany()", 'db.posts.updateMany({ type: "reel" }, { $set: { likes: 100 } })'), false);
expect("neha: updateOne with $set passes", same("updateOne()", 'db.users.updateOne({ username: "neha_eats" }, { $set: { verified: true } })'), true);
expect("neha: $set without the operator fails", run('db.users.updateOne({ username: "neha_eats" }, { verified: true })', states[at("updateOne()")]).ok, false);
expect("neha: updating everyone fails", same("updateOne()", 'db.users.updateMany({}, { $set: { verified: true } })'), false);
expect("upsert creates ishaan.films", run(canon(STORY.steps[at("upsert")]), states[at("upsert")]).state.users.some((u) => u.username === "ishaan.films"), true);
expect("deleteOne: deleteMany fails", same("deleteOne()", 'db.posts.deleteMany({ username: "riya_codes" })'), false);
expect("deleteMany: $lte fails (Meera's reel at 100)", same("deleteMany()", "db.posts.deleteMany({ likes: { $lte: 100 } })"), false);
// Every option runs. A wrong option must change something the student can see
// (a different result, or an error), unless it carries a note explaining why it's still wrong.
const writes = STORY.steps.filter((s) => s.mode === "write").length;
expect(`5 or 6 write steps (${writes})`, writes >= 5 && writes <= 6, true);
STORY.steps.forEach((st, i) => {
  const now = stepNow(st), want = run(canon(st), states[i], { now });
  // the phone preview must draw whatever an option does to the data
  const draw = (label, r) => {
    try { globalThis.Phone.screenFor({ res: r, before: states[i], after: r.ok ? r.state : null, spec: st.screen }); }
    catch (e) { fail++; console.log(`FAIL  step ${i + 1} ${label}: phone crashed: ${e.message}`); }
  };
  draw("answer", want);
  const check = (label, code, note) => {
    const r = run(code, states[i], { now });
    draw(label, r);
    const same = r.ok && fingerprint(r, true) === fingerprint(want, true);
    const ok = !same || !!note;
    if (!ok) fail++;
    if (!ok || process.argv.includes("-v")) console.log((ok ? "ok  " : "FAIL") + `  step ${i + 1} ${label}: ${r.ok ? (same ? "same result" : "different result") : r.error}${note ? " (has note)" : ""}`);
  };
  if (st.mode === "choice" || st.mode === "bug") {
    if (st.options.filter((o) => o.ok).length !== 1) { fail++; console.log(`FAIL  step ${i + 1} needs exactly one right option`); }
    st.options.forEach((o, k) => { if (!o.ok) { check("option " + "ABCD"[k], o.code); if (!o.why) { fail++; console.log(`FAIL  step ${i + 1} option ${"ABCD"[k]} has no why`); } } });
  }
  if (st.mode === "bug") { const r = run(st.broken, states[i], { now }); if (r.ok && fingerprint(r, true) === fingerprint(want, true)) { fail++; console.log(`FAIL  step ${i + 1} broken query works`); } }
  if (st.mode === "predict") {
    if (st.options.filter((o) => o.ok).length !== 1) { fail++; console.log(`FAIL  step ${i + 1} needs exactly one right option`); }
    st.options.forEach((o, k) => { if (!o.ok && !o.why) { fail++; console.log(`FAIL  step ${i + 1} option ${"ABCD"[k]} has no why`); } });
  }
  if (st.mode === "pick") {
    const blanks = st.code.filter((p) => typeof p !== "string"), answers = blanks.map((b) => b.b);
    blanks.forEach((b, k) => {
      if (globalThis.chipsFor(st, b).length !== b.opts.length + 1 || b.opts.includes(b.b)) { fail++; console.log(`FAIL  step ${i + 1} blank ${k + 1} chips`); }
      b.opts.forEach((d) => check(`blank ${k + 1} = ${d}`, globalThis.assemble(st.code, answers.map((a, j) => (j === k ? d : a))), b.why[d]));
    });
  }
});
// Every question stands on its own: an option may not bring in a fact the question doesn't give.
// Any username in an option must appear in the question; so must any number or quoted value in a
// prediction's text.
const people = new Set(states[states.length - 1].users.concat(globalThis.SEED.users).map((u) => u.username));
STORY.steps.forEach((st, i) => {
  const stem = st.before.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"') + " " + (st.code ? globalThis.assemble(st.code.map((p) => (typeof p === "string" ? p : { b: "" }))) : "") + " " + (st.broken || "") + " " + (st.query || "");
  (st.options || []).forEach((o, k) => {
    const text = o.text || o.code;
    const missing = [...people].filter((u) => text.includes(u) && !stem.includes(u));
    if (o.text) {
      (o.text.match(/\d+(?:,\d{3})*/g) || []).forEach((n) => { if (!stem.includes(n)) missing.push(n); });
      (o.text.match(/"[^"]+"/g) || []).forEach((q) => { if (!stem.includes(q)) missing.push(q); });
    }
    if (missing.length) { fail++; console.log(`FAIL  step ${i + 1} option ${"ABCD"[k]} brings in ${missing.join(", ")}, which the question doesn't give`); }
  });
});
console.log(fail ? fail + " PROBLEMS" : "STORY OK");
process.exit(fail ? 1 : 0);
