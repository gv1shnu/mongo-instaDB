require("../js/data.js"); require("../js/engine.js"); require("../js/story.js");
const { run, fingerprint } = globalThis.InstaEngine;
const STORY = globalThis.STORY, canon = globalThis.canonical;
let state = globalThis.SEED, fail = 0;
const states = [state];
const summary = (v) => Array.isArray(v) ? v.length + " docs: " + v.map((d) => d.caption || d.username).join(" | ")
  : v && v.caption ? "doc: " + v.caption : v && v.username ? "doc: " + v.username : JSON.stringify(v);

STORY.steps.forEach((st, i) => {
  const r = run(canon(st), state);
  if (!r.ok) { fail++; console.log("ERR step", i + 1, r.error); return; }
  console.log(`${String(i + 1).padStart(2)} ${st.mode.padEnd(5)} ${st.op.padEnd(26)} ${summary(r.value)}`);
  state = r.state; states.push(state);
});
const neha = state.users.find((u) => u.username === "neha_eats");
console.log("end: users", state.users.length, "posts", state.posts.length, "| neha", JSON.stringify(neha.interests), neha.verified,
  "| meera reel likes", (state.posts.find((p) => p.caption === "First dance cover!") || {}).likes);

// Write steps: equivalent answers must pass, wrong ones must fail.
const same = (i, code, ordered) => { const a = run(canon(STORY.steps[i]), states[i]), b = run(code, states[i]); return b.ok && fingerprint(a, ordered) === fingerprint(b, ordered); };
const expect = (label, got, want) => { const ok = got === want; if (!ok) fail++; console.log((ok ? "ok  " : "FAIL") + "  " + label); };
expect("insertOne: fields in another order pass", same(0, 'db.users.insertOne({ interests: ["dance"], accountType: "creator", verified: false, followers: 0, city: "Pune", age: 20, name: "Meera Nair", username: "meera.dance" })'), true);
expect("insertOne: age as text fails", same(0, 'db.users.insertOne({ username: "meera.dance", name: "Meera Nair", age: "20", city: "Pune", followers: 0, verified: false, accountType: "creator", interests: ["dance"] })'), false);
expect("insertMany: two insertOne-style args fail", run('db.posts.insertOne({ caption: "a" }, { caption: "b" })', states[1]).ok, false);
expect("find with $eq passes", same(2, 'db.posts.find({ username: { $eq: "arjun.clicks" } })'), true);
expect("findOne step: find() fails", same(3, 'db.users.find({ username: "meera.dance" })'), false);
expect("page 2: chained in another order passes", same(12, "db.posts.find().limit(4).skip(4).sort({ likes: -1 })", true), true);
expect("page 2: missing sort fails", same(12, "db.posts.find().skip(4).limit(4)", true), false);
expect("page 2: skip(8) fails", same(12, "db.posts.find().sort({ likes: -1 }).skip(8).limit(4)", true), false);
expect("updateMany: updateOne fails", same(13, 'db.posts.updateOne({ type: "reel" }, { $inc: { likes: 100 }, $push: { hashtags: "#reelsweek" } })'), false);
expect("updateMany: operators in other order pass", same(13, 'db.posts.updateMany({ type: "reel" }, { $push: { hashtags: "#reelsweek" }, $inc: { likes: 100 } })'), true);
expect("neha: $push without $each fails", same(14, 'db.users.updateOne({ username: "neha_eats" }, { $set: { verified: true }, $push: { interests: ["baking", "cafes"] } })'), false);
expect("deleteOne: deleteMany fails", same(15, 'db.posts.deleteMany({ username: "riya_codes" })'), false);
expect("deleteMany: $lte fails (Meera's reel at 100)", same(16, "db.posts.deleteMany({ likes: { $lte: 100 } })"), false);
console.log(fail ? fail + " PROBLEMS" : "STORY OK");
process.exit(fail ? 1 : 0);
