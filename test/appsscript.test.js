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
    setName(n) { delete sheets[sh.name]; sh.name = n; sheets[n] = sh; },
    getLastRow: () => rows.length,
    getDataRange: () => ({ getValues: () => rows.map((r) => r.slice()) }),
    getRange(a, b, nr = 1, nc = 1) {
      if (a === "A:A") return { createTextFinder: (t) => ({ matchEntireCell: () => ({ findNext: () => { const k = rows.findIndex((r) => r[0] === t); return k < 0 ? null : { getRow: () => k + 1 }; } }) }) };
      const row = a, col = b;
      return {
        setFontWeight() {},
        getValue: () => { const v = (rows[row - 1] || [])[col - 1]; return v === undefined ? "" : v; },
        getValues: () => Array.from({ length: nr }, (_, r) => Array.from({ length: nc }, (_, c) => { const v = (rows[row - 1 + r] || [])[col - 1 + c]; return v === undefined ? "" : v; })),
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
  Utilities: { DigestAlgorithm: { SHA_256: 1 }, computeDigest: (a, s) => [...crypto.createHash("sha256").update(s).digest()], base64EncodeWebSafe: (b) => Buffer.from(b).toString("base64url"), formatDate: () => "2026-10-27 09:00" },
  UrlFetchApp: { fetch: (url) => { const t = decodeURIComponent(url.split("id_token=")[1]); const c = tokenInfo[t]; return { getResponseCode: () => (c ? 200 : 400), getContentText: () => JSON.stringify(c || { error: "invalid_token" }) }; } },
  ContentService: { MimeType: { JSON: "json" }, createTextOutput: (s) => ({ setMimeType: () => JSON.parse(s) }) },
  JSON, Date, Math, String, Number, Object, Array, Error, parseInt, encodeURIComponent,
};
vm.createContext(ctx);
const src = fs.readFileSync(__dirname + "/../apps-script/Code.gs", "utf8")
  .replace(/CLIENT_ID: "[^"]*"/, 'CLIENT_ID: "client-1"');
vm.runInContext(src, ctx);

const exp = Math.floor(Date.now() / 1000) + 3600;
const claims = (over) => Object.assign({ aud: "client-1", iss: "https://accounts.google.com", email: "asha@nst.rishihood.edu.in", email_verified: "true", hd: "nst.rishihood.edu.in", exp: String(exp), name: "Asha Rao" }, over);
const student = (name, n) => claims({ email: `${name.toLowerCase()}${n}@nst.rishihood.edu.in`, name });
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
const S = 35;
const ans = (list) => Object.fromEntries(list.map(([n, ok, given]) => [n, { ok, given: given || "x" }]));

// ---- sign-in ----
const base = { slides: S, at: 3, answers: ans([[0, true], [1, false]]) };
expect("health check", ctx.doGet(), { ok: true, service: "instadb-scores" });
expect("no token → 401", post(base).code, 401);
expect("bad token → 401", post(Object.assign({ idToken: "nope" }, base)).code, 401);
expect("personal Gmail → 401", post(Object.assign({ idToken: "gmail" }, base)).code, 401);
expect("token for another app → 401", post(Object.assign({ idToken: "otherApp" }, base)).code, 401);
expect("expired token → 401", post(Object.assign({ idToken: "old" }, base)).code, 401);
expect("unverified email → 401", post(Object.assign({ idToken: "unverified" }, base)).code, 401);
expect("look-alike domain is refused", post(Object.assign({ idToken: "lookalike" }, base)).code, 401);
expect("a different sub-domain is refused", post(Object.assign({ idToken: "otherSub" }, base)).code, 401);
expect("nothing written for rejected students", Object.keys(sheets), []);

// ---- scoring: 10 right, 5 right after hint, 0 wrong ----
const row = (email = "asha@nst.rishihood.edu.in") => sheets.Scores.rows.find((x) => x[0] === email);
let r = post({ idToken: "good", slides: S, at: 4, hints: [2], answers: ans([[0, true, "$gt"], [1, false, "B: ..."], [2, true]]),
  events: [{ id: "e1", t: Date.now(), slide: 1, op: "insertMany()", kind: "wrong", answer: "C: db.posts.insertMany(...)" }, { id: "e2", slide: 2, op: "find()", kind: "hint" }] });
expect("score: 10 + 0 + 5", [r.ok, r.score, r.outOf], [true, 15, 350]);
expect("score row", row().slice(0, 10), ["asha@nst.rishihood.edu.in", "Asha Rao", 15, 350, 2, 1, 1, 3, 4, "no"]);
expect("answers come back to the browser", r.answers, { 0: { ok: true, given: "$gt" }, 1: { ok: false, given: "B: ..." }, 2: { ok: true, given: "x" } });
post({ idToken: "good", slides: S, events: [{ id: "t1", slide: 5, op: "$gt", kind: "timeout" }] });
expect("time-outs are logged", sheets.Attempts.rows.at(-1).slice(2, 5), [6, "$gt", "timeout"]);
sheets.Attempts.rows.splice(-1, 1);
expect("attempts logged: wrong and hint", sheets.Attempts.rows.slice(1).map((x) => [x[2], x[4], x[5]]), [[2, "wrong", "C: db.posts.insertMany(...)"], [3, "hint", ""]]);

r = post({ idToken: "good", slides: S, at: 4, answers: ans([[1, true, "changed my mind"], [3, true]]) });
expect("the first answer to a slide is kept", r.answers[1], { ok: false, given: "B: ..." });
expect("new slides still count", [r.score, row()[7]], [25, 4]);
r = post({ idToken: "good", slides: S, at: 0, answers: {}, hints: [] });
expect("clearing the browser can't erase answers or hints", [r.score, Object.keys(r.answers).length, r.hints], [25, 4, [2]]);
expect("junk answers are ignored", post({ idToken: "good", slides: S, answers: { "-1": { ok: true }, 99: { ok: true }, x: { ok: true }, 5: "yes", 6: { ok: "true" } } }).answers[6], { ok: false, given: "" });

// ---- finishing and the leaderboard ----
const all = (ok) => ans(Array.from({ length: S }, (_, n) => [n, ok(n)]));
const finish = (tok, ok, hints = []) => post({ idToken: tok, slides: S, at: 36, answers: all(ok), hints, board: true });
tokenInfo.s1 = student("Meera", 1); tokenInfo.s2 = student("Kabir", 2); tokenInfo.s3 = student("Riya", 3); tokenInfo.s4 = student("Dev", 4);
r = finish("s1", () => true);
expect("full marks", [r.score, r.finished, r.board.rank, r.board.of], [350, true, 1, 1]);
expect("finished at is set", row("meera1@nst.rishihood.edu.in")[12] instanceof Date, true);
finish("s2", (n) => n % 2 === 0, [0]);           // 18 right, one with a hint: 175
finish("s3", (n) => n % 2 === 0, [0]);           // same score, finished later
r = finish("s4", (n) => n < 30);                 // 300
expect("ranked by score", r.board.top.map((t) => [t.rank, t.name, t.score]), [[1, "Meera", 350], [2, "Dev", 300], [3, "Kabir", 175], [3, "Riya", 175]]);
expect("your rank and the class average", [r.board.rank, r.board.of, r.board.average], [2, 4, 250]);
expect("you are marked", r.board.top.filter((t) => t.you).map((t) => t.name), ["Dev"]);
expect("no leaderboard before finishing", post({ idToken: "good", slides: S, board: true }).board, null);
r = finish("teacher", () => true);
expect("staff aren't ranked", [r.board.rank, r.board.of, r.board.note], [null, 4, "Only student accounts are ranked."]);
for (let k = 5; k < 17; k++) { tokenInfo["x" + k] = student("Stu", k); finish("x" + k, (n) => n < k); }
expect("top 10 only", finish("s4", () => true).board.top.length, 10);
expect("a retake can't raise the score", row("dev4@nst.rishihood.edu.in")[2], 300);

// ---- a new version of the deck starts fresh, and is ranked on its own ----
tokenInfo.v2 = student("Zara", 50);
post({ idToken: "v2", slides: 35, deck: "", answers: ans([[0, false], [1, false]]) });
r = post({ idToken: "v2", slides: 24, deck: "common-24", answers: ans(Array.from({ length: 24 }, (_, n) => [n, true])), board: true });
expect("answers from an older deck don't carry over", [r.score, r.outOf, r.answers[0].ok], [240, 240, true]);
expect("only runs of the same deck are ranked together", [r.board.rank, r.board.of, r.board.top.map((t) => t.name)], [1, 1, ["Zara"]]);
r = post({ idToken: "v2", slides: 24, deck: "common-24", answers: ans([[0, false]]) });
expect("within the same deck, the first answer still counts", r.answers[0].ok, true);

// ---- activity and safety ----
const act = (a) => post({ idToken: "teacher", slides: S, activity: a });
const tr = () => row("vishnu@rishihood.edu.in");
act({ tabs: 3, away: 40 });
expect("activity columns", tr().slice(13, 15), [3, 40]);
act({ tabs: 0, away: 0 });
expect("activity counts never go down", tr().slice(13, 15), [3, 40]);
post({ idToken: "evil", slides: S, events: [{ slide: 0, kind: "wrong", answer: "=IMPORTXML(1)" }] });
expect("text that looks like a formula is stored as text", [sheets.Scores.rows.at(-1)[0], sheets.Scores.rows.at(-1)[1], sheets.Attempts.rows.at(-1)[5]], ["'=cmd@nst.rishihood.edu.in", "'=HYPERLINK(\"x\")", "'=IMPORTXML(1)"]);
expect("teacher's @rishihood.edu.in account is accepted", post({ idToken: "teacher", slides: S }).ok, true);
expect("student whose Workspace domain is rishihood.edu.in is accepted", post({ idToken: "sameOrg", slides: S }).ok, true);

// ---- an older Scores sheet is kept aside, not overwritten ----
delete sheets.Scores;
const old = fakeSheet("Scores"); sheets.Scores = old;
old.rows.push(["Email", "Name", "Score", "Out of", "Solved"], ["x@nst.rishihood.edu.in", "X", 3, 35, 3]);
post({ idToken: "good", slides: S });
expect("old sheet renamed, new one started", [Object.keys(sheets).sort(), sheets.Scores.rows[0][15], sheets["Scores (old 2026-10-27 09:00)"].rows[1][0]],
  [["Attempts", "Scores", "Scores (old 2026-10-27 09:00)"], "Answers", "x@nst.rishihood.edu.in"]);

console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED");
process.exit(fail ? 1 : 0);
