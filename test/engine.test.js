require("../js/data.js"); require("../js/engine.js");
const { run } = globalThis.InstaEngine, S = globalThis.SEED;
let fail = 0;
const t = (code, exp, fn = (v) => Array.isArray(v) ? v.length : v) => {
  const r = run(code, S); const got = r.ok ? fn(r.value) : r.error;
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) fail++;
  console.log((ok ? "ok  " : "FAIL") + "  " + code + "  =>  " + JSON.stringify(got) + (ok ? "" : "  expected " + JSON.stringify(exp)));
};
t('db.posts.find({ username: "dev_memes" })', 2);
t('db.posts.findOne({ username: "dev_memes" }).caption', "When the code works on first try", (v) => v);
t('db.posts.find({ likes: { $gt: 5000 } })', 3);
t('db.posts.find({ likes: { $gte: 1000, $lte: 10000 } })', 5);
t('db.posts.find({ type: { $in: ["reel", "carousel"] } })', 6);
t('db.users.find({ accountType: { $ne: "creator" } })', 5);
t('db.users.find({ $and: [ { age: { $gte: 18 } }, { accountType: "creator" } ] })', 3);
t('db.users.find({ age: { $gte: 18 }, accountType: "creator" })', 3);
t('db.posts.find({ $or: [ { likes: { $lt: 100 } }, { comments: { $gt: 200 } } ] })', 6);
t('db.users.find({ age: { $not: { $gt: 25 } } })', 6);
t('db.users.find({ age: { $lte: 25 } })', 5);
t('db.posts.find().sort({ likes: 1 }).limit(3)', ["Sunrise at Tiger Hill","Homemade pasta attempt","October reading list"], (v) => v.map(d => d.caption));
t('db.posts.find().sort({ likes: -1 }).skip(4).limit(4)', ["Golden hour at Marine Drive","Shipped my first full-stack app!","Best dosa in Bengaluru?","Late night debugging sessions"], (v) => v.map(d => d.caption));
t('db.posts.find().limit(4).skip(4).sort({ likes: -1 })', ["Golden hour at Marine Drive","Shipped my first full-stack app!","Best dosa in Bengaluru?","Late night debugging sessions"], (v) => v.map(d => d.caption));
t('db.posts.updateMany({ type: "reel" }, { $inc: { likes: 100 } })', {acknowledged:true,insertedId:null,matchedCount:4,modifiedCount:4,upsertedCount:0}, (v)=>v);
t('db.users.updateOne({ username: "neha_eats" }, { $set: { bio: "x" } })', 1, (v)=>v.modifiedCount);
t('db.users.updateMany({ city: "Delhi" }, { $set: { city: "Delhi" } })', [2,0], (v)=>[v.matchedCount,v.modifiedCount]);
// $push nesting
{ const r = run('db.users.updateOne({ username: "riya_codes" }, { $push: { interests: ["dance","music"] } })', S);
  const riya = r.state.users[0].interests; const ok = JSON.stringify(riya) === JSON.stringify(["coding","music",["dance","music"]]); if(!ok) fail++; console.log((ok?"ok  ":"FAIL")+"  push nests ->", JSON.stringify(riya)); }
{ const r = run('db.users.updateOne({ username: "riya_codes" }, { $push: { interests: { $each: ["dance","music"] } } })', S);
  const riya = r.state.users[0].interests; const ok = JSON.stringify(riya) === JSON.stringify(["coding","music","dance","music"]); if(!ok) fail++; console.log((ok?"ok  ":"FAIL")+"  push $each ->", JSON.stringify(riya)); }
t('db.posts.deleteOne({ username: "rohan_travels" })', 1, v=>v.deletedCount);
t('db.posts.deleteMany({ likes: { $lt: 100 } })', 3, v=>v.deletedCount);
t('db.users.find({ city: { $nin: ["Delhi", "Mumbai"] } })', 5);
t('db.users.find({ $nor: [ { verified: true }, { accountType: "creator" } ] })', 4);
t('db.users.find({ interests: "art" })', 2);
t('db.users.find({ interests: { $in: ["art","books"] } })', 2);
t('db.posts.find({ createdAt: { $lt: new Date("2026-09-01") } })', 2);
t('db.posts.find({ createdAt: { $lt: ISODate("2026-09-01") } })', 2);
t('db.users.find({ followers: { $not: { $gt: 5000 } } })', 3);
// errors
t('db.posts.find({ likes: { $gtt: 5 } })', "MongoServerError: unknown operator: $gtt");
t('db.posts.find({ likes: { gt: 5 } })', 0);
t('db.posts.findone({})', "TypeError: db.posts.findone is not a function. Check the method name (spelling and capitals matter).");
t('db.posts.find({ $gt: 5 })', "MongoServerError: $gt goes inside a field, e.g. { likes: { $gt: ... } }");
t('db.post.find({})', "MongoServerError: there is no 'post' collection in instaDB (try users or posts)");
t('db.posts.updateOne({}, { likes: 5 })', "MongoServerError: Update document requires atomic operators (like $set, $inc, $push). To swap the whole document, use replaceOne.");
t('db.posts.find({ likes: { $gt: 5000 } );', "SyntaxError: the query isn't valid JavaScript. Check brackets, commas and quotes.");
t('db.posts.find({ likes: { $in: 5 } })', "MongoServerError: $in needs an array");
t('db.users.find({ age: { $not: 25 } })', "MongoServerError: $not needs an operator expression, e.g. { $not: { $gt: 25 } }");
// Lecture 3: query operators
t('db.users.find({ age: { $exists: false } })', ["rohan_travels"], (v) => v.map((d) => d.username));
t('db.users.find({ accountType: { $exists: true } })', 6);
t('db.users.find({ interests: { $all: ["travel", "photography"] } })', 2);
t('db.users.find({ interests: { $all: [] } })', 0);
t('db.posts.find({ hashtags: { $elemMatch: { $in: ["#food", "#fitness"] } } })', 3);
t('db.posts.find({ likes: { $elemMatch: { $gt: 5 } } })', 0);
t('db.users.find({ username: { $regex: /^r/ } })', 2);
t('db.users.find({ username: { $regex: "^R" } })', 0);
t('db.users.find({ username: { $regex: "^R", $options: "i" } })', 2);
t('db.users.find({ username: /^R/i })', 2);
t('db.users.find({ username: { $not: /^r/ } })', 6);
t('db.posts.find({ hashtags: /^#b/ })', 2);
t('db.users.find({ username: { $options: "i" } })', "MongoServerError: $options needs a $regex next to it");
t('db.users.find({ username: { $regex: /a/, $options: "z" } })', "MongoServerError: invalid flag in regex options: z (use i, m, s or x)");
// Lecture 3: update operators
const doc = (code, name, fn) => { const r = run(code, S, { now: new Date("2026-10-26T10:00:00Z") }); return r.ok ? fn(r.state.users.find((u) => u.username === name) || r.state.posts.find((p) => p.caption === name)) : r.error; };
const td = (label, code, name, fn, exp) => { const got = doc(code, name, fn); const ok = JSON.stringify(got) === JSON.stringify(exp); if (!ok) fail++; console.log((ok ? "ok  " : "FAIL") + "  " + label + "  =>  " + JSON.stringify(got) + (ok ? "" : "  expected " + JSON.stringify(exp))); };
td("$unset removes the field", 'db.users.updateOne({ username: "neha_eats" }, { $unset: { age: "" } })', "neha_eats", (u) => "age" in u, false);
td("$rename moves the value", 'db.users.updateOne({ username: "neha_eats" }, { $rename: { name: "fullName" } })', "neha_eats", (u) => [u.name, u.fullName], [undefined, "Neha Kapoor"]);
td("$mul multiplies", 'db.users.updateOne({ username: "neha_eats" }, { $mul: { followers: 2 } })', "neha_eats", (u) => u.followers, 6200);
td("$mul on a missing field sets 0", 'db.users.updateOne({ username: "neha_eats" }, { $mul: { score: 3 } })', "neha_eats", (u) => u.score, 0);
td("$min lowers", 'db.users.updateOne({ username: "neha_eats" }, { $min: { followers: 100 } })', "neha_eats", (u) => u.followers, 100);
td("$min keeps a smaller value", 'db.users.updateOne({ username: "neha_eats" }, { $min: { followers: 9999 } })', "neha_eats", (u) => u.followers, 3100);
td("$max raises", 'db.users.updateOne({ username: "neha_eats" }, { $max: { followers: 9999 } })', "neha_eats", (u) => u.followers, 9999);
td("$max sets a missing field", 'db.users.updateOne({ username: "rohan_travels" }, { $max: { age: 30 } })', "rohan_travels", (u) => u.age, 30);
td("$currentDate true = Date", 'db.users.updateOne({ username: "neha_eats" }, { $currentDate: { seen: true } })', "neha_eats", (u) => u.seen.toISOString(), "2026-10-26T10:00:00.000Z");
td("$currentDate timestamp", 'db.users.updateOne({ username: "neha_eats" }, { $currentDate: { seen: { $type: "timestamp" } } })', "neha_eats", (u) => String(u.seen), "Timestamp({ t: 1793008800, i: 1 })");
td("$addToSet skips duplicates", 'db.users.updateOne({ username: "neha_eats" }, { $addToSet: { interests: "food" } })', "neha_eats", (u) => u.interests, ["food", "travel"]);
td("$addToSet with $each", 'db.users.updateOne({ username: "neha_eats" }, { $addToSet: { interests: { $each: ["food", "cafes"] } } })', "neha_eats", (u) => u.interests, ["food", "travel", "cafes"]);
td("$pop 1 removes the last", 'db.users.updateOne({ username: "neha_eats" }, { $pop: { interests: 1 } })', "neha_eats", (u) => u.interests, ["food"]);
td("$pop -1 removes the first", 'db.users.updateOne({ username: "neha_eats" }, { $pop: { interests: -1 } })', "neha_eats", (u) => u.interests, ["travel"]);
td("$pull removes a value", 'db.users.updateOne({ username: "neha_eats" }, { $pull: { interests: "food" } })', "neha_eats", (u) => u.interests, ["travel"]);
td("$pull with a condition", 'db.users.updateOne({ username: "neha_eats" }, { $pull: { interests: { $in: ["food", "travel"] } } })', "neha_eats", (u) => u.interests, []);
td("$pullAll removes a list", 'db.users.updateOne({ username: "rohan_travels" }, { $pullAll: { interests: ["travel", "photography"] } })', "rohan_travels", (u) => u.interests, []);
td("$push $each $sort $slice", 'db.users.updateOne({ username: "neha_eats" }, { $push: { interests: { $each: ["baking", "art"], $sort: 1, $slice: 3 } } })', "neha_eats", (u) => u.interests, ["art", "baking", "food"]);
td("$push negative $slice keeps the end", 'db.users.updateOne({ username: "neha_eats" }, { $push: { interests: { $each: ["x"], $slice: -2 } } })', "neha_eats", (u) => u.interests, ["travel", "x"]);
td("positional $ from the filter", 'db.users.updateOne({ username: "neha_eats", interests: "travel" }, { $set: { "interests.$": "trips" } })', "neha_eats", (u) => u.interests, ["food", "trips"]);
td("positional $ with a numeric path (lecture style)", 'db.users.updateOne({ username: "neha_eats", "interests.0": { $exists: true } }, { $set: { "interests.$": "eating" } })', "neha_eats", (u) => u.interests, ["eating", "travel"]);
t('db.users.updateOne({ username: "neha_eats" }, { $set: { "interests.$": "x" } })', "MongoServerError: The positional operator did not find the match needed from the query.");
t('db.users.updateOne({ username: "neha_eats" }, { $pop: { interests: 2 } })', "MongoServerError: $pop takes 1 (remove the last item) or -1 (remove the first item)");
t('db.users.updateOne({ username: "neha_eats" }, { $push: { interests: { $sort: 1 } } })', "MongoServerError: $push modifiers need $each with an array, e.g. { $each: [ ... ] }");
t('db.users.updateOne({ username: "neha_eats" }, { $rename: { age: 5 } })', "MongoServerError: $rename needs the new field name as text, e.g. { $rename: { age: \"newName\" } }");
// upsert
td("upsert creates the document from the filter and $set", 'db.users.updateOne({ username: "ishaan.films" }, { $set: { city: "Jaipur", followers: 0 } }, { upsert: true })', "ishaan.films", (u) => [Object.keys(u), u.city], [["_id", "username", "city", "followers"], "Jaipur"]);
t('db.users.updateOne({ username: "ishaan.films" }, { $set: { city: "Jaipur" } }, { upsert: true })', [0, 1], (v) => [v.matchedCount, v.upsertedCount]);
t('db.users.updateOne({ username: "neha_eats" }, { $set: { city: "Pune" } }, { upsert: true })', [1, 0], (v) => [v.matchedCount, v.upsertedCount]);
t('db.users.updateOne({ username: "ishaan.films" }, { $set: { city: "Jaipur" } })', [0, 0], (v) => [v.matchedCount, v.upsertedCount]);
t('db.users.updateOne({ username: "x" }, { $set: { a: 1 }, upsert: true })', "MongoServerError: Unknown modifier: upsert. upsert is an option: it goes in a third argument, updateOne(filter, update, { upsert: true })");
t('db.users.updateOne({ username: "x" }, { $set: { a: 1 } }, { upsurt: true })', "MongoServerError: unknown update option: upsurt (this lab only uses { upsert: true })");
// replaceOne
td("replaceOne keeps only the new fields", 'db.users.replaceOne({ username: "neha_eats" }, { username: "neha_eats", followers: 1 })', "neha_eats", (u) => Object.keys(u), ["username", "followers"]);
{ const r = run('db.users.replaceOne({ username: "meera" }, { username: "meera" })', S); const ok = r.ok && r.value.matchedCount === 0; if (!ok) fail++; console.log((ok ? "ok  " : "FAIL") + "  replaceOne with no match changes nothing"); }
{ const r = run('db.users.insertOne({ username: "m" })', S); const r2 = run('db.users.replaceOne({ username: "m" }, { username: "m2" })', r.state);
  const ok = r2.ok && String(r2.state.users[8]._id) === String(r.value.insertedId) && r2.state.users[8].username === "m2"; if (!ok) fail++; console.log((ok ? "ok  " : "FAIL") + "  replaceOne keeps _id"); }
t('db.users.replaceOne({ username: "neha_eats" }, { $set: { age: 1 } })', "MongoServerError: Replacement document must not contain atomic operators (found $set). To change only some fields, use updateOne.");
// inserts & statements
t('db.users.insertOne({ username: "x", followers: 0 })', true, v => v.acknowledged && String(v.insertedId).startsWith("6720"));
t('db.posts.insertMany([{ caption: "a" }, { caption: "b" }])', 2, v => Object.keys(v.insertedIds).length);
t('db.posts.insertOne([{ caption: "a" }])', "MongoServerError: insertOne takes ONE document. For a list of documents, use insertMany([...])");
t('db.posts.insertOne({ caption: "a" }, { caption: "b" })', "MongoServerError: insertOne takes one document. For several, use insertMany([ {...}, {...} ])");
t('db.posts.insertMany({ caption: "a" })', "MongoServerError: insertMany needs an array of documents: insertMany([ {...}, {...} ])");
t('use instaDB\ndb.posts.find({ likes: { $gt: 5000 } });', 3);
t('db.posts.find({}); db.users.find({})', "Run one query at a time: remove the extra statement after the semicolon.");
t('db.posts.find({ caption: "a; b" })', 0);
t('   ', "Nothing to run: type a query first.");
{ const E = globalThis.InstaEngine;
  const a = E.run('db.users.insertOne({ username: "m", age: 20, city: "Pune" })', S), b = E.run('db.users.insertOne({ city: "Pune", username: "m", age: 20 })', S);
  const ok = E.fingerprint(a, false) === E.fingerprint(b, false); if (!ok) fail++; console.log((ok ? "ok  " : "FAIL") + "  field order doesn't matter for checking");
  const c = E.run('db.users.insertOne({ username: "m", age: "20", city: "Pune" })', S);
  const ok2 = E.fingerprint(a, false) !== E.fingerprint(c, false); if (!ok2) fail++; console.log((ok2 ? "ok  " : "FAIL") + "  value types do matter");
  console.log("     show:", E.show(a.value).replace(/\n\s*/g, " ")); }
console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED");
process.exit(fail ? 1 : 0);
