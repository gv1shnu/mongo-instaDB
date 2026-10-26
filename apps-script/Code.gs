/**
 * One Day on instaDB: score sheet backend (Google Apps Script web app).
 *
 * The slide-deck exam sends each student's answers here as they go.
 * This script checks the student's Google sign-in token, accepts only
 * accounts from the university's email domains, and writes:
 *   - "Scores":   one row per student, updated in place. The first answer to
 *                 each slide is kept, so retaking can't change it.
 *   - "Attempts": one row per answer (right or wrong), hint, and tab or
 *                 window switch
 * Once a student has answered every slide, it also sends back the leaderboard.
 *
 * Setup: see "Score tracking" in the project README.
 */

// ---- settings: fill these in ----
const SETTINGS = {
  // OAuth client ID from Google Cloud (the same one as in js/config.js)
  CLIENT_ID: "597031381-es9guvfhndfq1e5qhjbe707d6b0ilp8q.apps.googleusercontent.com",
  // Only accounts from these email domains are accepted (exact match; sub-domains aren't included)
  ALLOWED_DOMAINS: ["nst.rishihood.edu.in", "rishihood.edu.in"],
  // Leave empty when this script is bound to the sheet (Extensions → Apps Script)
  SPREADSHEET_ID: "",
  // Points: a right answer, minus this much if the hint was used; wrong = 0
  POINTS: 10,
  HINT_COST: 5,
  // Only these accounts appear on the leaderboard (students, not staff)
  LEADERBOARD_DOMAINS: ["nst.rishihood.edu.in"],
  LEADERBOARD_TOP: 10,
};

const SCORES_HEADERS = ["Email", "Name", "Score", "Out of", "Right", "Wrong", "Hints used", "Answered",
  "Current slide", "Finished", "First seen", "Last update", "Finished at", "Tab switches", "Time away (s)", "Answers"];
const COL = { firstSeen: 11, finishedAt: 13, activity: 14, answers: 16 };
const ACTIVITY_KINDS = ["left tab", "left window"];
const ATTEMPTS_HEADERS = ["Time", "Email", "Slide", "Topic", "Result", "Answer given", "Event id"];

function doGet() {
  return json_({ ok: true, service: "instadb-scores" });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const user = verifyToken_(body.idToken);
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    let s, board = null;
    try {
      const sh = sheet_("Scores", SCORES_HEADERS);
      const found = sh.getRange("A:A").createTextFinder(user.email).matchEntireCell(true).findNext();
      const row = found ? found.getRow() : sh.getLastRow() + 1;
      s = summarize_(body, found ? stored_(sh.getRange(row, COL.answers).getValue()) : null);
      writeScore_(sh, row, !!found, user, s);
      writeAttempts_(user, body.events);
      if (body.board && s.finished) board = leaderboard_(sh, user.email, s.max);
    } finally {
      lock.releaseLock();
    }
    const answers = {};
    Object.keys(s.answers).forEach((n) => (answers[n] = { ok: s.answers[n].ok, given: s.answers[n].g }));
    return json_({ ok: true, score: s.score, outOf: s.max, answers: answers, hints: s.hints, finished: s.finished, board: board });
  } catch (err) {
    return json_({ ok: false, code: err.code || 500, error: String(err.message || err) });
  }
}

// ---- sign-in check ----
function authError_(msg) { const e = new Error(msg); e.code = 401; return e; }

function verifyToken_(token) {
  const domains = SETTINGS.ALLOWED_DOMAINS.map((d) => String(d).toLowerCase());
  if (!SETTINGS.CLIENT_ID || !domains.length) throw new Error("The script's SETTINGS are not filled in.");
  if (!token || typeof token !== "string") throw authError_("Not signed in.");
  const cache = CacheService.getScriptCache();
  const key = "tok:" + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);

  const res = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw authError_("Your sign-in has expired. Sign in again.");
  const c = JSON.parse(res.getContentText());
  const email = String(c.email || "").toLowerCase();
  if (c.aud !== SETTINGS.CLIENT_ID) throw authError_("This sign-in wasn't made for this app.");
  if (["accounts.google.com", "https://accounts.google.com"].indexOf(c.iss) < 0) throw authError_("Unknown sign-in issuer.");
  if (String(c.email_verified) !== "true") throw authError_("Your Google email isn't verified.");
  if (Number(c.exp) * 1000 < Date.now()) throw authError_("Your sign-in has expired. Sign in again.");
  // the email's own domain, or the Google Workspace domain it belongs to (hd), must be on the list
  const hd = String(c.hd || "").toLowerCase();
  if (domains.indexOf(email.split("@")[1]) < 0 && domains.indexOf(hd) < 0) throw authError_("Use your university account (@" + domains.join(" or @") + ").");

  const user = { email: email, name: String(c.name || "") };
  const ttl = Math.min(3000, Math.floor(Number(c.exp) - Date.now() / 1000) - 30);
  if (ttl > 60) cache.put(key, JSON.stringify(user), ttl);
  return user;
}

// ---- score ----
function stored_(cell) {
  try { const v = JSON.parse(cell); if (v && v.a) return v; } catch (e) {}
  return null;
}

// The first answer the sheet sees for a slide is the one that counts; later ones are ignored.
// Hints only add up. Points are recomputed here from the kept answers.
function summarize_(body, stored) {
  const outOf = Math.max(1, Math.min(200, parseInt(body.slides, 10) || 1));
  // answers saved for a different set of slides (an older version of the deck) don't carry over
  const deck = String(body.deck || "").slice(0, 40);
  if (stored && (stored.v || "") !== deck) stored = null;
  const slide = (k) => { const n = parseInt(k, 10); return n >= 0 && n < outOf ? n : -1; };
  const answers = {};
  if (stored) Object.keys(stored.a).forEach((k) => { if (slide(k) >= 0) answers[slide(k)] = { ok: !!stored.a[k].ok, g: String(stored.a[k].g || "") }; });
  const incoming = body.answers && typeof body.answers === "object" ? body.answers : {};
  Object.keys(incoming).forEach((k) => {
    const n = slide(k), v = incoming[k];
    if (n >= 0 && !answers[n] && v && typeof v === "object") answers[n] = { ok: v.ok === true, g: String(v.given || "").slice(0, 200) };
  });
  const hints = [];
  ((stored && stored.h) || []).concat(Array.isArray(body.hints) ? body.hints : []).forEach((k) => {
    const n = slide(k);
    if (n >= 0 && hints.indexOf(n) < 0) hints.push(n);
  });
  hints.sort((a, b) => a - b);
  const done = Object.keys(answers).map(Number);
  const right = done.filter((n) => answers[n].ok);
  const score = right.reduce((t, n) => t + (hints.indexOf(n) >= 0 ? SETTINGS.POINTS - SETTINGS.HINT_COST : SETTINGS.POINTS), 0);
  return {
    deck: deck, outOf: outOf, max: outOf * SETTINGS.POINTS, score: score,
    answers: answers, hints: hints,
    right: right.length, wrong: done.length - right.length, answered: done.length,
    at: Math.max(0, Math.min(outOf + 1, parseInt(body.at, 10) || 0)),
    finished: done.length === outOf,
    activity: ["tabs", "away"].map((k) => Math.max(0, Math.min(1e6, parseInt((body.activity || {})[k], 10) || 0))),
  };
}

function book_() {
  return SETTINGS.SPREADSHEET_ID ? SpreadsheetApp.openById(SETTINGS.SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}
function sheet_(name, headers) {
  const book = book_();
  let sh = book.getSheetByName(name);
  if (sh && sh.getRange(1, 1, 1, headers.length).getValues()[0].join("|") !== headers.join("|")) {
    // made by an older version of this script, with different columns: keep it, start a new one
    if (sh.getLastRow() > 1) { sh.setName(name + " (old " + Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm") + ")"); sh = null; }
    else { sh.getRange(1, 1, 1, headers.length).setValues([headers]); sh.getRange(1, 1, 1, headers.length).setFontWeight("bold"); }
  }
  if (!sh) {
    sh = book.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sh;
}

function writeScore_(sh, row, found, user, s) {
  const now = new Date();
  const firstSeen = found ? sh.getRange(row, COL.firstSeen).getValue() || now : now;
  const finishedAt = (found && sh.getRange(row, COL.finishedAt).getValue()) || (s.finished ? now : "");
  // activity counts only go up, so clearing the browser can't hide them
  const activity = s.activity.map((n, k) => Math.max(n, found ? Number(sh.getRange(row, COL.activity + k).getValue()) || 0 : 0));
  const answers = {};
  Object.keys(s.answers).forEach((n) => (answers[n] = { ok: s.answers[n].ok ? 1 : 0, g: s.answers[n].g }));
  sh.getRange(row, 1, 1, SCORES_HEADERS.length).setValues([[
    text_(user.email, 200), text_(user.name, 200), s.score, s.max, s.right, s.wrong, s.hints.length, s.answered,
    s.at, s.finished ? "yes" : "no", firstSeen, now, finishedAt,
  ].concat(activity, [JSON.stringify({ v: s.deck, a: answers, h: s.hints })])]);
}

// Students who have answered every slide, ranked by score; ties share a rank and are
// listed by who finished first.
function leaderboard_(sh, email, max) {
  const rows = sh.getDataRange().getValues().slice(1);
  const domains = SETTINGS.LEADERBOARD_DOMAINS.map((d) => String(d).toLowerCase());
  const eligible = (e) => domains.indexOf(String(e).toLowerCase().split("@")[1]) >= 0;
  // only runs of this version of the deck (same "Out of") are ranked together
  const done = rows.filter((r) => r[9] === "yes" && eligible(r[0]) && Number(r[3]) === max)
    .map((r) => ({ email: String(r[0]).toLowerCase(), name: String(r[1] || r[0]).replace(/^'/, "").split(/[\s@]/)[0], score: Number(r[2]) || 0, at: new Date(r[12] || r[11]).getTime() || 0 }))
    .sort((a, b) => b.score - a.score || a.at - b.at);
  let rank = 0;
  done.forEach((r, k) => { r.rank = k > 0 && r.score === done[k - 1].score ? done[k - 1].rank : k + 1; if (r.email === email) rank = r.rank; });
  const average = done.length ? Math.round(done.reduce((t, r) => t + r.score, 0) / done.length) : 0;
  return {
    rank: rank || null, of: done.length, average: average,
    note: eligible(email) ? "" : "Only student accounts are ranked.",
    top: done.slice(0, SETTINGS.LEADERBOARD_TOP).map((r) => ({ rank: r.rank, name: r.name, score: r.score, you: r.email === email })),
  };
}

function writeAttempts_(user, events) {
  if (!Array.isArray(events) || !events.length) return;
  const sh = sheet_("Attempts", ATTEMPTS_HEADERS);
  const rows = events.slice(0, 100).map((ev) => [
    new Date(Number(ev.t) || Date.now()),
    text_(user.email, 200),
    (parseInt(ev.slide, 10) || 0) + 1,
    text_(ev.op, 60),
    ["right", "wrong", "hint"].concat(ACTIVITY_KINDS).indexOf(ev.kind) >= 0 ? ev.kind : "other",
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
