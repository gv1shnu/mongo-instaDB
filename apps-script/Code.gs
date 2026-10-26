/**
 * One Day on instaDB: score sheet backend (Google Apps Script web app).
 *
 * The slide deck sends each student's progress here after every answer.
 * This script checks the student's Google sign-in token, accepts only
 * accounts from the university domain, and writes:
 *   - "Scores":   one row per student, updated in place
 *   - "Attempts": one row per answer (right, wrong, or "Show answer")
 *
 * Setup: see "Score tracking" in the project README.
 */

// ---- settings: fill these in ----
const SETTINGS = {
  // OAuth client ID from Google Cloud (the same one as in js/config.js)
  CLIENT_ID: "",
  // Only accounts from this domain are accepted, e.g. "university.edu"
  ALLOWED_DOMAIN: "",
  // Leave empty when this script is bound to the sheet (Extensions → Apps Script)
  SPREADSHEET_ID: "",
};

const SCORES_HEADERS = ["Email", "Name", "Score", "Out of", "Solved", "First try", "Answers shown", "Wrong tries",
  "Current slide", "Finished", "First seen", "Last update", "Solved slides", "Shown slides"];
const ATTEMPTS_HEADERS = ["Time", "Email", "Slide", "Topic", "Result", "Answer given", "Event id"];

function doGet() {
  return json_({ ok: true, service: "instadb-scores" });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const user = verifyToken_(body.idToken);
    const summary = summarize_(body);
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      writeScore_(user, summary);
      writeAttempts_(user, body.events);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true, score: summary.score, outOf: summary.outOf });
  } catch (err) {
    return json_({ ok: false, code: err.code || 500, error: String(err.message || err) });
  }
}

// ---- sign-in check ----
function authError_(msg) { const e = new Error(msg); e.code = 401; return e; }

function verifyToken_(token) {
  if (!SETTINGS.CLIENT_ID || !SETTINGS.ALLOWED_DOMAIN) throw new Error("The script's SETTINGS are not filled in.");
  if (!token || typeof token !== "string") throw authError_("Not signed in.");
  const cache = CacheService.getScriptCache();
  const key = "tok:" + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);

  const res = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw authError_("Your sign-in has expired. Sign in again.");
  const c = JSON.parse(res.getContentText());
  const domain = SETTINGS.ALLOWED_DOMAIN.toLowerCase();
  const email = String(c.email || "").toLowerCase();
  if (c.aud !== SETTINGS.CLIENT_ID) throw authError_("This sign-in wasn't made for this app.");
  if (["accounts.google.com", "https://accounts.google.com"].indexOf(c.iss) < 0) throw authError_("Unknown sign-in issuer.");
  if (String(c.email_verified) !== "true") throw authError_("Your Google email isn't verified.");
  if (Number(c.exp) * 1000 < Date.now()) throw authError_("Your sign-in has expired. Sign in again.");
  if (String(c.hd || "").toLowerCase() !== domain && !email.endsWith("@" + domain)) throw authError_("Use your university account (@" + domain + ").");

  const user = { email: email, name: String(c.name || "") };
  const ttl = Math.min(3000, Math.floor(Number(c.exp) - Date.now() / 1000) - 30);
  if (ttl > 60) cache.put(key, JSON.stringify(user), ttl);
  return user;
}

// ---- score ----
// The browser sends its progress; the score is recomputed here from the slide lists.
function summarize_(body) {
  const outOf = Math.max(1, Math.min(200, parseInt(body.slides, 10) || 1));
  const slides = (list) => (Array.isArray(list) ? list : [])
    .map((n) => parseInt(n, 10)).filter((n) => n >= 0 && n < outOf)
    .filter((n, k, a) => a.indexOf(n) === k).sort((a, b) => a - b);
  const solved = slides(body.solved), shown = slides(body.revealed), firstTry = slides(body.firstTry);
  let wrong = 0;
  if (body.wrong && typeof body.wrong === "object") Object.keys(body.wrong).forEach((k) => { wrong += Math.max(0, Math.min(1000, parseInt(body.wrong[k], 10) || 0)); });
  const at = Math.max(0, Math.min(outOf + 1, parseInt(body.at, 10) || 0));
  return {
    outOf: outOf,
    score: solved.filter((n) => shown.indexOf(n) < 0).length,
    solved: solved, shown: shown,
    firstTry: firstTry.filter((n) => solved.indexOf(n) >= 0 && shown.indexOf(n) < 0).length,
    wrong: wrong,
    at: at,
    finished: solved.length === outOf,
  };
}

function book_() {
  return SETTINGS.SPREADSHEET_ID ? SpreadsheetApp.openById(SETTINGS.SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}
function sheet_(name, headers) {
  const book = book_();
  let sh = book.getSheetByName(name);
  if (!sh) {
    sh = book.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sh;
}

function writeScore_(user, s) {
  const sh = sheet_("Scores", SCORES_HEADERS);
  const now = new Date();
  const found = sh.getRange("A:A").createTextFinder(user.email).matchEntireCell(true).findNext();
  const row = found ? found.getRow() : sh.getLastRow() + 1;
  const firstSeen = found ? sh.getRange(row, 11).getValue() || now : now;
  const list = (a) => a.map((n) => n + 1).join(", ");
  sh.getRange(row, 1, 1, SCORES_HEADERS.length).setValues([[
    text_(user.email, 200), text_(user.name, 200), s.score, s.outOf, s.solved.length, s.firstTry, s.shown.length, s.wrong,
    s.at, s.finished ? "yes" : "no", firstSeen, now, list(s.solved), list(s.shown),
  ]]);
}

function writeAttempts_(user, events) {
  if (!Array.isArray(events) || !events.length) return;
  const sh = sheet_("Attempts", ATTEMPTS_HEADERS);
  const rows = events.slice(0, 100).map((ev) => [
    new Date(Number(ev.t) || Date.now()),
    text_(user.email, 200),
    (parseInt(ev.slide, 10) || 0) + 1,
    text_(ev.op, 60),
    ["solved", "wrong", "shown"].indexOf(ev.kind) >= 0 ? ev.kind : "other",
    text_(ev.answer, 300),
    text_(ev.id, 40),
  ]);
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, ATTEMPTS_HEADERS.length).setValues(rows);
}

// Sheets runs text that starts with = + - @ as a formula; store students' text as plain text.
function text_(v, max) {
  const t = String(v == null ? "" : v).slice(0, max);
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
