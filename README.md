# One Day on instaDB

A story-driven slide deck of MongoDB CRUD (Lecture 2) and query and update operators (Lecture 3), built on the instaDB seed data used in the lab.

Students follow instaDB through one day in 35 slides, one question per slide, with **Prev / Next**. A new user, Meera, signs up at 7 a.m., and her account and posts carry through the rest of the day. A phone-style preview stays beside every slide and re-renders the app from whatever the query returned or changed, wrong answers included.

| Slide type | Count | What the student does |
|---|---|---|
| ✍️ write the query | 5 | Types the whole CRUD query. Checked by running it, so equivalent answers pass (fields in any order). Given documents have a Copy button, so the time goes into the query, not retyping fields. |
| 🧩 pick the operator | 21 | Taps a chip for each blank in a given query. |
| ☑️ choose the query | 5 | Picks the query that does the task out of four. |
| 🐞 fix the bug | 2 | Sees a broken query and what mongosh said, then picks the fix. |
| 🔮 predict | 2 | Predicts what a given query will do, then watches it run. |

Every option is a real query: whatever the student picks runs on the data and shows up on the phone and in the terminal, so a wrong answer shows *why* it's wrong. Next unlocks after one try, right or wrong; "Show answer" is recorded and listed on the final slide.

**Covers:**
- **Create:** `insertOne`, `insertMany`
- **Read:** `find`, `findOne`, `sort`, `skip`, `limit`
- **Update:** `updateOne`, `updateMany`, `replaceOne`
- **Delete:** `deleteOne`, `deleteMany`
- **Comparison:** `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`
- **Logical:** `$and`, `$or`, `$not`, `$nor`, `$exists`
- **Regex and arrays:** `$regex`, `$options`, `$all`, `$elemMatch`
- **Field updates:** `$set`, `$unset`, `$rename`, `$inc`, `$mul`, `$min`, `$max`, `$currentDate` (Date and timestamp)
- **Array updates:** `$push` with `$each`, `$sort`, `$slice`; `$addToSet`, `$pop`, `$pull`, `$pullAll`, positional `$`

## How it works

- No server, no database, no install. A small query engine (`js/engine.js`) runs MongoDB-style queries in the browser with MongoDB's behaviour for the cases in the lab: missing fields with `$ne`/`$not`, matching inside arrays, and sort → skip → limit order. `$currentDate` uses the time on each step's phone screen, so answers can be checked.
- `js/phone.js` draws the preview: profile grids, Explore, people lists, ranked feeds, update highlights (+100 likes, added/removed interests, added/removed/changed fields, "just verified") and deleted posts.
- Write slides are checked by result; the other slides by the option picked. Every query is also run, and its output is shown in a mongosh-style terminal, including real error messages for mistakes such as unknown operators.
- Each slide has its own address (`#12`), so a teacher can project a slide and students can open the same one.
- On a phone-sized screen, the app preview becomes a bottom sheet that slides up after each answer.
- Progress is saved in the student's browser (localStorage), one copy per signed-in student, so a shared lab computer keeps students apart.
- Score tracking is optional (see below). Without it, nothing is collected.

## Put it on GitHub Pages

1. Create a new **public** repository on GitHub, e.g. `instadb-practice`.
2. Upload everything in this folder (keep the `js/` folder structure), either with **Add file → Upload files** or:
   ```bash
   git init && git add . && git commit -m "One Day on instaDB"
   git branch -M main
   git remote add origin https://github.com/<your-username>/instadb-practice.git
   git push -u origin main
   ```
3. In the repo, go to **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
4. After a minute or two the site is live at `https://<your-username>.github.io/instadb-practice/`.

## Score tracking (optional)

Students sign in with their **university Google account**, and each one's score lands in a Google Sheet you own. Only `@nst.rishihood.edu.in` (students) and `@rishihood.edu.in` (staff) accounts can sign in; personal Gmail and any other domain are refused. Staff who sign in to test get a row in the sheet too.

**What you get in the sheet**
- **Scores:** one row per student: score, slides solved, how many on the first try, how many with "Show answer", wrong tries, the slide they're on, finished or not, first seen and last update. Then **Tab switches** and **Time away (s)**.
- **Attempts:** one row per answer, with the slide, right / wrong / shown, and what they picked (for example `C: db.posts.insertMany(...)`). This shows which wrong answers are common.
  It also gets a row each time a student:
  - **left tab:** switched to another tab or minimised the browser, with how long they were away
  - **left window:** put another app or window in front for more than 3 seconds

**About the activity tracking**
- Students are told on the sign-in panel that switching tabs or windows is recorded.
- Only signed-in students are tracked.
- The counts never go down: restarting the day or clearing the browser doesn't reset them in the sheet.
- These are signals to look at, not proof of cheating: leaving the tab can mean anything from a notification to looking something up.

**Score** = slides solved without "Show answer", out of 35. Wrong tries don't cost points, but they're counted.

### Setup (about 15 minutes, once)

1. **Make the sheet.** Create a Google Sheet (e.g. "instaDB scores"), then **Extensions → Apps Script**. Replace the code with [`apps-script/Code.gs`](apps-script/Code.gs).
2. **Make a sign-in client ID.** In [Google Cloud Console](https://console.cloud.google.com/), pick or create a project:
   - **APIs & Services → OAuth consent screen:** choose **Internal** if the project belongs to your university's Google Workspace (only university accounts can sign in). Otherwise choose **External** and publish the app; it only asks for name and email, so Google doesn't need to review it.
   - **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.** Under **Authorized JavaScript origins**, add `https://<your-username>.github.io`. No redirect URIs are needed. Copy the client ID.
3. **Fill in the script's settings** at the top of `Code.gs`: `CLIENT_ID` (from step 2). `ALLOWED_DOMAINS` is already set to the two Rishihood domains. Save.
4. **Deploy the script.** **Deploy → New deployment → Web app**, with **Execute as: Me** and **Who has access: Anyone**. Authorize it, then copy the **Web app URL** (ends in `/exec`). "Anyone" is needed because the site calls the script without Google cookies; the script itself only accepts verified sign-ins from your domain.
5. **Fill in [`js/config.js`](js/config.js):** `googleClientId` and `scriptUrl` (`allowedDomains` is already set). Commit and push.
6. **Test it:** open the site, sign in, answer one slide, and check that a row appears in **Scores**.

When you change `Code.gs` later, use **Deploy → Manage deployments → Edit → New version**, so the URL stays the same.

### It doesn't break the deck

- With `js/config.js` left empty, the deck runs as plain practice, exactly as before.
- If Google sign-in can't load (offline, blocked by a network filter), students can still practise; the header says "Score not recorded".
- If the score sheet can't be reached, answers wait in the browser and are sent when it's back ("Offline: will retry").
- Sign-ins last about an hour. If one runs out mid-class, the header asks the student to sign in again; nothing they did in the meantime is lost.
- `requireSignIn: true` (the default) asks students to sign in before the first question. Set it to `false` to let them start without signing in.

### Limits to know

- The score is reported by the student's browser. The script checks who is signing in and recalculates the score from the list of slides solved, but a student who knows the browser's developer tools could fake that list. That's fine for practice; don't use it as an exam mark.
- Each answer is one request to Apps Script. A class of 100 students finishing the deck is a few thousand requests, well inside Apps Script's daily limits.
- The sheet stores students' university emails, names and answers. Share it only with people who should see marks.

## Try it locally

Open `index.html` in a browser. No build step is needed.

## Edit the story

All the story text and questions are in `js/story.js`. Each step has:

- `before`: the narrative and the task
- `mode` and its question:
  - `write`: `answer`, the expected query
  - `pick`: `code`, where `B("$answer", ["$wrong1", "$wrong2", "$wrong3"], { $wrong1: "why it's wrong" })` marks a blank and its chips
  - `choice`: `options`, a list of `{ code, ok: true }` or `{ code, why }`
  - `bug`: `broken`, the query to fix, plus `options` as in `choice`
  - `predict`: `query`, plus `options` of `{ text, ok: true }` or `{ text, why }`
- `hint`, `after` (shown once solved), and an optional `trapNote`

After editing, run the checks:

```bash
node test/engine.test.js   # engine behaviour against known results
node test/story.test.js    # runs the whole story, then every option and chip (add -v to list them)
node test/appsscript.test.js  # runs the score sheet script against a fake Google Sheet
```

The seed data in `js/data.js` is identical to the lab's `insta_seed.js`.

The story test also fails if a wrong option or chip gives exactly the same result as the right answer without a `why` note explaining the difference.

A typical run should take about 25 minutes (an estimate from the slide content, not a timed run): roughly 20 for a fast student and 35 for one who struggles.
