// Client-side token strategy: the backend issues a stateless bearer JWT
// (no session cookie, no refresh-token endpoint — see server/src/utils/jwt.js)
// and CORS is configured without `credentials`, so there is no cookie this
// frontend could rely on even if it wanted to. localStorage is therefore the
// pragmatic choice consistent with the current architecture: it survives a
// refresh (so "restore session" is possible at all) and is readable only by
// this origin's own JavaScript. This is the same trade-off every bearer-JWT
// SPA without a BFF/cookie layer makes; a same-site httpOnly cookie would be
// stronger against XSS but would require backend session/cookie support that
// does not exist in this project and is out of scope to add here.
//
// Isolated in this one module so the storage mechanism can change later
// without touching every call site — nothing outside this file (and
// lib/api/client.ts, which reads it to attach the Authorization header)
// should reach into localStorage directly.
const STORAGE_KEY = 'taskflow.accessToken'

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    // Private-browsing / storage-disabled — treat as "no token" rather
    // than throwing and breaking the whole app.
    return null
  }
}

export function setAccessToken(token: string) {
  try {
    localStorage.setItem(STORAGE_KEY, token)
  } catch {
    // Nothing meaningful to recover here; the user simply won't have a
    // persisted session across reloads in this browser context.
  }
}

export function clearAccessToken() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore — see above.
  }
}
