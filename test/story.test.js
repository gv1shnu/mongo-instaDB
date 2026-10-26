require("../js/data.js"); require("../js/engine.js"); require("../js/story.js");
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
["neha_eats", "riya_codes", "arjun.clicks", "meera.dance", "ananya.reads", "rohan_travels"].forEach((n) => console.log("   ", show(user(n)).replace(/\n\s*/g, " ")));
["Late night debugging sessions", "When the code works on first try", "Spiti valley in 10 frames", "Exam week be like"].forEach((c) => console.log("   ", c, "|", post(c).likes, JSON.stringify(post(c).hashtags)));

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
expect("findOne step: find() fails", same("findOne()", 'db.users.find({ username: "meera.dance" })'), false);
expect("regex: without $options misses Meera", same("$regex + $options", "db.posts.find({ caption: { $regex: /first/ } })"), false);
expect("regex: /first/i shorthand passes", same("$regex + $options", "db.posts.find({ caption: /first/i })"), true);
expect("$all: $in gives a different list", same("$all", 'db.users.find({ interests: { $in: ["travel", "photography"] } })'), false);
expect("$exists: plain $ne gives a different list", same("$exists", 'db.users.find({ accountType: { $ne: "creator" } })'), false);
expect("page 2: chained in another order passes", same("sort() + skip() + limit()", "db.posts.find().limit(4).skip(4).sort({ likes: -1 })", true), true);
expect("page 2: missing sort fails", same("sort() + skip() + limit()", "db.posts.find().skip(4).limit(4)", true), false);
expect("page 2: skip(8) fails", same("sort() + skip() + limit()", "db.posts.find().sort({ likes: -1 }).skip(8).limit(4)", true), false);
expect("updateMany: updateOne fails", same("updateMany()", 'db.posts.updateOne({ type: "reel" }, { $inc: { likes: 100 }, $push: { hashtags: "#reelsweek" } })'), false);
expect("updateMany: operators in other order pass", same("updateMany()", 'db.posts.updateMany({ type: "reel" }, { $push: { hashtags: "#reelsweek" }, $inc: { likes: 100 } })'), true);
expect("$min: $set to 8000 gives the same document", same("$min", 'db.posts.updateOne({ caption: "Exam week be like" }, { $set: { likes: 8000 } })'), true);
expect("$currentDate: same answer twice", same("$currentDate + $type", canon(STORY.steps[at("$currentDate + $type")])), true);
expect("$currentDate: a Date instead of a timestamp fails", same("$currentDate + $type", 'db.users.updateOne({ username: "meera.dance" }, { $currentDate: { lastActive: true, lastSync: true } })'), false);
expect("neha: $push without $each fails", same("updateOne()", 'db.users.updateOne({ username: "neha_eats" }, { $set: { verified: true }, $push: { interests: ["baking", "cafes"] } })'), false);
expect("$addToSet: $push would duplicate music", same("$addToSet", 'db.users.updateOne({ username: "riya_codes" }, { $push: { interests: "music" } })'), false);
expect("$pop: -1 removes the wrong end", same("$pop", 'db.users.updateOne({ username: "arjun.clicks" }, { $pop: { interests: -1 } })'), false);
expect("$push: without $slice keeps 4", same("$push + $each, $sort, $slice", 'db.users.updateOne({ username: "meera.dance" }, { $push: { interests: { $each: ["kathak", "bollywood", "hip-hop"], $sort: 1 } } })'), false);
expect("positional: hashtags.0 gives the same result", same("positional $", 'db.posts.updateOne({ caption: "Late night debugging sessions" }, { $set: { "hashtags.0": "#100DaysOfCode" } })'), true);
expect("deleteOne: deleteMany fails", same("deleteOne()", 'db.posts.deleteMany({ username: "riya_codes" })'), false);
expect("replaceOne: fields in another order pass", same("replaceOne()", 'db.users.replaceOne({ username: "rohan_travels" }, { accountType: "business", verified: false, followers: 7800, city: "Kolkata", fullName: "Rohan Das Travels", username: "rohan_travels" })'), true);
expect("replaceOne: updateOne + $set keeps interests, fails", same("replaceOne()", 'db.users.updateOne({ username: "rohan_travels" }, { $set: { fullName: "Rohan Das Travels", accountType: "business" } })'), false);
expect("deleteMany: $lte fails (Meera's reel at 100)", same("deleteMany()", "db.posts.deleteMany({ likes: { $lte: 100 } })"), false);
// Every option runs. A wrong option must change something the student can see
// (a different result, or an error), unless it carries a note explaining why it's still wrong.
const writes = STORY.steps.filter((s) => s.mode === "write").length;
expect(`5 or 6 write steps (${writes})`, writes >= 5 && writes <= 6, true);
STORY.steps.forEach((st, i) => {
  const now = stepNow(st), want = run(canon(st), states[i], { now });
  const check = (label, code, note) => {
    const r = run(code, states[i], { now });
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
console.log(fail ? fail + " PROBLEMS" : "STORY OK");
process.exit(fail ? 1 : 0);
