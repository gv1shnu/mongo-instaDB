// Runs apps-script/Code.gs in Node against fake Google services (sheet, cache, token check).
const fs = require("fs"), vm = require("vm"), crypto = require("crypto");
let fail = 0;
const expect = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log((ok ? "ok  " : "FAIL") + "  " + label + (ok ? "" : `  =>  ${JSON.stringify(got)}  expected ${JSON.stringify(want)}`));
};

// ---- fakes ----
function fakeSheet(name) {
  const rows = [];
  const sh = {
    name, rows,
    appendRow: (r) => rows.push(r.slice()),
    setFrozenRows() {},
    getLastRow: () => rows.length,
    getRange(a, b, nr, nc) {
      if (a === "A:A") return { createTextFinder: (t) => ({ matchEntireCell: () => ({ findNext: () => { const k = rows.findIndex((r) => r[0] === t); return k < 0 ? null : { getRow: () => k + 1 }; } }) }) };
      const row = a, col = b;
      return {
        setFontWeight() {},
        getValue: () => (rows[row - 1] || [])[col - 1],
        setValues(vals) { vals.forEach((v, k) => { rows[row - 1 + k] = rows[row - 1 + k] || []; v.forEach((x, j) => (rows[row - 1 + k][col - 1 + j] = x)); }); },
      };
    },
  };
  return sh;
}
const sheets = {};
let tokenInfo = {};
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = fakeSheet(n)) }) },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Utilities: { DigestAlgorithm: { SHA_256: 1 }, computeDigest: (a, s) => [...crypto.createHash("sha256").update(s).digest()], base64EncodeWebSafe: (b) => Buffer.from(b).toString("base64url") },
  UrlFetchApp: { fetch: (url) => { const t = decodeURIComponent(url.split("id_token=")[1]); const c = tokenInfo[t]; return { getResponseCode: () => (c ? 200 : 400), getContentText: () => JSON.stringify(c || { error: "invalid_token" }) }; } },
  ContentService: { MimeType: { JSON: "json" }, createTextOutput: (s) => ({ setMimeType: () => JSON.parse(s) }) },
  JSON, Date, Math, String, Number, Object, Array, Error, parseInt, encodeURIComponent,
};
vm.createContext(ctx);
const src = fs.readFileSync(__dirname + "/../apps-script/Code.gs", "utf8")
  .replace(/CLIENT_ID: "[^"]*"/, 'CLIENT_ID: "client-1"');
vm.runInContext(src, ctx);

const exp = Math.floor(Date.now() / 1000) + 3600;
const claims = (over) => Object.assign({ aud: "client-1", iss: "https://accounts.google.com", email: "asha@nst.rishihood.edu.in", email_verified: "true", hd: "nst.rishihood.edu.in", exp: String(exp), name: "Asha" }, over);
tokenInfo = {
  good: claims(), gmail: claims({ email: "asha@gmail.com", hd: undefined }), otherApp: claims({ aud: "someone-else" }),
  old: claims({ exp: String(Math.floor(Date.now() / 1000) - 10) }), unverified: claims({ email_verified: "false" }),
  evil: claims({ email: "=cmd@nst.rishihood.edu.in", name: "=HYPERLINK(\"x\")" }),
  teacher: claims({ email: "vishnu@rishihood.edu.in", hd: "rishihood.edu.in", name: "Vishnu" }),
  sameOrg: claims({ email: "ravi@nst.rishihood.edu.in", hd: "rishihood.edu.in" }),
  lookalike: claims({ email: "x@notrishihood.edu.in", hd: "notrishihood.edu.in" }),
  otherSub: claims({ email: "x@alumni.rishihood.edu.in", hd: "alumni.rishihood.edu.in" }),
};
const post = (body) => ctx.doPost({ postData: { contents: JSON.stringify(body) } });
const base = { slides: 35, at: 6, solved: [0, 1, 2, 4], firstTry: [0, 2, 4], revealed: [4], wrong: { 1: 2, 3: 1 } };

expect("health check", ctx.doGet(), { ok: true, service: "instadb-scores" });
expect("no token → 401", post(base).code, 401);
expect("bad token → 401", post(Object.assign({ idToken: "nope" }, base)).code, 401);
expect("personal Gmail → 401", post(Object.assign({ idToken: "gmail" }, base)).code, 401);
expect("token for another app → 401", post(Object.assign({ idToken: "otherApp" }, base)).code, 401);
expect("expired token → 401", post(Object.assign({ idToken: "old" }, base)).code, 401);
expect("unverified email → 401", post(Object.assign({ idToken: "unverified" }, base)).code, 401);
expect("nothing written for rejected students", Object.keys(sheets), []);

const r = post(Object.assign({ idToken: "good", events: [{ id: "e1", t: Date.now(), slide: 1, op: "insertMany()", kind: "wrong", answer: "C: db.posts.insertMany(...)" }] }, base));
expect("good token → ok, score = solved minus shown", [r.ok, r.score, r.outOf], [true, 3, 35]);
const row = () => sheets.Scores.rows.find((x) => x[0] === "asha@nst.rishihood.edu.in");
expect("score row", row().slice(0, 10), ["asha@nst.rishihood.edu.in", "Asha", 3, 35, 4, 2, 1, 3, 6, "no"]);
expect("solved and shown slides are 1-based", row().slice(12, 14), ["1, 2, 3, 5", "5"]);
expect("attempt logged", sheets.Attempts.rows[1].slice(1, 7), ["asha@nst.rishihood.edu.in", 2, "insertMany()", "wrong", "C: db.posts.insertMany(...)", "e1"]);

post(Object.assign({ idToken: "good" }, base, { solved: [...Array(35).keys()], at: 36 }));
expect("same student updates one row", sheets.Scores.rows.length, 2);
expect("finished, score 34 (one shown)", [row()[2], row()[9]], [34, "yes"]);
expect("first seen is kept", row()[10] instanceof Date, true);

expect("junk slide numbers are ignored", post(Object.assign({ idToken: "good" }, base, { solved: [0, 0, -1, 99, "x", 3] })).score, 2);
post(Object.assign({ idToken: "evil", events: [{ slide: 0, kind: "wrong", answer: "=IMPORTXML(1)" }] }, base));
expect("text that looks like a formula is stored as text", [sheets.Scores.rows.at(-1)[0], sheets.Scores.rows.at(-1)[1], sheets.Attempts.rows.at(-1)[5]], ["'=cmd@nst.rishihood.edu.in", "'=HYPERLINK(\"x\")", "'=IMPORTXML(1)"]);

// tab and window switches
const SCORES_OLD_HEADERS = ["Email", "Name", "Score", "Out of", "Solved", "First try", "Answers shown", "Wrong tries", "Current slide", "Finished", "First seen", "Last update", "Solved slides", "Shown slides"];
const act = (a, events) => post(Object.assign({ idToken: "teacher", events }, base, { activity: a }));
const teacherRow = () => sheets.Scores.rows.find((x) => x[0] === "vishnu@rishihood.edu.in");
act({ tabs: 3, away: 40 }, [{ slide: 4, op: "$gt", kind: "left tab", answer: "away 12 s" }, { slide: -1, op: "intro", kind: "left window", answer: "away 4 s" }]);
expect("activity columns", teacherRow().slice(14), [3, 40]);
expect("column titles", sheets.Scores.rows[0].slice(14), ["Tab switches", "Time away (s)"]);
act({ tabs: 0, away: 0 });
expect("a restart can't lower the counts", teacherRow().slice(14), [3, 40]);
act({ tabs: 5, away: "x", copies: 7 });
expect("counts go up, junk is ignored", teacherRow().slice(14), [5, 40]);
const logged = sheets.Attempts.rows.slice(-2).map((x) => [x[2], x[4], x[5]]);
expect("tab and window switches are logged (intro is slide 0)", logged, [[5, "left tab", "away 12 s"], [0, "left window", "away 4 s"]]);
act({ tabs: 5, away: 40 }, [{ slide: 0, kind: "paste", answer: "x" }]);
expect("copy/paste events are no longer a kind of their own", sheets.Attempts.rows.at(-1)[4], "other");
{ const old = fakeSheet("Scores"); old.rows.push(SCORES_OLD_HEADERS, ["x@nst.rishihood.edu.in"]); sheets.Scores = old; }
act({ tabs: 1, away: 1 });
expect("an older Scores sheet gets the new column titles", sheets.Scores.rows[0].length, 16);

expect("teacher's @rishihood.edu.in account is accepted", post(Object.assign({ idToken: "teacher" }, base)).ok, true);
expect("student whose Workspace domain is rishihood.edu.in is accepted", post(Object.assign({ idToken: "sameOrg" }, base)).ok, true);
expect("look-alike domain is refused", post(Object.assign({ idToken: "lookalike" }, base)).code, 401);
expect("a different sub-domain is refused", post(Object.assign({ idToken: "otherSub" }, base)).code, 401);

console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED");
process.exit(fail ? 1 : 0);
