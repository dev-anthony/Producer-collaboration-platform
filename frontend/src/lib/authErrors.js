// fetch() itself rejects when the request never reaches a server at all —
// no route to localhost:5000, the local backend not running yet. Chromium's
// own message for that ("Failed to fetch") reads like a stack trace, not
// something to show someone trying to sign in or sign up. The server, once
// it does answer, already reports its own network-vs-credentials
// distinction (see server/controllers/authController.js) — this only
// covers the case where nothing answered at all.
export function friendlyAuthError(error) {
  return error instanceof TypeError
    ? 'Could not reach ProdCollab. Check your connection and that the app has finished starting up.'
    : error.message;
}
