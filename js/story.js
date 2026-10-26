// "One day on instaDB": a linear story covering Lab 2 (CRUD + operators).
// Two kinds of step:
//   mode "write": the student types the whole query (CRUD + cursor calls).
//                 Checked by running it and comparing results with `answer`.
//   mode "blank": the CRUD call is given; the student fills the $operators.
//                 code: strings + blanks { b: "answer" }, checked by blank text.
// Every step's change carries forward to the next.
(function (root) {
  const B = (b) => ({ b });
  const pre = (s) => `<pre class="given">${s}</pre>`;
  root.STORY = {
    title: "One day on instaDB",
    intro: "instaDB is a small photo-sharing app with two collections: <code>users</code> (8 people) and <code>posts</code> (12 posts). Follow it through one day. In <b>✍️ write</b> steps you type the whole CRUD query yourself; in <b>🧩 operator</b> steps the query is given and you fill in the operators. Every query runs on the real data, the phone shows what it did to the app, and changes stay changed for the rest of the day.",
    chapters: [
      { id: "dawn", title: "7 a.m.: a new creator joins (Create)" },
      { id: "morning", title: "Morning: opening profiles (Read)" },
      { id: "explore", title: "Late morning: the Explore page (comparison operators)" },
      { id: "campaign", title: "Afternoon: a brand comes calling (logical operators)" },
      { id: "feed", title: "Evening: the Trending tab (sort, skip, limit)" },
      { id: "night", title: "Night: updates and cleanup (Update, Delete)" },
    ],
    steps: [
      // ================= CREATE =================
      {
        chapter: "dawn", op: "insertOne()", mode: "write",
        screen: { time: "7:00", title: "Sign up" },
        before: "At 7 a.m. a dancer from Pune signs up. Her sign-up form sends this document. <b>Add her to the users collection.</b>" +
          pre('{ username: "meera.dance", name: "Meera Nair", age: 20, city: "Pune",\n  followers: 0, verified: false, accountType: "creator",\n  interests: ["dance"] }'),
        answer: 'db.users.insertOne({ username: "meera.dance", name: "Meera Nair", age: 20, city: "Pune", followers: 0, verified: false, accountType: "creator", interests: ["dance"] })',
        starter: "db.users.",
        hint: "One document → insertOne( { ... } ). You can copy the document from the form above.",
        after: "<b>acknowledged: true</b>, and MongoDB gave Meera an <code>_id</code> on its own: you never typed one. instaDB now has 9 users.",
      },
      {
        chapter: "dawn", op: "insertMany()", mode: "write",
        screen: { time: "7:10", title: "meera.dance" },
        before: "Ten minutes later Meera uploads her first <b>two</b> posts at once. <b>Add both to posts in a single command.</b>" +
          pre('{ username: "meera.dance", caption: "First dance cover!", type: "reel",\n  likes: 0, comments: 0, hashtags: ["#dance"],\n  createdAt: new Date("2026-10-26") }\n\n{ username: "meera.dance", caption: "Studio selfie", type: "photo",\n  likes: 0, comments: 0, hashtags: ["#dance", "#pune"],\n  createdAt: new Date("2026-10-26") }'),
        answer: 'db.posts.insertMany([ { username: "meera.dance", caption: "First dance cover!", type: "reel", likes: 0, comments: 0, hashtags: ["#dance"], createdAt: new Date("2026-10-26") }, { username: "meera.dance", caption: "Studio selfie", type: "photo", likes: 0, comments: 0, hashtags: ["#dance", "#pune"], createdAt: new Date("2026-10-26") } ])',
        starter: "db.posts.",
        hint: "Several documents → insertMany( [ {...}, {...} ] ). Note the square brackets around the list.",
        after: "Two <code>insertedIds</code> come back, one per post. Meera's profile now shows 2 posts, and instaDB has 14.",
      },
      // ================= READ =================
      {
        chapter: "morning", op: "find()", mode: "write",
        screen: { time: "8:00", title: "arjun.clicks", profile: "arjun.clicks" },
        before: "At 8 a.m. Riya opens the app and taps on <b>arjun.clicks</b>. His profile grid needs <b>every post</b> whose username is <code>\"arjun.clicks\"</code>.",
        answer: 'db.posts.find({ username: "arjun.clicks" })',
        starter: "db.posts.",
        hint: "The read method that returns all matches: find( { field: value } ).",
        after: "Two posts: Marine Drive at golden hour and the Spiti valley carousel. The grid is ready.",
      },
      {
        chapter: "morning", op: "findOne()", mode: "write",
        screen: { time: "8:15", title: "Search" },
        before: "Riya has heard about the new dancer. She searches for <b>meera.dance</b> and opens her profile. The app needs exactly <b>one</b> user document, not a list.",
        answer: 'db.users.findOne({ username: "meera.dance" })',
        starter: "db.users.",
        hint: "The read method that returns a single document (or null).",
        after: "One document, with the <code>_id</code> MongoDB created at 7 a.m. find() would have returned a list holding one item; findOne() returns the document itself.",
      },
      // ================= COMPARISON =================
      {
        chapter: "explore", op: "$gt", mode: "blank",
        screen: { time: "11:00", title: "Explore · Viral" },
        before: "By 11 a.m. the Explore page refreshes. Its top row shows only posts that went viral: <b>more than 5000 likes</b>.",
        code: ["db.posts.find({ likes: { ", B("$gt"), ": 5000 } })"],
        hint: "Strictly greater than. The comparison operators are $gt, $gte, $lt and $lte.",
        after: "Three posts: Dev's coding meme, his exam-week meme and Kabir's mobility reel. Meera's brand-new posts (0 likes) don't make it, yet.",
      },
      {
        chapter: "explore", op: "$gte + $lte", mode: "blank",
        screen: { time: "11:10", title: "Rising creators" },
        before: "The second row suggests rising creators: users with <b>at least 2,300</b> and <b>at most 12,500</b> followers. Both boundaries count.",
        code: ["db.users.find({ followers: { ", B("$gte"), ": 2300, ", B("$lte"), ": 12500 } })"],
        hint: "'At least' and 'at most' include the boundary value itself.",
        after: "Four accounts: sara.draws (exactly 2,300), neha_eats, rohan_travels and riya_codes (exactly 12,500). With $gt and $lt, Sara and Riya would have been left out.",
      },
      {
        chapter: "explore", op: "$in + $nin", mode: "blank",
        screen: { time: "11:20", title: "Watch next" },
        before: "The third row is for video lovers: posts that are a <b>reel or a carousel</b>, but <b>not tagged #memes</b> (the meme row is separate).",
        code: ["db.posts.find({ type: { ", B("$in"), ': ["reel", "carousel"] }, hashtags: { ', B("$nin"), ': ["#memes"] } })'],
        hint: "One operator means 'any of these values', the other means 'none of these values'. On an array field like hashtags, every element is checked.",
        after: "Six posts, including Meera's First dance cover from this morning. Dev's coding reel is out: its hashtags include #memes.",
      },
      // ================= LOGICAL =================
      {
        chapter: "campaign", op: "$and + $eq", mode: "blank",
        screen: { time: "14:00", title: "Sponsor shortlist", field: "accountType" },
        before: "At 2 p.m. a sneaker brand emails. They want accounts that are <b>verified</b> (written with the explicit equality operator) <b>and also</b> creators.",
        code: ["db.users.find({ ", B("$and"), ": [ { verified: { ", B("$eq"), ': true } }, { accountType: "creator" } ] })'],
        hint: "First blank: every condition must hold. Second blank: the operator you usually skip, because { verified: true } means the same.",
        after: "riya_codes, arjun.clicks and dev_memes. Meera is a creator too, but she isn't verified, so she's out.",
      },
      {
        chapter: "campaign", op: "$or", mode: "blank",
        screen: { time: "14:20", title: "Delhi + mega reach", field: "city" },
        before: "For local reach they'll also take anyone who lives in <b>Delhi</b> <b>or</b> has more than <b>1,00,000 followers</b>.",
        code: ["db.users.find({ ", B("$or"), ': [ { city: "Delhi" }, { followers: { $gt: 100000 } } ] })'],
        hint: "At least one condition has to hold.",
        after: "riya_codes and kabir.fit (both from Delhi) plus dev_memes (1,52,000 followers). Three accounts, matched for different reasons.",
      },
      {
        chapter: "campaign", op: "$ne", mode: "blank", trap: true,
        screen: { time: "14:40", title: "Creator invites", field: "accountType" },
        before: "The growth team sends a 'Become a creator' invite to everyone whose accountType is <b>not</b> \"creator\". There are 9 users and 4 creators, so you'd expect 5 people. Before you run it: will they be the 5 you expect?",
        code: ["db.users.find({ accountType: { ", B("$ne"), ': "creator" } })'],
        hint: "The 'not equal' operator.",
        after: "Five users, but look closely: <b>sara.draws</b> and <b>rohan_travels</b> don't have an accountType at all.",
        trapNote: "$ne also matches documents where the field is missing.",
      },
      {
        chapter: "campaign", op: "$not", mode: "blank", trap: true,
        screen: { time: "15:00", title: "Youth program", field: "age" },
        before: "A youth program wants users who are <b>not older than 25</b>. Someone suggests { age: { $lte: 25 } }. Write it with the negation operator instead, and predict whether the counts match.",
        code: ["db.users.find({ age: { ", B("$not"), ": { $gt: 25 } } })"],
        hint: "This operator wraps another operator on the same field.",
        after: "Seven users, Meera included. { age: { $lte: 25 } } gives six. The extra one is <b>rohan_travels</b>, who has no age on file.",
        trapNote: "$not counts a missing field as 'not greater than 25'. $lte only matches documents that actually have an age.",
      },
      {
        chapter: "campaign", op: "$nor", mode: "blank",
        screen: { time: "15:20", title: "Fresh faces", field: "city" },
        before: "Last request: a 'fresh faces' list of users who are <b>neither</b> verified <b>nor</b> from Delhi.",
        code: ["db.users.find({ ", B("$nor"), ': [ { verified: true }, { city: "Delhi" } ] })'],
        hint: "The opposite of $or: none of the conditions may hold.",
        after: "Five accounts: neha_eats, ananya.reads, sara.draws, rohan_travels and Meera. The brand has its lists.",
      },
      // ================= CURSOR =================
      {
        chapter: "feed", op: "sort() + skip() + limit()", mode: "write",
        screen: { time: "19:00", title: "Trending · page 2", view: "feed", ranked: true },
        before: "At 7 p.m. the Trending tab is busy. It shows posts <b>most liked first</b>, <b>4 per page</b>. A user scrolls to <b>page 2</b>. Write the whole query.",
        answer: "db.posts.find().sort({ likes: -1 }).skip(4).limit(4)",
        starter: "db.posts.find()",
        hint: "Chain three cursor methods: sort (-1 = descending), skip over page 1, then limit to one page.",
        after: "Positions #5 to #8: Golden hour, Shipped my first app, Best dosa, Late night debugging. Without sort(), there would be no guarantee which 4 posts land on page 2.",
      },
      // ================= UPDATE =================
      {
        chapter: "night", op: "updateMany()", mode: "write",
        screen: { time: "21:00", title: "Reels Week" },
        before: "At 9 p.m. marketing launches Reels Week. <b>Every reel</b> gets <b>100 bonus likes</b> and the hashtag <b>\"#reelsweek\"</b> added to its hashtags. Do both in one update.",
        answer: 'db.posts.updateMany({ type: "reel" }, { $inc: { likes: 100 }, $push: { hashtags: "#reelsweek" } })',
        starter: "db.posts.",
        hint: "Many documents → updateMany(filter, update). $inc adds to a number; $push appends one value to an array. Both can go in the same update object.",
        after: "matchedCount: 5, modifiedCount: 5. That includes Meera's First dance cover, which now has exactly 100 likes. Remember that number.",
      },
      {
        chapter: "night", op: "updateOne()", mode: "write", trap: true,
        screen: { time: "22:00", title: "neha_eats" },
        before: "At 10 p.m. <b>neha_eats</b> gets her blue tick: set <code>verified</code> to <code>true</code>. In the same update, add <b>\"baking\" and \"cafes\"</b> to her interests as <b>two separate</b> items.",
        answer: 'db.users.updateOne({ username: "neha_eats" }, { $set: { verified: true }, $push: { interests: { $each: ["baking", "cafes"] } } })',
        starter: "db.users.",
        hint: "One user → updateOne. $set for verified. $push alone adds ONE value; to add each item of a list, wrap it in { $each: [...] }.",
        after: "Neha is verified and her interests are food, travel, baking, cafes.",
        trapNote: "Without $each, $push adds the whole list as ONE element: [\"food\", \"travel\", [\"baking\", \"cafes\"]]. Try it and watch the phone.",
      },
      // ================= DELETE =================
      {
        chapter: "night", op: "deleteOne()", mode: "write",
        screen: { time: "23:00", title: "riya_codes" },
        before: "At 11 p.m. Riya decides to tidy her grid and remove <b>just one</b> of her posts. Delete <b>one</b> post whose username is <code>\"riya_codes\"</code>, and leave the other.",
        answer: 'db.posts.deleteOne({ username: "riya_codes" })',
        starter: "db.posts.",
        hint: "The filter matches two posts, but only one should go.",
        after: "deletedCount: 1. deleteOne removes the <b>first</b> match it finds, here her oldest post, 'Shipped my first full-stack app!'. Her debugging photo stays.",
      },
      {
        chapter: "night", op: "deleteMany()", mode: "write",
        screen: { time: "0:00", title: "Feed" },
        before: "Midnight cleanup: the moderation job deletes <b>every post with fewer than 100 likes</b>. Write the whole query.",
        answer: "db.posts.deleteMany({ likes: { $lt: 100 } })",
        starter: "db.posts.",
        hint: "Many documents → deleteMany(filter). 'Fewer than' is strictly less than.",
        after: "deletedCount: 4. The pasta attempt, the reading list, Tiger Hill and Meera's Studio selfie are gone. Her First dance cover survives with exactly 100 likes, because 100 is not less than 100. instaDB ends the day with 9 posts.",
      },
    ],
  };
  root.assemble = (code, answers) => {
    let i = 0;
    return code.map((p) => (typeof p === "string" ? p : answers ? answers[i++] : p.b)).join("");
  };
  root.canonical = (st) => (st.mode === "write" ? st.answer : root.assemble(st.code));
})(typeof window !== "undefined" ? window : globalThis);
