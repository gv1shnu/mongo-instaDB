// Score tracking settings. Leave the client ID or script URL empty and the deck
// runs as plain practice: no sign-in, no score sheet, nothing else changes.
// Setup steps: see "Score tracking" in README.md. Left empty here, so anyone can play.
window.INSTADB_CONFIG = {
  // OAuth client ID (Google Cloud → APIs & Services → Credentials), ends in .apps.googleusercontent.com
  googleClientId: "",
  // Only accounts from these email domains can sign in (exact match): students, then staff
  allowedDomains: [],
  // The Apps Script web app URL, ends in /exec
  scriptUrl: "",
  // true: students sign in before the first question. If Google sign-in can't
  // load (offline, blocked), they can still practise; the score just isn't saved.
  requireSignIn: false,
};
