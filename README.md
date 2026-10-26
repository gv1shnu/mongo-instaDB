# One Day on instaDB

A story-driven slide deck of MongoDB CRUD (Lecture 2) and query and update operators (Lecture 3), built on the instaDB seed data used in the lab.

Students follow instaDB through one day in 35 slides, one question per slide, with **Prev / Next**. A new user, Meera, signs up at 7 a.m., and her account and posts carry through the rest of the day. A phone-style preview stays beside every slide and re-renders the app from whatever the query returned or changed, wrong answers included.

| Slide type | Count | What the student does |
|---|---|---|
| ✍️ write the query | 6 | Types the whole CRUD query. Checked by running it, so equivalent answers pass (fields in any order). |
| 🧩 pick the operator | 21 | Taps a chip for each blank in a given query. |
| ☑️ choose the query | 4 | Picks the query that does the task out of four. |
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
- Each slide has its own address (`#12`), so a teacher can project a slide and students can open the same one. The jump menu goes to any slide; ← → move between slides and 1–4 pick an option.
- On a phone-sized screen, the app preview becomes a bottom sheet that slides up after each answer.
- Progress is saved in the student's browser (localStorage). Nothing is collected or graded.

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
```

The seed data in `js/data.js` is identical to the lab's `insta_seed.js`.

The story test also fails if a wrong option or chip gives exactly the same result as the right answer without a `why` note explaining the difference.
