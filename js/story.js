// "One day on instaDB": a linear story covering what every section was taught
// from Lectures 2 and 3 (CRUD, query operators, field update operators).
// Step modes:
//   "write"   the student types the whole query. Checked by running it and
//             comparing the result with `answer`, so equivalent queries pass.
//   "pick"    the query is given with blanks; each blank is filled by tapping
//             one of its chips. code: strings + blanks B(answer, distractors, why).
//   "choice"  pick the query that does the task from `options` (each one runs).
//   "bug"     like choice, but a `broken` query is shown first: pick the fix.
//   "predict" `query` is given; pick what it will do from text `options`,
//             then it runs on the phone.
// Every option is a real query, so a wrong pick shows its effect on the phone.
// Every step's change carries forward to the next.
(function (root) {
  // why: { distractor: "explanation" } for a wrong chip that still runs
  const B = (b, opts = [], why = {}) => ({ b, opts, why });
  const pre = (s) => `<pre class="given">${s}</pre>`;
  // Each step = one line of story + a task that makes sense on its own,
  // so a student can jump into any step without rereading the earlier ones.
  const task = (s) => `<p class="task"><span>Task</span>${s}</p>`;
  // Meera's first two posts, used by the insertMany options
  const POST1 = '{ username: "meera.dance", caption: "First dance cover!", type: "reel", likes: 0, comments: 0, hashtags: ["#dance"], createdAt: new Date("2026-10-26") }';
  const POST2 = '{ username: "meera.dance", caption: "Studio selfie", type: "photo", likes: 0, comments: 0, hashtags: ["#dance", "#pune"], createdAt: new Date("2026-10-26") }';
  root.STORY = {
    title: "One day on instaDB",
    intro: "instaDB is a small photo-sharing app with two collections: <code>users</code> (8 people) and <code>posts</code> (12 posts). Follow it through one day, from a 7 a.m. sign-up to the midnight cleanup, one slide at a time. Most slides ask you to pick: an operator, a query, a fix or a prediction. A few ask you to write the whole query. Every option really runs on the data, the phone shows what it did to the app, wrong answers included, and the story's changes carry forward.",
    chapters: [
      { id: "dawn", title: "7 a.m.: a new creator joins (Create)" },
      { id: "morning", title: "Morning: opening profiles (Read)" },
      { id: "explore", title: "Late morning: the Explore page (comparison operators)" },
      { id: "search", title: "Noon: the search bar (array queries)" },
      { id: "campaign", title: "Afternoon: a brand comes calling (logical operators)" },
      { id: "night", title: "9 p.m.: Reels Week and profile edits (field updates)" },
      { id: "tags", title: "10 p.m.: a blue tick and a new phone (updateOne, upsert)" },
      { id: "late", title: "11 p.m.: the cleanup (Delete)" },
    ],
    steps: [
      // ================= CREATE =================
      {
        chapter: "dawn", op: "insertOne()", mode: "write",
        screen: { time: "7:00", title: "Sign up" },
        before: "7 a.m. Meera, a dancer from Pune, signs up for instaDB. The sign-up form sends the document below." +
          task("Add Meera's document to the <code>users</code> collection.") +
          pre('{ username: "meera.dance", name: "Meera Nair", age: 20, city: "Pune",\n  followers: 0, verified: false, accountType: "creator",\n  interests: ["dance"] }'),
        answer: 'db.users.insertOne({ username: "meera.dance", name: "Meera Nair", age: 20, city: "Pune", followers: 0, verified: false, accountType: "creator", interests: ["dance"] })',
        hint: "One document → insertOne( { ... } ). Press Copy on the form, then paste it between the brackets.",
        after: "<b>acknowledged: true</b>, and MongoDB gave Meera an <code>_id</code> on its own: you never typed one. instaDB now has 9 users.",
      },
      {
        chapter: "dawn", op: "insertMany()", mode: "choice",
        screen: { time: "7:10", title: "meera.dance" },
        before: "7:10 a.m. Meera (<code>meera.dance</code>) uploads her first two posts at the same time: a reel called \"First dance cover!\" and a photo called \"Studio selfie\"." +
          task("Add <b>both</b> posts to the <code>posts</code> collection in a <b>single</b> command. <b>Pick the query.</b>"),
        options: [
          { code: `db.posts.insertOne([ ${POST1}, ${POST2} ])`, why: "insertOne takes exactly one document, not a list. MongoDB refuses it." },
          { code: `db.posts.insertMany([ ${POST1}, ${POST2} ])`, ok: true },
          { code: `db.posts.insertMany(${POST1}, ${POST2})`, why: "insertMany needs the documents inside square brackets [ ], as one list. Without them, MongoDB refuses it." },
          { code: `db.posts.insertMany([ ${POST1} ])`, why: "Right method and brackets, but the list holds only the reel, so the Studio selfie is never posted." },
        ],
        hint: "Several documents → insertMany( [ {...}, {...} ] ). Note the square brackets around the list.",
        after: "Two <code>insertedIds</code> come back, one per post. Meera's profile now shows 2 posts, and instaDB has 14.",
      },
      // ================= READ =================
      {
        chapter: "morning", op: "find()", mode: "write",
        screen: { time: "8:00", title: "arjun.clicks", profile: "arjun.clicks" },
        before: "8 a.m. Riya opens the profile of the photographer <code>arjun.clicks</code>. His photo grid needs all of his posts." +
          task("From <code>posts</code>, get <b>every</b> post whose <code>username</code> is <code>\"arjun.clicks\"</code>."),
        answer: 'db.posts.find({ username: "arjun.clicks" })',
        hint: "The read method that returns all matches: find( { field: value } ).",
        after: "Two posts: Marine Drive at golden hour and the Spiti valley carousel. The grid is ready.",
      },
      // ================= COMPARISON =================
      {
        chapter: "explore", op: "$gt", mode: "pick",
        screen: { time: "11:00", title: "Explore · Viral" },
        before: "11 a.m. The Explore page has a \"Viral\" row for very popular posts." +
          task("Find posts whose <code>likes</code> are <b>more than 5000</b>. A post with exactly 5000 doesn't count."),
        code: ["db.posts.find({ likes: { ", B("$gt", ["$gte", "$lt", "$in"], { $gte: "$gte would also let in a post with exactly 5000 likes. None has exactly 5000 today, so the phone looks the same, but the task says more than 5000." }), ": 5000 } })"],
        hint: "Strictly greater than. The comparison operators are $gt, $gte, $lt and $lte.",
        after: "Three posts: Dev's coding meme, his exam-week meme and Kabir's mobility reel. Meera's brand-new posts (0 likes) don't make it, yet.",
      },
      {
        chapter: "explore", op: "$gte + $lte", mode: "pick",
        screen: { time: "11:10", title: "Rising creators" },
        before: "11:10 a.m. The next Explore row suggests \"rising creators\": accounts that are growing but not famous yet." +
          task("Find users whose <code>followers</code> are <b>at least 2,300</b> and <b>at most 12,500</b>. Exactly 2,300 and exactly 12,500 both count."),
        code: ["db.users.find({ followers: { ", B("$gte", ["$gt", "$lte", "$in"]), ": 2300, ", B("$lte", ["$lt", "$gte", "$ne"]), ": 12500 } })"],
        hint: "'At least' and 'at most' include the boundary value itself.",
        after: "Four accounts: sara.draws (exactly 2,300), neha_eats, rohan_travels and riya_codes (exactly 12,500). With $gt and $lt, Sara and Riya would have been left out.",
      },
      {
        chapter: "explore", op: "$in", mode: "pick",
        screen: { time: "11:20", title: "Watch next" },
        before: "11:20 a.m. A \"Watch next\" row shows posts that move: reels and carousels." +
          task("Find posts whose <code>type</code> is <b>\"reel\" or \"carousel\"</b>."),
        code: ["db.posts.find({ type: { ", B("$in", ["$all", "$nin", "$eq"]), ': ["reel", "carousel"] } })'],
        hint: "The operator that means 'any of these values'.",
        after: "Seven posts, including Meera's First dance cover from this morning. Photos are left out.",
      },
      // ================= ARRAY QUERIES =================
      {
        chapter: "search", op: "$all", mode: "choice",
        screen: { time: "12:30", title: "Trip filmmakers", field: "interests" },
        before: "12:30 p.m. A trekking company wants people who love <b>both</b> travel and photography, to film their trips." +
          task("Find users whose <code>interests</code> array contains <b>both</b> \"travel\" <b>and</b> \"photography\", in any order. <b>Pick the query.</b>"),
        options: [
          { code: 'db.users.find({ interests: { $in: ["travel", "photography"] } })', why: "$in needs only ONE of the values, so neha_eats (travel, no photography) sneaks in." },
          { code: 'db.users.find({ interests: ["travel", "photography"] })', why: "A plain array means \"exactly this list, in this order\". Arjun's list is the other way round, so only Rohan matches." },
          { code: 'db.users.find({ interests: { $all: ["travel", "photography"] } })', ok: true },
          { code: 'db.users.find({ interests: { $eq: ["photography", "travel"] } })', why: "$eq with an array also means \"exactly this list, in this order\". Now only Arjun matches." },
        ],
        hint: "One operator needs just one of the values. Another needs every value in the list, in any order.",
        after: "arjun.clicks and rohan_travels. neha_eats loves travel too, but not photography, so she's out. With <code>$in</code> instead, she would have been included: on an array field, $in matches if any one element is in the list.",
      },
      {
        chapter: "search", op: "$elemMatch", mode: "pick",
        screen: { time: "12:40", title: "Healthy living" },
        before: "12:40 p.m. The \"Healthy living\" row shows posts about food or fitness." +
          task("Find posts where <b>at least one</b> element of the <code>hashtags</code> array is <b>\"#food\" or \"#fitness\"</b>. The <code>$in</code> is already there; pick what goes around it."),
        code: ["db.posts.find({ hashtags: { ", B("$elemMatch", ["$all", "$in", "$exists"]), ': { $in: ["#food", "#fitness"] } } })'],
        hint: "The operator that checks array elements one at a time: a single element has to meet every condition inside it.",
        after: "Three posts: Neha's dosa reel and pasta photo, and Kabir's mobility reel. With one condition, <code>$in</code> alone gives the same result. $elemMatch matters when one element must meet several conditions at once, such as <code>{ $gte: 80, $lt: 90 }</code>.",
      },
      // ================= LOGICAL =================
      {
        chapter: "campaign", op: "$and + $eq", mode: "pick",
        screen: { time: "14:00", title: "Sponsor shortlist", field: "accountType" },
        before: "2 p.m. A sneaker brand wants to sponsor instaDB accounts. Their rule: the account must be verified and must be a creator." +
          task("Find users where <code>verified</code> is <b>true</b> <b>and</b> <code>accountType</code> is <b>\"creator\"</b>. Both must hold. The verified check spells out its comparison instead of the shorthand <code>{ verified: true }</code>."),
        code: ["db.users.find({ ", B("$and", ["$or", "$nor", "$all"]), ": [ { verified: { ", B("$eq", ["$ne", "$exists", "$in"]), ': true } }, { accountType: "creator" } ] })'],
        hint: "First blank: every condition must hold. Second blank: the operator you usually skip, because { verified: true } means the same.",
        after: "riya_codes, arjun.clicks and dev_memes. Meera is a creator too, but she isn't verified, so she's out.",
      },
      {
        chapter: "campaign", op: "$or", mode: "bug",
        screen: { time: "14:20", title: "Delhi + mega reach", field: "city" },
        before: "2:20 p.m. The sneaker brand wants a second list: people who can reach Delhi shoppers, or who have a huge audience anywhere. The intern's query crashes." +
          task("Find users whose <code>city</code> is <b>\"Delhi\"</b> <b>or</b> who have <b>more than 100,000</b> <code>followers</code>. The query below fails. <b>Pick the fix.</b>"),
        broken: 'db.users.find({ $or: { city: "Delhi" }, { followers: { $gt: 100000 } } })',
        options: [
          { code: 'db.users.find({ $or: ( { city: "Delhi" }, { followers: { $gt: 100000 } } ) })', why: "Round brackets don't make a list. JavaScript keeps only the last condition, and $or refuses anything that isn't an array." },
          { code: 'db.users.find({ $or: [ { city: "Delhi" }, { followers: { $gt: 100000 } } ] })', ok: true },
          { code: 'db.users.find({ city: "Delhi", followers: { $gt: 100000 } })', why: "This runs, but two conditions side by side mean AND. Nobody in Delhi has 100,000 followers, so the list is empty." },
          { code: 'db.users.find({ $or: [ city: "Delhi", followers: { $gt: 100000 } ] })', why: "Square brackets are right, but each condition inside them needs its own { }." },
        ],
        hint: "$or takes an ARRAY of conditions: [ {...}, {...} ].",
        after: "riya_codes and kabir.fit (both from Delhi) plus dev_memes (1,52,000 followers). Three accounts, matched for different reasons.",
      },
      {
        chapter: "campaign", op: "$ne", mode: "predict", trap: true,
        screen: { time: "14:40", title: "Creator invites", field: "accountType" },
        before: "2:40 p.m. The growth team sends a \"Become a creator\" invite to everyone who isn't a creator yet." +
          task("There are <b>9 users</b>: 4 have <code>accountType: \"creator\"</code>, 3 have <code>\"personal\"</code> or <code>\"business\"</code> (neha_eats, kabir.fit, ananya.reads), and 2 have <b>no accountType field at all</b> (sara.draws, rohan_travels). The query below asks for users whose <code>accountType</code> is not \"creator\". <b>Predict: who gets the invite?</b>"),
        query: 'db.users.find({ accountType: { $ne: "creator" } })',
        options: [
          { text: "Only the 3 users whose accountType is \"personal\" or \"business\": neha_eats, kabir.fit, ananya.reads", why: "That's what most people expect. But $ne also matches documents that don't have the field at all." },
          { text: "Those 3, plus sara.draws and rohan_travels, who have no accountType at all", ok: true },
          { text: "Nobody: sara.draws and rohan_travels have no accountType, so the query fails", why: "A missing field never makes a query fail. It just affects which documents match." },
          { text: "All 9 users", why: "The 4 creators have accountType \"creator\", so $ne leaves them out." },
        ],
        hint: "Ask yourself: is \"no accountType\" equal to \"creator\"?",
        after: "Five users, but look closely: <b>sara.draws</b> and <b>rohan_travels</b> don't have an accountType at all.",
        trapNote: "$ne also matches documents where the field is missing.",
      },
      {
        chapter: "campaign", op: "$exists", mode: "pick",
        screen: { time: "14:50", title: "Creator invites v2", field: "accountType" },
        before: "2:50 p.m. The growth team fixes the invite list. People with no accountType at all never finished signing up, so they shouldn't get the invite." +
          task("Find users who <b>have</b> an <code>accountType</code> field <b>and</b> whose accountType is not \"creator\"."),
        code: ["db.users.find({ $and: [ { accountType: { ", B("$exists", ["$ne", "$eq", "$in"]), ': true } }, { accountType: { $ne: "creator" } } ] })'],
        hint: "The operator that checks whether a field is there at all. true means the field must exist.",
        after: "Three users: neha_eats, kabir.fit and ananya.reads. sara.draws and rohan_travels have no accountType, so this time they're left out.",
      },
      {
        chapter: "campaign", op: "$not", mode: "predict", trap: true,
        screen: { time: "15:00", title: "Youth program", field: "age" },
        before: "3 p.m. A youth program is looking for users aged 25 or younger." +
          task("The query below finds users whose age is <b>not greater than 25</b>. It returns 7 users, but <code>{ age: { $lte: 25 } }</code> returns only 6. <b>Predict: who is the extra user?</b>"),
        query: "db.users.find({ age: { $not: { $gt: 25 } } })",
        options: [
          { text: "kabir.fit, who is 27", why: "27 is greater than 25, so $not { $gt: 25 } leaves Kabir out, just like $lte does." },
          { text: "rohan_travels, who has no age on file", ok: true },
          { text: "sara.draws, who is 26", why: "26 is greater than 25, so both queries leave Sara out." },
          { text: "meera.dance, who is 20", why: "20 isn't greater than 25, and it is at most 25, so Meera is in both lists." },
        ],
        hint: "Which user can't be \"greater than 25\" because there's nothing to compare?",
        after: "Seven users, Meera included. { age: { $lte: 25 } } gives six. The extra one is <b>rohan_travels</b>, who has no age on file.",
        trapNote: "$not counts a missing field as 'not greater than 25'. $lte only matches documents that actually have an age.",
      },
      {
        chapter: "campaign", op: "$nor", mode: "pick",
        screen: { time: "15:20", title: "Fresh faces", field: "city" },
        before: "3:20 p.m. The sneaker brand's last list is \"fresh faces\": people who aren't already verified stars and aren't from Delhi." +
          task("Find users for whom <b>none</b> of these is true: <code>verified</code> is true; <code>city</code> is <b>\"Delhi\"</b>."),
        code: ["db.users.find({ ", B("$nor", ["$or", "$not", "$and"]), ': [ { verified: true }, { city: "Delhi" } ] })'],
        hint: "The opposite of $or: none of the conditions may hold.",
        after: "Five accounts: neha_eats, ananya.reads, sara.draws, rohan_travels and Meera. The brand has its lists.",
      },
      // ================= UPDATE =================
      {
        chapter: "night", op: "updateMany()", mode: "write",
        screen: { time: "21:00", title: "Reels Week" },
        before: "9 p.m. Marketing launches \"Reels Week\" to promote video posts." +
          task("In <code>posts</code>, add <b>100</b> to the <code>likes</code> of <b>every</b> post whose <code>type</code> is \"reel\", in one command."),
        answer: 'db.posts.updateMany({ type: "reel" }, { $inc: { likes: 100 } })',
        hint: "Many documents → updateMany(filter, update). $inc adds to a number.",
        after: "matchedCount: 5, modifiedCount: 5. That includes Meera's First dance cover, which now has exactly 100 likes. Remember that number.",
      },
      {
        chapter: "night", op: "$mul", mode: "pick",
        screen: { time: "21:10", title: "Spiti valley" },
        before: "9:10 p.m. A famous travel vlogger reshares Arjun's Spiti valley carousel, and its likes double." +
          task("In <code>posts</code>, <b>double</b> the <code>likes</code> of the post with caption \"Spiti valley in 10 frames\"."),
        code: ['db.posts.updateOne({ caption: "Spiti valley in 10 frames" }, { ', B("$mul", ["$inc", "$set", "$max"]), ": { likes: 2 } })"],
        hint: "$inc adds to a number. This operator multiplies it.",
        after: "3,400 → 6,800 likes, without reading the old value first.",
      },
      {
        chapter: "night", op: "$min", mode: "pick",
        screen: { time: "21:20", title: "Exam week be like" },
        before: "9:20 p.m. An audit finds bot likes on Dev's \"Exam week be like\" post. The real count is at most 8,000." +
          task("Bring the <code>likes</code> of the post \"Exam week be like\" down to <b>8000</b>, but <b>only if</b> they are above 8000 now."),
        code: ['db.posts.updateOne({ caption: "Exam week be like" }, { ', B("$min", ["$max", "$set", "$inc"], { $set: "$set gives 8,000 today too, but it always overwrites. If the post had 7,000 real likes, $set would raise it to 8,000; the task says only lower it." }), ": { likes: 8000 } })"],
        hint: "This operator keeps whichever is smaller: the current value or the one you give.",
        after: "8,700 → 8,000 likes. Run it again and modifiedCount is 0, because 8000 isn't smaller than 8000.",
      },
      {
        chapter: "night", op: "$max", mode: "pick",
        screen: { time: "21:30", title: "meera.dance" },
        before: "9:30 p.m. A sync job reports that Meera now has 250 followers. Old reports sometimes arrive late, so the count may only go up." +
          task("For the user <code>meera.dance</code>, raise <code>followers</code> to <b>250</b>, unless she already has more."),
        code: ['db.users.updateOne({ username: "meera.dance" }, { ', B("$max", ["$min", "$set", "$mul"], { $set: "$set gives 250 today too, but it always overwrites. A late report saying 120 would push her count DOWN; the task says it may only go up." }), ": { followers: 250 } })"],
        hint: "The opposite of $min: it keeps whichever is larger.",
        after: "0 → 250 followers. If a late report said 120, the same update would change nothing.",
      },
      {
        chapter: "night", op: "$unset", mode: "pick",
        screen: { time: "21:40", title: "ananya.reads" },
        before: "9:40 p.m. ananya.reads is 17 and asks the app to stop storing her age." +
          task("For the user <code>ananya.reads</code>, <b>remove</b> the <code>age</code> field completely, so it doesn't exist anymore."),
        code: ['db.users.updateOne({ username: "ananya.reads" }, { ', B("$unset", ["$set", "$pull", "$rename"]), ': { age: "" } })'],
        hint: "The opposite of $set. The value you give (\"\") is ignored; only the field name matters.",
        after: "Ananya's document has no age field now. Open \"See the data\" below the terminal: her age shows —.",
      },
      {
        chapter: "night", op: "$rename", mode: "pick",
        screen: { time: "21:50", title: "All accounts" },
        before: "9:50 p.m. The new version of the app reads a person's full name from a field called <code>fullName</code> instead of <code>name</code>." +
          task("In <b>every</b> user document, give the field <code>name</code> the new name <code>fullName</code>. The values stay the same."),
        code: ["db.users.updateMany({}, { ", B("$rename", ["$set", "$unset", "$push"]), ': { name: "fullName" } })'],
        hint: "The operator that gives a field a new name. The empty filter {} matches every user.",
        after: "All 9 users changed: \"Riya Sharma\" now sits under <code>fullName</code>. Only the field name changed; no value was retyped.",
      },
      // ================= UPDATE ONE + UPSERT =================
      {
        chapter: "tags", op: "updateOne()", mode: "write",
        screen: { time: "22:00", title: "neha_eats" },
        before: "10 p.m. The food blogger <code>neha_eats</code> gets her blue tick." +
          task("In <code>users</code>, make <code>verified</code> <b>true</b> for the user <code>neha_eats</code>. Nothing else about her changes."),
        answer: 'db.users.updateOne({ username: "neha_eats" }, { $set: { verified: true } })',
        hint: "One user → updateOne(filter, update). $set writes a field's new value.",
        after: "matchedCount: 1, modifiedCount: 1. Neha's profile now shows the blue tick, and every other field is untouched.",
      },
      {
        chapter: "tags", op: "upsert", mode: "choice",
        screen: { time: "22:10", title: "ishaan.films" },
        before: "10:10 p.m. Ishaan (<code>ishaan.films</code>) taps <b>Save</b> on his profile from a new phone. The app can't tell whether his account exists yet, so it must update it if it's there and create it if it isn't." +
          task("Save <code>city: \"Jaipur\"</code> and <code>followers: 0</code> for the username <code>ishaan.films</code>, creating the document if it doesn't exist. One command. <b>Pick the query.</b>"),
        options: [
          { code: 'db.users.updateOne({ username: "ishaan.films" }, { $set: { city: "Jaipur", followers: 0 } })', why: "There's no ishaan.films yet, so the filter matches nothing: matchedCount 0, and nothing is saved." },
          { code: 'db.users.insertOne({ username: "ishaan.films", city: "Jaipur", followers: 0 })', why: "It works today, but if the account already existed this would create a second ishaan.films. The task needs update-or-create." },
          { code: 'db.users.updateOne({ username: "ishaan.films" }, { $set: { city: "Jaipur", followers: 0 }, upsert: true })', why: "upsert is an option, not part of the update. It goes in a third argument: { upsert: true }." },
          { code: 'db.users.updateOne({ username: "ishaan.films" }, { $set: { city: "Jaipur", followers: 0 } }, { upsert: true })', ok: true },
        ],
        hint: "updateOne takes a third argument for options. One of them creates the document when nothing matches.",
        after: "matchedCount 0, upsertedCount 1: nothing matched, so MongoDB created the document from the filter's username plus the $set fields, with a new <code>_id</code>. Run it again and it would just update him.",
      },
      // ================= DELETE =================
      {
        chapter: "late", op: "deleteOne()", mode: "bug",
        screen: { time: "23:00", title: "riya_codes" },
        before: "11 p.m. Riya wants to tidy her grid by removing just one of her two posts. The intern's query would remove <b>both</b>." +
          task("Remove <b>only one</b> post whose <code>username</code> is <code>\"riya_codes\"</code>. Her other post must stay. <b>Pick the fix.</b>"),
        broken: 'db.posts.deleteMany({ username: "riya_codes" })',
        options: [
          { code: 'db.posts.deleteMany({ username: "riya_codes" }).limit(1)', why: "limit() belongs to find() cursors. deleteMany has already deleted both posts and returned a plain result, which has no limit()." },
          { code: 'db.posts.deleteOne({ username: "riya_codes" })', ok: true },
          { code: 'db.posts.deleteOne("riya_codes")', why: "The filter has to be an object that names the field: { username: \"riya_codes\" }." },
          { code: 'db.posts.deleteOne({ caption: "riya_codes" })', why: "riya_codes is a username, not a caption, so nothing matches and nothing is deleted." },
        ],
        hint: "There's a delete method that stops after the first match.",
        after: "deletedCount: 1. deleteOne removes the <b>first</b> match it finds, here her oldest post, 'Shipped my first full-stack app!'. Her debugging photo stays.",
      },
      {
        chapter: "late", op: "deleteMany()", mode: "write",
        screen: { time: "0:00", title: "Feed" },
        before: "Midnight. A cleanup job removes posts that got almost no attention." +
          task("From <code>posts</code>, remove <b>every</b> post with <b>fewer than 100</b> <code>likes</code>. A post with exactly 100 stays."),
        answer: "db.posts.deleteMany({ likes: { $lt: 100 } })",
        hint: "Many documents → deleteMany(filter). 'Fewer than' is strictly less than.",
        after: "deletedCount: 4. The pasta attempt, the reading list, Tiger Hill and Meera's Studio selfie are gone. Her First dance cover survives with exactly 100 likes, because 100 is not less than 100. instaDB ends the day with 9 posts.",
      },
    ],
  };
  root.assemble = (code, answers) => {
    let i = 0;
    return code.map((p) => (typeof p === "string" ? p : answers ? answers[i++] : p.b)).join("");
  };
  root.canonical = (st) => {
    if (st.mode === "write") return st.answer;
    if (st.mode === "predict") return st.query;
    if (st.mode === "choice" || st.mode === "bug") return st.options.find((o) => o.ok).code;
    return root.assemble(st.code);
  };
  // Chips for one blank, in a fixed shuffled order so the answer isn't always first.
  root.chipsFor = (st, blank) => {
    const all = [blank.b, ...blank.opts];
    let h = 0;
    for (const c of st.op + blank.b) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const k = h % all.length;
    return all.slice(k).concat(all.slice(0, k));
  };
  // The story's clock: each step runs at the time on its phone screen (IST),
  // so $currentDate gives the same answer every time it's checked.
  root.stepNow = (st) => {
    const [h, m] = st.screen.time.split(":").map(Number);
    return new Date(Date.UTC(2026, 9, h < 5 ? 27 : 26, h, m) - 330 * 60000);
  };
})(typeof window !== "undefined" ? window : globalThis);
