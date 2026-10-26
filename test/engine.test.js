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
t('db.posts.updateOne({}, { likes: 5 })', "MongoServerError: Update document requires atomic operators (like $set, $inc, $push)");
t('db.posts.find({ likes: { $gt: 5000 } );', "SyntaxError: the query isn't valid JavaScript. Check brackets, commas and quotes.");
t('db.posts.find({ likes: { $in: 5 } })', "MongoServerError: $in needs an array");
t('db.users.find({ age: { $not: 25 } })', "MongoServerError: $not needs an operator expression, e.g. { $not: { $gt: 25 } }");
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
