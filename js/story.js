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
  // Each step = one line of story + a task that makes sense on its own,
  // so a student can jump into any step without rereading the earlier ones.
  const task = (s) => `<p class="task"><span>Task</span>${s}</p>`;
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
        before: "7 a.m. Meera, a dancer from Pune, signs up for instaDB. The sign-up form sends the document below." +
          task("Insert this <b>one</b> document into the <code>users</code> collection.") +
          pre('{ username: "meera.dance", name: "Meera Nair", age: 20, city: "Pune",\n  followers: 0, verified: false, accountType: "creator",\n  interests: ["dance"] }'),
        answer: 'db.users.insertOne({ username: "meera.dance", name: "Meera Nair", age: 20, city: "Pune", followers: 0, verified: false, accountType: "creator", interests: ["dance"] })',
        starter: "db.users.",
        hint: "One document → insertOne( { ... } ). You can copy the document from the form above.",
        after: "<b>acknowledged: true</b>, and MongoDB gave Meera an <code>_id</code> on its own: you never typed one. instaDB now has 9 users.",
      },
      {
        chapter: "dawn", op: "insertMany()", mode: "write",
        screen: { time: "7:10", title: "meera.dance" },
        before: "7:10 a.m. Meera (<code>meera.dance</code>) uploads her first two posts at the same time." +
          task("Insert <b>both</b> documents below into the <code>posts</code> collection with <b>one</b> command.") +
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
        before: "8 a.m. Riya opens the profile of the photographer <code>arjun.clicks</code>. His photo grid needs all of his posts." +
          task("From <code>posts</code>, find <b>every</b> post whose <code>username</code> is <code>\"arjun.clicks\"</code>."),
        answer: 'db.posts.find({ username: "arjun.clicks" })',
        starter: "db.posts.",
        hint: "The read method that returns all matches: find( { field: value } ).",
        after: "Two posts: Marine Drive at golden hour and the Spiti valley carousel. The grid is ready.",
      },
      {
        chapter: "morning", op: "findOne()", mode: "write",
        screen: { time: "8:15", title: "Search" },
        before: "8:15 a.m. Riya searches for <code>meera.dance</code>, the dancer who joined at 7 a.m. A profile page shows one person, so the app wants a single document back, not a list." +
          task("From <code>users</code>, get the <b>one</b> user whose <code>username</code> is <code>\"meera.dance\"</code>."),
        answer: 'db.users.findOne({ username: "meera.dance" })',
        starter: "db.users.",
        hint: "The read method that returns a single document (or null).",
        after: "One document, with the <code>_id</code> MongoDB created at 7 a.m. find() would have returned a list holding one item; findOne() returns the document itself.",
      },
      // ================= COMPARISON =================
      {
        chapter: "explore", op: "$gt", mode: "blank",
        screen: { time: "11:00", title: "Explore · Viral" },
        before: "11 a.m. The Explore page has a \"Viral\" row for very popular posts." +
          task("Find posts whose <code>likes</code> are <b>more than 5000</b>. A post with exactly 5000 doesn't count."),
        code: ["db.posts.find({ likes: { ", B("$gt"), ": 5000 } })"],
        hint: "Strictly greater than. The comparison operators are $gt, $gte, $lt and $lte.",
        after: "Three posts: Dev's coding meme, his exam-week meme and Kabir's mobility reel. Meera's brand-new posts (0 likes) don't make it, yet.",
      },
      {
        chapter: "explore", op: "$gte + $lte", mode: "blank",
        screen: { time: "11:10", title: "Rising creators" },
        before: "11:10 a.m. The next Explore row suggests \"rising creators\": accounts that are growing but not famous yet." +
          task("Find users whose <code>followers</code> are <b>at least 2,300</b> and <b>at most 12,500</b>. Exactly 2,300 and exactly 12,500 both count."),
        code: ["db.users.find({ followers: { ", B("$gte"), ": 2300, ", B("$lte"), ": 12500 } })"],
        hint: "'At least' and 'at most' include the boundary value itself.",
        after: "Four accounts: sara.draws (exactly 2,300), neha_eats, rohan_travels and riya_codes (exactly 12,500). With $gt and $lt, Sara and Riya would have been left out.",
      },
      {
        chapter: "explore", op: "$in + $nin", mode: "blank",
        screen: { time: "11:20", title: "Watch next" },
        before: "11:20 a.m. A \"Watch next\" row shows reels and carousels. Memes have their own row, so they're left out here." +
          task("Find posts whose <code>type</code> is <b>\"reel\" or \"carousel\"</b>, and whose <code>hashtags</code> do <b>not</b> include <b>\"#memes\"</b>."),
        code: ["db.posts.find({ type: { ", B("$in"), ': ["reel", "carousel"] }, hashtags: { ', B("$nin"), ': ["#memes"] } })'],
        hint: "One operator means 'any of these values', the other means 'none of these values'. On an array field like hashtags, every element is checked.",
        after: "Six posts, including Meera's First dance cover from this morning. Dev's coding reel is out: its hashtags include #memes.",
      },
      // ================= LOGICAL =================
      {
        chapter: "campaign", op: "$and + $eq", mode: "blank",
        screen: { time: "14:00", title: "Sponsor shortlist", field: "accountType" },
        before: "2 p.m. A sneaker brand wants to sponsor instaDB accounts. Their rule: the account must be verified and must be a creator." +
          task("Find users where <code>verified</code> is <b>true</b> <b>and</b> <code>accountType</code> is <b>\"creator\"</b>. Both must hold. Write the verified check with the explicit \"equals\" operator."),
        code: ["db.users.find({ ", B("$and"), ": [ { verified: { ", B("$eq"), ': true } }, { accountType: "creator" } ] })'],
        hint: "First blank: every condition must hold. Second blank: the operator you usually skip, because { verified: true } means the same.",
        after: "riya_codes, arjun.clicks and dev_memes. Meera is a creator too, but she isn't verified, so she's out.",
      },
      {
        chapter: "campaign", op: "$or", mode: "blank",
        screen: { time: "14:20", title: "Delhi + mega reach", field: "city" },
        before: "2:20 p.m. The sneaker brand wants a second list: people who can reach Delhi shoppers, or who have a huge audience anywhere." +
          task("Find users whose <code>city</code> is <b>\"Delhi\"</b> <b>or</b> who have <b>more than 100,000</b> <code>followers</code>. Either one is enough."),
        code: ["db.users.find({ ", B("$or"), ': [ { city: "Delhi" }, { followers: { $gt: 100000 } } ] })'],
        hint: "At least one condition has to hold.",
        after: "riya_codes and kabir.fit (both from Delhi) plus dev_memes (1,52,000 followers). Three accounts, matched for different reasons.",
      },
      {
        chapter: "campaign", op: "$ne", mode: "blank", trap: true,
        screen: { time: "14:40", title: "Creator invites", field: "accountType" },
        before: "2:40 p.m. The growth team sends a \"Become a creator\" invite to everyone who isn't a creator yet." +
          task("Find users whose <code>accountType</code> is <b>not equal to</b> <b>\"creator\"</b>.<br>Predict first: there are 9 users and 4 are creators, so 5 come back. Will all 5 actually have an accountType?"),
        code: ["db.users.find({ accountType: { ", B("$ne"), ': "creator" } })'],
        hint: "The 'not equal' operator.",
        after: "Five users, but look closely: <b>sara.draws</b> and <b>rohan_travels</b> don't have an accountType at all.",
        trapNote: "$ne also matches documents where the field is missing.",
      },
      {
        chapter: "campaign", op: "$not", mode: "blank", trap: true,
        screen: { time: "15:00", title: "Youth program", field: "age" },
        before: "3 p.m. A youth program is looking for users aged 25 or younger." +
          task("Find users whose <code>age</code> is <b>not greater than 25</b>, by wrapping <code>$gt</code> in the negation operator.<br>Predict first: will you get the same count as <code>{ age: { $lte: 25 } }</code>?"),
        code: ["db.users.find({ age: { ", B("$not"), ": { $gt: 25 } } })"],
        hint: "This operator wraps another operator on the same field.",
        after: "Seven users, Meera included. { age: { $lte: 25 } } gives six. The extra one is <b>rohan_travels</b>, who has no age on file.",
        trapNote: "$not counts a missing field as 'not greater than 25'. $lte only matches documents that actually have an age.",
      },
      {
        chapter: "campaign", op: "$nor", mode: "blank",
        screen: { time: "15:20", title: "Fresh faces", field: "city" },
        before: "3:20 p.m. The sneaker brand's last list is \"fresh faces\": people who aren't already verified stars and aren't from Delhi." +
          task("Find users who are <b>neither</b> <code>verified: true</code> <b>nor</b> have <code>city</code> <b>\"Delhi\"</b>. Neither condition may be true."),
        code: ["db.users.find({ ", B("$nor"), ': [ { verified: true }, { city: "Delhi" } ] })'],
        hint: "The opposite of $or: none of the conditions may hold.",
        after: "Five accounts: neha_eats, ananya.reads, sara.draws, rohan_travels and Meera. The brand has its lists.",
      },
      // ================= CURSOR =================
      {
        chapter: "feed", op: "sort() + skip() + limit()", mode: "write",
        screen: { time: "19:00", title: "Trending · page 2", view: "feed", ranked: true },
        before: "7 p.m. The Trending tab lists posts with the most-liked first, 4 posts per page. A user scrolls down to page 2." +
          task("From <code>posts</code>, sort by <code>likes</code> <b>highest first</b>, skip page 1 (the first <b>4</b>), and return the next <b>4</b>."),
        answer: "db.posts.find().sort({ likes: -1 }).skip(4).limit(4)",
        starter: "db.posts.find()",
        hint: "Chain three cursor methods: sort (-1 = descending), skip over page 1, then limit to one page.",
        after: "Positions #5 to #8: Golden hour, Shipped my first app, Best dosa, Late night debugging. Without sort(), there would be no guarantee which 4 posts land on page 2.",
      },
      // ================= UPDATE =================
      {
        chapter: "night", op: "updateMany()", mode: "write",
        screen: { time: "21:00", title: "Reels Week" },
        before: "9 p.m. Marketing launches \"Reels Week\" to promote video posts." +
          task("In <code>posts</code>, update <b>every</b> post whose <code>type</code> is \"reel\": add <b>100</b> to <code>likes</code> and add <b>\"#reelsweek\"</b> to the end of <code>hashtags</code>. Do both in one command."),
        answer: 'db.posts.updateMany({ type: "reel" }, { $inc: { likes: 100 }, $push: { hashtags: "#reelsweek" } })',
        starter: "db.posts.",
        hint: "Many documents → updateMany(filter, update). $inc adds to a number; $push appends one value to an array. Both can go in the same update object.",
        after: "matchedCount: 5, modifiedCount: 5. That includes Meera's First dance cover, which now has exactly 100 likes. Remember that number.",
      },
      {
        chapter: "night", op: "updateOne()", mode: "write", trap: true,
        screen: { time: "22:00", title: "neha_eats" },
        before: "10 p.m. The food blogger <code>neha_eats</code> gets her blue tick and picks two new interests." +
          task("In <code>users</code>, update the user <code>neha_eats</code>: set <code>verified</code> to <b>true</b>, and add <b>\"baking\"</b> and <b>\"cafes\"</b> to <code>interests</code> as <b>two separate</b> items, not one list inside the list. One command."),
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
        before: "11 p.m. Riya (<code>riya_codes</code>) has two posts and wants to tidy her grid by removing just one." +
          task("From <code>posts</code>, delete <b>only one</b> post whose <code>username</code> is <code>\"riya_codes\"</code>. Her other post must stay."),
        answer: 'db.posts.deleteOne({ username: "riya_codes" })',
        starter: "db.posts.",
        hint: "The filter matches two posts, but only one should go.",
        after: "deletedCount: 1. deleteOne removes the <b>first</b> match it finds, here her oldest post, 'Shipped my first full-stack app!'. Her debugging photo stays.",
      },
      {
        chapter: "night", op: "deleteMany()", mode: "write",
        screen: { time: "0:00", title: "Feed" },
        before: "Midnight. A cleanup job removes posts that got almost no attention." +
          task("From <code>posts</code>, delete <b>every</b> post with <b>fewer than 100</b> <code>likes</code>. A post with exactly 100 stays."),
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
