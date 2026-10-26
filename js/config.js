// Score tracking settings. Leave any of the first three empty and the deck
// runs as plain practice: no sign-in, no score sheet, nothing else changes.
// Setup steps: see "Score tracking" in README.md.
window.INSTADB_CONFIG = {
  // OAuth client ID (Google Cloud → APIs & Services → Credentials), ends in .apps.googleusercontent.com
  googleClientId: "",
  // Students must sign in with an account from this domain, e.g. "university.edu"
  allowedDomain: "",
  // The Apps Script web app URL, ends in /exec
  scriptUrl: "",
  // true: students sign in before the first question. If Google sign-in can't
  // load (offline, blocked), they can still practise; the score just isn't saved.
  requireSignIn: true,
};
