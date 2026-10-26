// "One day on instaDB": a linear story covering Lectures 2 and 3
// (CRUD, query operators, update operators), shown one slide per step.
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
      {
        chapter: "morning", op: "findOne()", mode: "choice",
        screen: { time: "8:15", title: "Search" },
        before: "8:15 a.m. Riya searches for <code>meera.dance</code>, the dancer who joined at 7 a.m. A profile page shows one person, so the app wants a single document back, not a list." +
          task("Get the user whose <code>username</code> is <code>\"meera.dance\"</code>, as a single document. <b>Pick the query that does it.</b>"),
        options: [
          { code: 'db.users.find({ username: "meera.dance" })', why: "Right person, wrong shape: find() always returns a list, even when only one document matches." },
          { code: 'db.users.findOne({})', why: "An empty filter matches everyone, so findOne() just returns the first user: riya_codes." },
          { code: 'db.users.findOne({ username: "meera.dance" })', ok: true },
          { code: 'db.users.findOne("meera.dance")', why: "The filter has to be an object that names the field: { username: \"meera.dance\" }." },
        ],
        hint: "One read method returns a list; the other returns a single document (or null).",
        after: "One document, with the <code>_id</code> MongoDB created at 7 a.m. find() would have returned a list holding one item; findOne() returns the document itself.",
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
        chapter: "explore", op: "$in + $nin", mode: "pick",
        screen: { time: "11:20", title: "Watch next" },
        before: "11:20 a.m. A \"Watch next\" row shows reels and carousels. Memes have their own row, so they're left out here." +
          task("Find posts whose <code>type</code> is <b>\"reel\" or \"carousel\"</b>, and whose <code>hashtags</code> do <b>not</b> include <b>\"#memes\"</b>."),
        code: ["db.posts.find({ type: { ", B("$in", ["$all", "$nin", "$eq"]), ': ["reel", "carousel"] }, hashtags: { ', B("$nin", ["$in", "$ne", "$all"]), ': ["#memes"] } })'],
        hint: "One operator means 'any of these values', the other means 'none of these values'. On an array field like hashtags, every element is checked.",
        after: "Six posts, including Meera's First dance cover from this morning. Dev's coding reel is out: its hashtags include #memes.",
      },
      // ================= REGEX + ARRAY QUERIES =================
      {
        chapter: "search", op: "$regex", mode: "pick",
        screen: { time: "12:00", title: "Search · people" },
        before: "12 p.m. On the search screen, Riya types the letter <b>r</b>. The app suggests accounts whose username starts with that letter." +
          task("Find users whose <code>username</code> <b>starts with</b> a lower-case <b>\"r\"</b>, using the pattern <code>/^r/</code>. The <code>^</code> means \"starts with\"."),
        code: ["db.users.find({ username: { ", B("$regex", ["$eq", "$in", "$options"]), ": /^r/ } })"],
        hint: "The operator that matches text against a pattern such as /^r/.",
        after: "riya_codes and rohan_travels. <code>/^r/</code> only looks at the first letter, so arjun.clicks, with an r in the middle, doesn't count.",
      },
      {
        chapter: "search", op: "$regex + $options", mode: "pick", trap: true,
        screen: { time: "12:10", title: "Search · posts", view: "feed" },
        before: "12:10 p.m. Meera searches posts for the word <b>first</b>. Her own post is called \"First dance cover!\", with a capital F." +
          task("Find posts whose <code>caption</code> contains <b>\"first\"</b> anywhere, in <b>any case</b> (first, First, FIRST). Use the pattern <code>/first/</code>, plus the setting <code>\"i\"</code>, which ignores upper and lower case."),
        code: ["db.posts.find({ caption: { ", B("$regex", ["$eq", "$in", "$all"]), ": /first/, ", B("$options", ["$flags", "$case", "$regex"]), ': "i" } })'],
        hint: "First blank: the pattern operator. Second blank: the operator that holds regex flags. \"i\" means ignore case.",
        after: "Three posts: Riya's \"Shipped my first full-stack app!\", Dev's \"When the code works on first try\" and Meera's \"First dance cover!\".",
        trapNote: "Regex is case-sensitive by default. Without $options: \"i\", Meera's post with its capital F would be missing.",
      },
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
          task("The query below finds users whose <code>accountType</code> is <b>not equal to</b> \"creator\". There are 9 users and 4 creators. <b>Predict: who gets the invite?</b>"),
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
          { text: "meera.dance, who joined this morning", why: "Meera is 20, so she's in both lists." },
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
      // ================= CURSOR =================
      {
        chapter: "feed", op: "sort() + skip() + limit()", mode: "choice",
        screen: { time: "19:00", title: "Trending · page 2", view: "feed", ranked: true },
        before: "7 p.m. The Trending tab lists posts with the most-liked first, 4 posts per page. A user scrolls down to page 2." +
          task("From <code>posts</code>, get <b>page 2</b>: most likes first, leave out the first 4, and show the 4 after them. <b>Pick the query.</b>"),
        options: [
          { code: "db.posts.find().sort({ likes: -1 }).limit(4)", why: "No skip, so this is page 1: positions #1 to #4." },
          { code: "db.posts.find().sort({ likes: 1 }).skip(4).limit(4)", why: "likes: 1 sorts from the fewest likes up, so this is page 2 of the LEAST-liked posts." },
          { code: "db.posts.find().skip(4).limit(4)", why: "Without sort(), the posts come in storage order, so \"page 2\" is just the 5th to 8th post ever inserted." },
          { code: "db.posts.find().sort({ likes: -1 }).skip(4).limit(4)", ok: true },
        ],
        hint: "-1 = descending. Page 2 skips over page 1, then limits to one page.",
        after: "Positions #5 to #8: Golden hour, Shipped my first app, Best dosa, Late night debugging. Without sort(), there would be no guarantee which 4 posts land on page 2.",
      },
      // ================= UPDATE =================
      {
        chapter: "night", op: "updateMany()", mode: "write",
        screen: { time: "21:00", title: "Reels Week" },
        before: "9 p.m. Marketing launches \"Reels Week\" to promote video posts." +
          task("In <code>posts</code>, change <b>every</b> post whose <code>type</code> is \"reel\": add <b>100</b> to <code>likes</code> and add <b>\"#reelsweek\"</b> to the end of <code>hashtags</code>. Do both in one command."),
        answer: 'db.posts.updateMany({ type: "reel" }, { $inc: { likes: 100 }, $push: { hashtags: "#reelsweek" } })',
        hint: "Many documents → updateMany(filter, update). $inc adds to a number; $push appends one value to an array. Both can go in the same update object.",
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
        after: "Ananya's document has no age field now. Open \"See the data right now\": her age shows —.",
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
      {
        chapter: "night", op: "$currentDate + $type", mode: "pick",
        screen: { time: "21:55", title: "meera.dance" },
        before: "9:55 p.m. Meera closes the app. The server records when she was last active, plus an exact timestamp for the sync job." +
          task("For <code>meera.dance</code>, stamp <code>lastActive</code> and <code>lastSync</code> with the <b>server's clock</b>: <code>lastActive</code> as a date, <code>lastSync</code> as a <b>timestamp</b>."),
        code: ['db.users.updateOne({ username: "meera.dance" }, { ', B("$currentDate", ["$set", "$inc", "$max"]), ": { lastActive: true, lastSync: { ", B("$type", ["$as", "$date", "$eq"]), ': "timestamp" } } })'],
        hint: "First blank: the operator that writes the server's current time. Second blank: the key inside it that picks \"date\" or \"timestamp\".",
        after: "<code>lastActive</code> is an ISODate (<code>true</code> means a Date) and <code>lastSync</code> is a <code>Timestamp({ t: …, i: 1 })</code>. The server filled in the time; you never typed it.",
      },
      // ================= ARRAY UPDATES =================
      {
        chapter: "tags", op: "updateOne()", mode: "choice", trap: true,
        screen: { time: "22:00", title: "neha_eats" },
        before: "10 p.m. The food blogger <code>neha_eats</code> gets her blue tick and picks two new interests." +
          task("Update <code>neha_eats</code>: set <code>verified</code> to <b>true</b>, and add <b>\"baking\"</b> and <b>\"cafes\"</b> to <code>interests</code> as <b>two separate</b> items. <b>Pick the query.</b>"),
        options: [
          { code: 'db.users.updateOne({ username: "neha_eats" }, { $set: { verified: true }, $push: { interests: ["baking", "cafes"] } })', why: "$push adds its value as ONE element, so the whole list lands inside the list: [\"food\", \"travel\", [\"baking\", \"cafes\"]]." },
          { code: 'db.users.updateOne({ username: "neha_eats" }, { $set: { verified: true, interests: ["baking", "cafes"] } })', why: "$set replaces the whole array, so food and travel are lost." },
          { code: 'db.users.updateOne({ username: "neha_eats" }, { $set: { verified: true }, $push: { interests: "baking", interests: "cafes" } })', why: "An object can't have the same key twice: JavaScript keeps only the last one, so only \"cafes\" is added." },
          { code: 'db.users.updateOne({ username: "neha_eats" }, { $set: { verified: true }, $push: { interests: { $each: ["baking", "cafes"] } } })', ok: true },
        ],
        hint: "$push alone adds ONE value. To add each item of a list, wrap it in { $each: [...] }.",
        after: "Neha is verified and her interests are food, travel, baking, cafes.",
        trapNote: "Without $each, $push adds the whole list as ONE element: [\"food\", \"travel\", [\"baking\", \"cafes\"]].",
      },
      {
        chapter: "tags", op: "$pullAll", mode: "pick",
        screen: { time: "22:10", title: "neha_eats" },
        before: "10:10 p.m. Neha changes her mind: her profile should be only about food and baking." +
          task("For <code>neha_eats</code>, remove <b>both</b> \"travel\" and \"cafes\" from <code>interests</code> in <b>one</b> operation."),
        code: ['db.users.updateOne({ username: "neha_eats" }, { ', B("$pullAll", ["$pull", "$pop", "$unset"]), ': { interests: ["travel", "cafes"] } })'],
        hint: "$pull removes one value (or whatever matches a condition). This operator removes every value in a list.",
        after: "Neha's interests: food, baking.",
      },
      {
        chapter: "tags", op: "$addToSet", mode: "pick", trap: true,
        screen: { time: "22:20", title: "riya_codes" },
        before: "10:20 p.m. Riya taps the \"music\" interest by accident. The app must never show the same interest twice." +
          task("For <code>riya_codes</code>, add \"music\" to <code>interests</code> <b>only if it isn't already there</b>. Her interests are coding and music, so watch modifiedCount."),
        code: ['db.users.updateOne({ username: "riya_codes" }, { ', B("$addToSet", ["$push", "$set", "$inc"]), ': { interests: "music" } })'],
        hint: "Like $push, but it skips values the array already has.",
        after: "matchedCount: 1, modifiedCount: 0. Riya was found, but \"music\" was already there, so nothing changed. That's exactly what we wanted.",
        trapNote: "With $push, Riya would now have music twice: [\"coding\", \"music\", \"music\"].",
      },
      {
        chapter: "tags", op: "$pop", mode: "pick",
        screen: { time: "22:30", title: "arjun.clicks" },
        before: "10:30 p.m. Arjun wants to focus on photography only. His interests are [\"photography\", \"travel\"]." +
          task("For <code>arjun.clicks</code>, remove the <b>last</b> item of <code>interests</code>. Pick the operator, then the number that means \"last\"."),
        code: ['db.users.updateOne({ username: "arjun.clicks" }, { ', B("$pop", ["$pull", "$unset", "$slice"]), ": { interests: ", B("1", ["-1", "0", "2"]), " } })"],
        hint: "This operator removes an item from one end of an array. 1 means the last item, -1 means the first.",
        after: "\"travel\" is gone, so Arjun's only interest is photography. With -1, \"photography\" would have gone instead.",
      },
      {
        chapter: "tags", op: "$push + $each, $sort, $slice", mode: "pick",
        screen: { time: "22:40", title: "meera.dance" },
        before: "10:40 p.m. Meera adds three dance styles. Her profile has room for only 3 interests, in alphabetical order. Right now her interests are [\"dance\"]." +
          task("For <code>meera.dance</code>, add \"kathak\", \"bollywood\" and \"hip-hop\" to <code>interests</code>, put the list in <b>A→Z order</b>, and <b>keep only the first 3</b>. One command."),
        code: ['db.users.updateOne({ username: "meera.dance" }, { ', B("$push", ["$addToSet", "$set", "$each"]), ": { interests: { ", B("$each", ["$in", "$all", "$push"]), ': ["kathak", "bollywood", "hip-hop"], ', B("$sort", ["$order", "$asc", "$slice"]), ": 1, ", B("$slice", ["$limit", "$size", "$sort"]), ": 3 } } })"],
        hint: "Adding a list → $push with $each. Then $sort: 1 sorts A→Z, and $slice: 3 keeps the first 3.",
        after: "Sorted, the four are bollywood, dance, hip-hop, kathak. <code>$slice: 3</code> cuts the last one, so Meera's interests are bollywood, dance, hip-hop.",
      },
      {
        chapter: "tags", op: "$pull", mode: "pick",
        screen: { time: "22:50", title: "dev_memes" },
        before: "10:50 p.m. Dev decides his reel \"When the code works on first try\" isn't really a meme." +
          task("From that post's <code>hashtags</code>, remove the value <b>\"#memes\"</b>. The other hashtags stay."),
        code: ['db.posts.updateOne({ caption: "When the code works on first try" }, { ', B("$pull", ["$pullAll", "$pop", "$unset"]), ': { hashtags: "#memes" } })'],
        hint: "The opposite of $push: it removes every element equal to the value.",
        after: "Its hashtags are now #coding and #reelsweek.",
      },
      {
        chapter: "tags", op: "positional $", mode: "pick",
        screen: { time: "22:55", title: "riya_codes" },
        before: "10:55 p.m. Riya joins a coding challenge. On her \"Late night debugging sessions\" post, she wants the tag #coding to become #100DaysOfCode." +
          task("In that post's <code>hashtags</code>, <b>replace</b> the element \"#coding\" with \"#100DaysOfCode\", in the same position. The filter already finds \"#coding\"; pick the field path that points to <b>the position it matched</b>."),
        code: ['db.posts.updateOne({ caption: "Late night debugging sessions", hashtags: "#coding" }, { $set: { "', B("hashtags.$", ["hashtags", "hashtags.1", "$.hashtags"]), '": "#100DaysOfCode" } })'],
        hint: "The array field, a dot, then $. That $ stands for the position where the filter found \"#coding\".",
        after: "\"#coding\" became \"#100DaysOfCode\" in the same spot. Without the positional <code>$</code>, you'd need to know the index yourself, as in \"hashtags.0\".",
      },
      // ================= REPLACE + DELETE =================
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
        chapter: "late", op: "replaceOne()", mode: "write",
        screen: { time: "23:30", title: "rohan_travels" },
        before: "11:30 p.m. Rohan turns rohan_travels into a business account. The new app sends his <b>whole</b> new profile, which takes the place of the old one." +
          task("In <code>users</code>, swap the <b>whole</b> document of <code>rohan_travels</code> for the document below. No $ operators.") +
          pre('{ username: "rohan_travels", fullName: "Rohan Das Travels", city: "Kolkata",\n  followers: 7800, verified: false, accountType: "business" }'),
        answer: 'db.users.replaceOne({ username: "rohan_travels" }, { username: "rohan_travels", fullName: "Rohan Das Travels", city: "Kolkata", followers: 7800, verified: false, accountType: "business" })',
        hint: "replaceOne(filter, newDocument). The new document is just plain fields, no $set.",
        after: "matchedCount: 1, modifiedCount: 1. Same <code>_id</code>, completely new body: he's a business account now, and his interests are gone because the new document didn't include them. With updateOne and $set, fields you didn't mention would have stayed.",
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
