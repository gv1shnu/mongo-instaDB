# One Day on instaDB

A story-driven way to learn MongoDB CRUD and query and update operators: one day in the life of instaDB, a small Instagram-style app, told in 24 interactive slides.

**Play it:** https://www.vishnugandarapu.in/mongo-instaDB (no sign-up, runs entirely in your browser)

I built it as a lab exercise for the MongoDB course at Rishihood University, where students in four sections took it as a timed, scored exam with Google sign-in and a class leaderboard. After the lab, the exam features (sign-in and score sheet) were switched off, and it's now open to anyone as practice. They're still in the code and come back by filling in `js/config.js`.

**What makes it different**
- **A story, not a worksheet.** Every query moves the same day forward, from a 7 a.m. sign-up to a midnight cleanup, and each change carries into the next slide.
- **Every answer really runs.** A small MongoDB engine written for this project runs each query in the browser, wrong answers included, with MongoDB's behaviour for the tricky cases (missing fields with `$ne`/`$not`, matching inside arrays).
- **You see what your query did.** A phone-style preview redraws the app from the result: the profile grid, the Explore page, +100 likes, a new blue tick, deleted posts.
- **Questions stand on their own.** Every slide gives all the facts its options rely on, and an automated test fails if an option brings in a name or number the question doesn't give.

You follow instaDB through one day in 24 slides, one question per slide, with **Prev / Next**. A new user, Meera, signs up at 7 a.m., and her account and posts carry through the rest of the day. A phone-style preview stays beside every slide and re-renders the app from whatever the query returned or changed, wrong answers included.

| Slide type | Count | What the student does |
|---|---|---|
| ✍️ write the query | 5 | Types the whole CRUD query. Checked by running it, so equivalent answers pass (fields in any order). Given documents have a Copy button, so the time goes into the query, not retyping fields. |
| 🧩 pick the operator | 12 | Taps a chip for each blank in a given query. |
| ☑️ choose the query | 3 | Picks the query that does the task out of four. |
| 🐞 fix the bug | 2 | Sees a broken query and what mongosh said, then picks the fix. |
| 🔮 predict | 2 | Predicts what a given query will do, then watches it run. |

The slides cover only what every section was taught: Chapter 2 of the [Atlas Shell Lab](https://edusatyaki.github.io/MongoDB-Atlas-Shell-Lab/) (CRUD) and Chapter 3 up to the field update operators, without regex and `$currentDate`. `$min` and `$max` were taught in theory only, so they're pick-the-operator slides.

Every option is a real query: what the student submits runs on the data and shows up on the phone and in the terminal.

**How it plays**
- **One try per slide.** The student picks or types an answer and presses **Submit**; the slide then locks with ✓ or ✗. Next unlocks once the slide is answered, and slides can't be skipped.
- **Points:** 10 for a right answer, 5 if the slide's hint was used, 0 if wrong. 24 slides, 240 points.
- **A timer on every slide:** 2 min for a write slide, 1 min for a fill-in-the-blank, 65 s for an MCQ (at most 29 min 35 s for all 24). When it runs out, whatever the student has selected or typed is submitted (with nothing selected, the slide counts as wrong). After every submit, whether the student clicked Submit or time ran out, the result shows for 3 seconds and then the deck moves to the next slide by itself. The deadline is set when the slide first opens, so going back or reloading doesn't reset it. Change the times in `TIME` at the top of `js/app.js`.
- **No solutions until the end.** While the exam is in progress, a wrong answer only says it's wrong. Once all 24 slides are answered, the results slide shows:
  - the score
  - a breakdown by question type and by part of the day
  - with score tracking on, the class leaderboard: top 10 by first name, plus the student's own rank
  - every solution: the full question, the student's answer and why it was wrong, the solution with its real output, why the right option is right, and what the query does

  Going back to a slide then shows its solution too.
- **Play again.** With score tracking off, the results slide has a **Play again** button that clears your answers on this device. With score tracking on (as in the lab), there's no restart and the score sheet keeps each student's first answer per slide.
- The answers are hidden on screen, but they're in the page's code. A student who knows the browser's developer tools could find them. That was fine for a lab exam; for anything higher-stakes, marking would have to move to the server.

**Covers:**
- **Create:** `insertOne`, `insertMany`
- **Read:** `find`
- **Update:** `updateOne`, `updateMany`, upsert (`{ upsert: true }`)
- **Delete:** `deleteOne`, `deleteMany`
- **Comparison:** `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`
- **Logical:** `$and`, `$or`, `$not`, `$nor`, `$exists`
- **Array queries:** `$all`, `$elemMatch`
- **Field updates:** `$set`, `$unset`, `$rename`, `$inc`, `$mul`, `$min`, `$max`

The engine also supports regex, `$nin`, the array update operators, positional `$`, `$currentDate`, `replaceOne`, `findOne` and `sort`/`skip`/`limit`, so those topics can come back as slides once they've been taught.

## How it works

- No server, no database, no install. A small query engine (`js/engine.js`) runs MongoDB-style queries in the browser with MongoDB's behaviour for the cases in the lab: missing fields with `$ne`/`$not`, matching inside arrays, and sort → skip → limit order. `$currentDate` uses the time on each step's phone screen, so answers can be checked.
- `js/phone.js` draws the preview: profile grids, Explore, people lists, ranked feeds, update highlights (+100 likes, added/removed interests, added/removed/changed fields, "just verified") and deleted posts.
- Write slides are checked by result; the other slides by the option picked. Every query is also run, and its output is shown in a mongosh-style terminal, including real error messages for mistakes such as unknown operators.
- Each slide has its own address (`#12`), so a teacher can project a slide and students can open the same one.
- On a phone-sized screen, the app preview becomes a bottom sheet that slides up after each answer.
- Progress is saved in the student's browser (localStorage), one copy per signed-in student, so a shared lab computer keeps students apart.
- Score tracking is optional (see below) and off on the live site, so nothing is collected.

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

Off on the live site. When it's on, students sign in with their **university Google account**, and each one's score lands in a Google Sheet you own. In the lab, only `@nst.rishihood.edu.in` (students) and `@rishihood.edu.in` (staff) accounts could sign in; personal Gmail and any other domain are refused. Staff who sign in to test get a row in the sheet too.

**What you get in the sheet**
- **Scores:** one row per student: score (out of 240), right, wrong, hints used, slides answered, the slide they're on, finished or not, first seen, last update and when they finished. Then **Tab switches**, **Time away (s)**, and **Answers**, where the script keeps each answer.
- **Attempts:** one row per answer (right or wrong, and what they picked, for example `C: db.posts.insertMany(...)`), per hint used, and per slide that timed out with no answer. This shows which wrong answers are common.
  It also gets a row each time a student:
  - **left tab:** switched to another tab or minimised the browser, with how long they were away
  - **left window:** put another app or window in front for more than 3 seconds

**About the activity tracking**
- Students are told on the sign-in panel that switching tabs or windows is recorded.
- Only signed-in students are tracked.
- The counts never go down: clearing the browser doesn't reset them in the sheet.
- These are signals to look at, not proof of cheating: leaving the tab can mean anything from a notification to looking something up.

**Score** = 10 per right answer, 5 if the hint was used, 0 if wrong; out of 240.

**The first answer counts.** The script keeps the first answer it receives for each slide. Clearing the browser, signing in on another device, or answering again can't change it. Signing in elsewhere brings a student's answers back. The leaderboard lists only students (`@nst.rishihood.edu.in`) who have answered every slide of the current version of the deck. Ties share a rank. Changing the slides gives the deck a new version name (`DECK` in `js/app.js`): answers saved for an older version don't carry over.

If your sheet has a **Scores** tab from an earlier version, the script renames it to "Scores (old …)" and starts a fresh one; nothing is deleted.

### Setup (about 15 minutes, once)

1. **Make the sheet.** Create a Google Sheet (e.g. "instaDB scores"), then **Extensions → Apps Script**. Replace the code with [`apps-script/Code.gs`](apps-script/Code.gs).
2. **Make a sign-in client ID.** In [Google Cloud Console](https://console.cloud.google.com/), pick or create a project:
   - **APIs & Services → OAuth consent screen:** choose **Internal** if the project belongs to your university's Google Workspace (only university accounts can sign in). Otherwise choose **External** and publish the app; it only asks for name and email, so Google doesn't need to review it.
   - **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.** Under **Authorized JavaScript origins**, add `https://<your-username>.github.io`. No redirect URIs are needed. Copy the client ID.
3. **Fill in the script's settings** at the top of `Code.gs`: `CLIENT_ID` (from step 2). `ALLOWED_DOMAINS` is already set to the two Rishihood domains. Save.
4. **Deploy the script.** **Deploy → New deployment → Web app**, with **Execute as: Me** and **Who has access: Anyone**. Authorize it, then copy the **Web app URL** (ends in `/exec`). "Anyone" is needed because the site calls the script without Google cookies; the script itself only accepts verified sign-ins from your domain.
5. **Fill in [`js/config.js`](js/config.js):** `googleClientId`, `scriptUrl`, `allowedDomains` (for example `["nst.rishihood.edu.in", "rishihood.edu.in"]`) and `requireSignIn: true`. Commit and push.
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

A typical run should take about 20 minutes (an estimate from the slide content, not a timed run): roughly 15 for a fast student and 25–30 for one who struggles.
