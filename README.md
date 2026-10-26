# One Day on instaDB

A story-driven, fill-in-the-blank walkthrough of MongoDB CRUD (Lecture 2) and query and update operators (Lecture 3), built on the instaDB seed data used in the lab.

Students follow instaDB through one day in 35 steps. A new user, Meera, signs up at 7 a.m., and her account and posts carry through the rest of the day.

- **✍️ Write steps (CRUD + cursor):** students type the whole query from scratch. It's checked by running it and comparing the result with the expected one, so equivalent answers pass (fields in any order, cursor calls chained in any order).
- **🧩 Operator steps:** the query is given and students fill in the `$` operators.

A phone-style preview beside the code re-renders the app from whatever the query returned or changed, wrong answers included. Changes carry forward from step to step.

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
- Write steps are checked by result; operator blanks are checked by their text. Every query is also run, and its output is shown in a mongosh-style terminal, including real error messages for mistakes such as unknown operators.
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

All the story text and blanks are in `js/story.js`. Each step has:

- `before`: the narrative and the task
- `code`: the query, where `B("...")` marks a blank and its answer
- `hint`, `after` (shown once solved), and an optional `trapNote`

After editing, run the checks:

```bash
node test/engine.test.js   # engine behaviour against known results
node test/story.test.js    # runs the whole story and prints each step's result
```

The seed data in `js/data.js` is identical to the lab's `insta_seed.js`.
