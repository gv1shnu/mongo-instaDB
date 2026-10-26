// Score tracking settings. Leave the client ID or script URL empty and the deck
// runs as plain practice: no sign-in, no score sheet, nothing else changes.
// Setup steps: see "Score tracking" in README.md.
window.INSTADB_CONFIG = {
  // OAuth client ID (Google Cloud → APIs & Services → Credentials), ends in .apps.googleusercontent.com
  googleClientId: "597031381-es9guvfhndfq1e5qhjbe707d6b0ilp8q.apps.googleusercontent.com",
  // Only accounts from these email domains can sign in (exact match): students, then staff
  allowedDomains: ["nst.rishihood.edu.in", "rishihood.edu.in"],
  // The Apps Script web app URL, ends in /exec
  scriptUrl: "https://script.google.com/macros/s/AKfycbwyNQOjQUetCQtbn8lUgD2gJYa2taxMh5jcMhpRNXaxf--geq0ynfvXpDmPLSUwqrm8mg/exec",
  // true: students sign in before the first question. If Google sign-in can't
  // load (offline, blocked), they can still practise; the score just isn't saved.
  requireSignIn: true,
};
