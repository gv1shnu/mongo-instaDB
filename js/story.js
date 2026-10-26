// "One day on instaDB": a linear story covering Lectures 2 and 3
// (CRUD, query operators, update operators).
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
    intro: "instaDB is a small photo-sharing app with two collections: <code>users</code> (8 people) and <code>posts</code> (12 posts). Follow it through one day, from a 7 a.m. sign-up to the midnight cleanup. In <b>✍️ write</b> steps you type the whole CRUD query yourself; in <b>🧩 operator</b> steps the query is given and you fill in the operators. Every query runs on the real data, the phone shows what it did to the app, and changes stay changed for the rest of the day.",
    chapters: [
      { id: "dawn", title: "7 a.m.: a new creator joins (Create)" },
      { id: "morning", title: "Morning: opening profiles (Read)" },
      { id: "explore", title: "Late morning: the Explore page (comparison operators)" },
      { id: "search", title: "Noon: the search bar (regex and array queries)" },
      { id: "campaign", title: "Afternoon: a brand comes calling (logical operators)" },
      { id: "feed", title: "Evening: the Trending tab (sort, skip, limit)" },
      { id: "night", title: "9 p.m.: Reels Week and profile edits (field updates)" },
      { id: "tags", title: "10 p.m.: interests and hashtags (array updates)" },
      { id: "late", title: "11 p.m.: a rebrand and the cleanup (replaceOne, Delete)" },
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
      // ================= REGEX + ARRAY QUERIES =================
      {
        chapter: "search", op: "$regex", mode: "blank",
        screen: { time: "12:00", title: "Search · people" },
        before: "12 p.m. On the search screen, Riya types the letter <b>r</b>. The app suggests accounts whose username starts with that letter." +
          task("Find users whose <code>username</code> <b>starts with</b> a lower-case <b>\"r\"</b>, using a regular expression. In <code>/^r/</code>, the <code>^</code> means \"starts with\"."),
        code: ["db.users.find({ username: { ", B("$regex"), ": /^r/ } })"],
        hint: "The operator that matches text against a pattern such as /^r/.",
        after: "riya_codes and rohan_travels. <code>/^r/</code> only looks at the first letter, so arjun.clicks, with an r in the middle, doesn't count.",
      },
      {
        chapter: "search", op: "$regex + $options", mode: "blank", trap: true,
        screen: { time: "12:10", title: "Search · posts", view: "feed" },
        before: "12:10 p.m. Meera searches posts for the word <b>first</b>. Her own post is called \"First dance cover!\", with a capital F." +
          task("Find posts whose <code>caption</code> contains <b>\"first\"</b> anywhere, in <b>any case</b> (first, First, FIRST). Use the pattern <code>/first/</code> plus the option that ignores case.<br>Predict first: without that option, would Meera's post show up?"),
        code: ["db.posts.find({ caption: { ", B("$regex"), ": /first/, ", B("$options"), ': "i" } })'],
        hint: "First blank: the pattern operator. Second blank: the operator that holds regex flags. \"i\" means ignore case.",
        after: "Three posts: Riya's \"Shipped my first full-stack app!\", Dev's \"When the code works on first try\" and Meera's \"First dance cover!\".",
        trapNote: "Regex is case-sensitive by default. Without $options: \"i\", Meera's post with its capital F would be missing.",
      },
      {
        chapter: "search", op: "$all", mode: "blank",
        screen: { time: "12:30", title: "Trip filmmakers", field: "interests" },
        before: "12:30 p.m. A trekking company wants people who love <b>both</b> travel and photography, to film their trips." +
          task("Find users whose <code>interests</code> array contains <b>both</b> \"travel\" <b>and</b> \"photography\", in any order."),
        code: ["db.users.find({ interests: { ", B("$all"), ': ["travel", "photography"] } })'],
        hint: "$in needs just one of the values. This operator needs every value in the list to be in the array.",
        after: "arjun.clicks and rohan_travels. neha_eats loves travel too, but not photography, so she's out. With <code>$in</code> instead, she would have been included: on an array field, $in matches if any one element is in the list.",
      },
      {
        chapter: "search", op: "$elemMatch", mode: "blank",
        screen: { time: "12:40", title: "Healthy living" },
        before: "12:40 p.m. The \"Healthy living\" row shows posts about food or fitness." +
          task("Find posts where <b>at least one</b> element of the <code>hashtags</code> array is <b>\"#food\" or \"#fitness\"</b>. Put a <code>$in</code> inside the operator that tests the array's elements one by one."),
        code: ["db.posts.find({ hashtags: { ", B("$elemMatch"), ': { $in: ["#food", "#fitness"] } } })'],
        hint: "The operator that checks array elements one at a time: a single element has to meet every condition inside it.",
        after: "Three posts: Neha's dosa reel and pasta photo, and Kabir's mobility reel. With one condition, <code>$in</code> alone gives the same result. $elemMatch matters when one element must meet several conditions at once, such as <code>{ $gte: 80, $lt: 90 }</code>.",
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
        chapter: "campaign", op: "$exists", mode: "blank",
        screen: { time: "14:50", title: "Creator invites v2", field: "accountType" },
        before: "2:50 p.m. The growth team fixes the invite list. People with no accountType at all never finished signing up, so they shouldn't get the invite." +
          task("Find users who <b>have</b> an <code>accountType</code> field <b>and</b> whose accountType is not \"creator\"."),
        code: ["db.users.find({ $and: [ { accountType: { ", B("$exists"), ': true } }, { accountType: { $ne: "creator" } } ] })'],
        hint: "The operator that checks whether a field is there at all. true means the field must exist.",
        after: "Three users: neha_eats, kabir.fit and ananya.reads. sara.draws and rohan_travels have no accountType, so this time they're left out.",
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
        chapter: "night", op: "$mul", mode: "blank",
        screen: { time: "21:10", title: "Spiti valley" },
        before: "9:10 p.m. A famous travel vlogger reshares Arjun's Spiti valley carousel, and its likes double." +
          task("In <code>posts</code>, <b>multiply</b> the <code>likes</code> of the post with caption \"Spiti valley in 10 frames\" by <b>2</b>."),
        code: ['db.posts.updateOne({ caption: "Spiti valley in 10 frames" }, { ', B("$mul"), ": { likes: 2 } })"],
        hint: "$inc adds to a number. This operator multiplies it.",
        after: "3,400 → 6,800 likes, without reading the old value first.",
      },
      {
        chapter: "night", op: "$min", mode: "blank",
        screen: { time: "21:20", title: "Exam week be like" },
        before: "9:20 p.m. An audit finds bot likes on Dev's \"Exam week be like\" post. The real count is at most 8,000." +
          task("Set the <code>likes</code> of the post \"Exam week be like\" to <b>8000</b>, but <b>only if</b> its current likes are <b>higher</b> than 8000."),
        code: ['db.posts.updateOne({ caption: "Exam week be like" }, { ', B("$min"), ": { likes: 8000 } })"],
        hint: "This operator keeps whichever is smaller: the current value or the one you give.",
        after: "8,700 → 8,000 likes. Run it again and modifiedCount is 0, because 8000 isn't smaller than 8000.",
      },
      {
        chapter: "night", op: "$max", mode: "blank",
        screen: { time: "21:30", title: "meera.dance" },
        before: "9:30 p.m. A sync job reports that Meera now has 250 followers. Old reports sometimes arrive late, so the count may only go up." +
          task("For the user <code>meera.dance</code>, set <code>followers</code> to <b>250</b>, but <b>only if</b> 250 is <b>higher</b> than her current count."),
        code: ['db.users.updateOne({ username: "meera.dance" }, { ', B("$max"), ": { followers: 250 } })"],
        hint: "The opposite of $min: it keeps whichever is larger.",
        after: "0 → 250 followers. If a late report said 120, the same update would change nothing.",
      },
      {
        chapter: "night", op: "$unset", mode: "blank",
        screen: { time: "21:40", title: "ananya.reads" },
        before: "9:40 p.m. ananya.reads is 17 and asks the app to stop storing her age." +
          task("For the user <code>ananya.reads</code>, <b>remove</b> the <code>age</code> field completely, so it doesn't exist anymore."),
        code: ['db.users.updateOne({ username: "ananya.reads" }, { ', B("$unset"), ': { age: "" } })'],
        hint: "The opposite of $set. The value you give (\"\") is ignored; only the field name matters.",
        after: "Ananya's document has no age field now. Open \"See the data right now\": her age shows —.",
      },
      {
        chapter: "night", op: "$rename", mode: "blank",
        screen: { time: "21:50", title: "All accounts" },
        before: "9:50 p.m. The new version of the app reads a person's full name from a field called <code>fullName</code> instead of <code>name</code>." +
          task("In <b>every</b> user document, rename the field <code>name</code> to <code>fullName</code>. The values stay the same."),
        code: ["db.users.updateMany({}, { ", B("$rename"), ': { name: "fullName" } })'],
        hint: "The operator that gives a field a new name. The empty filter {} matches every user.",
        after: "All 9 users changed: \"Riya Sharma\" now sits under <code>fullName</code>. Only the field name changed; no value was retyped.",
      },
      {
        chapter: "night", op: "$currentDate + $type", mode: "blank",
        screen: { time: "21:55", title: "meera.dance" },
        before: "9:55 p.m. Meera closes the app. The server records when she was last active, plus an exact timestamp for the sync job." +
          task("For <code>meera.dance</code>, set <code>lastActive</code> to the <b>current date</b>, and <code>lastSync</code> to the current time as a <b>timestamp</b>."),
        code: ['db.users.updateOne({ username: "meera.dance" }, { ', B("$currentDate"), ": { lastActive: true, lastSync: { ", B("$type"), ': "timestamp" } } })'],
        hint: "First blank: the operator that writes the server's current time. Second blank: the key inside it that picks \"date\" or \"timestamp\".",
        after: "<code>lastActive</code> is an ISODate (<code>true</code> means a Date) and <code>lastSync</code> is a <code>Timestamp({ t: …, i: 1 })</code>. The server filled in the time; you never typed it.",
      },
      // ================= ARRAY UPDATES =================
      {
        chapter: "tags", op: "updateOne()", mode: "write", trap: true,
        screen: { time: "22:00", title: "neha_eats" },
        before: "10 p.m. The food blogger <code>neha_eats</code> gets her blue tick and picks two new interests." +
          task("In <code>users</code>, update the user <code>neha_eats</code>: set <code>verified</code> to <b>true</b>, and add <b>\"baking\"</b> and <b>\"cafes\"</b> to <code>interests</code> as <b>two separate</b> items, not one list inside the list. One command."),
        answer: 'db.users.updateOne({ username: "neha_eats" }, { $set: { verified: true }, $push: { interests: { $each: ["baking", "cafes"] } } })',
        starter: "db.users.",
        hint: "One user → updateOne. $set for verified. $push alone adds ONE value; to add each item of a list, wrap it in { $each: [...] }.",
        after: "Neha is verified and her interests are food, travel, baking, cafes.",
        trapNote: "Without $each, $push adds the whole list as ONE element: [\"food\", \"travel\", [\"baking\", \"cafes\"]]. Try it and watch the phone.",
      },
      {
        chapter: "tags", op: "$pullAll", mode: "blank",
        screen: { time: "22:10", title: "neha_eats" },
        before: "10:10 p.m. Neha changes her mind: her profile should be only about food and baking." +
          task("For <code>neha_eats</code>, remove <b>both</b> \"travel\" and \"cafes\" from <code>interests</code> in <b>one</b> operation."),
        code: ['db.users.updateOne({ username: "neha_eats" }, { ', B("$pullAll"), ': { interests: ["travel", "cafes"] } })'],
        hint: "$pull removes one value (or whatever matches a condition). This operator removes every value in a list.",
        after: "Neha's interests: food, baking.",
      },
      {
        chapter: "tags", op: "$addToSet", mode: "blank", trap: true,
        screen: { time: "22:20", title: "riya_codes" },
        before: "10:20 p.m. Riya taps the \"music\" interest by accident. The app must never show the same interest twice." +
          task("For <code>riya_codes</code>, add \"music\" to <code>interests</code> <b>only if it isn't already there</b>.<br>Predict first: Riya's interests are coding and music. What will modifiedCount be?"),
        code: ['db.users.updateOne({ username: "riya_codes" }, { ', B("$addToSet"), ': { interests: "music" } })'],
        hint: "Like $push, but it skips values the array already has.",
        after: "matchedCount: 1, modifiedCount: 0. Riya was found, but \"music\" was already there, so nothing changed. That's exactly what we wanted.",
        trapNote: "With $push, Riya would now have music twice: [\"coding\", \"music\", \"music\"].",
      },
      {
        chapter: "tags", op: "$pop", mode: "blank",
        screen: { time: "22:30", title: "arjun.clicks" },
        before: "10:30 p.m. Arjun wants to focus on photography only. His interests are [\"photography\", \"travel\"]." +
          task("For <code>arjun.clicks</code>, remove the <b>last</b> item of <code>interests</code>. Fill in the operator, then the number that means \"last\"."),
        code: ['db.users.updateOne({ username: "arjun.clicks" }, { ', B("$pop"), ": { interests: ", B("1"), " } })"],
        hint: "This operator removes an item from one end of an array. 1 means the last item, -1 means the first.",
        after: "\"travel\" is gone, so Arjun's only interest is photography. With -1, \"photography\" would have gone instead.",
      },
      {
        chapter: "tags", op: "$push + $each, $sort, $slice", mode: "blank",
        screen: { time: "22:40", title: "meera.dance" },
        before: "10:40 p.m. Meera adds three dance styles. Her profile has room for only 3 interests, in alphabetical order. Right now her interests are [\"dance\"]." +
          task("For <code>meera.dance</code>, add \"kathak\", \"bollywood\" and \"hip-hop\" to <code>interests</code>, <b>sort</b> the list A→Z, and <b>keep only the first 3</b>. One update."),
        code: ['db.users.updateOne({ username: "meera.dance" }, { ', B("$push"), ": { interests: { ", B("$each"), ': ["kathak", "bollywood", "hip-hop"], ', B("$sort"), ": 1, ", B("$slice"), ": 3 } } })"],
        hint: "Adding a list → $push with $each. Then $sort: 1 sorts A→Z, and $slice: 3 keeps the first 3.",
        after: "Sorted, the four are bollywood, dance, hip-hop, kathak. <code>$slice: 3</code> cuts the last one, so Meera's interests are bollywood, dance, hip-hop.",
      },
      {
        chapter: "tags", op: "$pull", mode: "blank",
        screen: { time: "22:50", title: "dev_memes" },
        before: "10:50 p.m. Dev decides his reel \"When the code works on first try\" isn't really a meme." +
          task("From that post's <code>hashtags</code>, remove the value <b>\"#memes\"</b>. The other hashtags stay."),
        code: ['db.posts.updateOne({ caption: "When the code works on first try" }, { ', B("$pull"), ': { hashtags: "#memes" } })'],
        hint: "The opposite of $push: it removes every element equal to the value.",
        after: "Its hashtags are now #coding and #reelsweek.",
      },
      {
        chapter: "tags", op: "positional $", mode: "blank",
        screen: { time: "22:55", title: "riya_codes" },
        before: "10:55 p.m. Riya joins a coding challenge. On her \"Late night debugging sessions\" post, she wants the tag #coding to become #100DaysOfCode." +
          task("In that post's <code>hashtags</code>, <b>replace</b> the element \"#coding\" with \"#100DaysOfCode\", in the same position. The filter already finds \"#coding\"; fill in the field path that points to <b>the position it matched</b>."),
        code: ['db.posts.updateOne({ caption: "Late night debugging sessions", hashtags: "#coding" }, { $set: { "', B("hashtags.$"), '": "#100DaysOfCode" } })'],
        hint: "Write the array field, a dot, then $. That $ stands for the position where the filter found \"#coding\".",
        after: "\"#coding\" became \"#100DaysOfCode\" in the same spot. Without the positional <code>$</code>, you'd need to know the index yourself, as in \"hashtags.0\".",
      },
      // ================= REPLACE + DELETE =================
      {
        chapter: "late", op: "deleteOne()", mode: "write",
        screen: { time: "23:00", title: "riya_codes" },
        before: "11 p.m. Riya (<code>riya_codes</code>) has two posts and wants to tidy her grid by removing just one." +
          task("From <code>posts</code>, delete <b>only one</b> post whose <code>username</code> is <code>\"riya_codes\"</code>. Her other post must stay."),
        answer: 'db.posts.deleteOne({ username: "riya_codes" })',
        starter: "db.posts.",
        hint: "The filter matches two posts, but only one should go.",
        after: "deletedCount: 1. deleteOne removes the <b>first</b> match it finds, here her oldest post, 'Shipped my first full-stack app!'. Her debugging photo stays.",
      },
      {
        chapter: "late", op: "replaceOne()", mode: "write",
        screen: { time: "23:30", title: "rohan_travels" },
        before: "11:30 p.m. Rohan turns rohan_travels into a business account. The new app sends his <b>whole</b> new profile, which takes the place of the old one." +
          task("In <code>users</code>, <b>replace</b> the entire document of <code>rohan_travels</code> with the document below. No $ operators.") +
          pre('{ username: "rohan_travels", fullName: "Rohan Das Travels", city: "Kolkata",\n  followers: 7800, verified: false, accountType: "business" }'),
        answer: 'db.users.replaceOne({ username: "rohan_travels" }, { username: "rohan_travels", fullName: "Rohan Das Travels", city: "Kolkata", followers: 7800, verified: false, accountType: "business" })',
        starter: "db.users.",
        hint: "replaceOne(filter, newDocument). The new document is just plain fields, no $set.",
        after: "matchedCount: 1, modifiedCount: 1. Same <code>_id</code>, completely new body: he's a business account now, and his interests are gone because the new document didn't include them. With updateOne and $set, fields you didn't mention would have stayed.",
      },
      {
        chapter: "late", op: "deleteMany()", mode: "write",
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
  // The story's clock: each step runs at the time on its phone screen (IST),
  // so $currentDate gives the same answer every time it's checked.
  root.stepNow = (st) => {
    const [h, m] = st.screen.time.split(":").map(Number);
    return new Date(Date.UTC(2026, 9, h < 5 ? 27 : 26, h, m) - 330 * 60000);
  };
})(typeof window !== "undefined" ? window : globalThis);
