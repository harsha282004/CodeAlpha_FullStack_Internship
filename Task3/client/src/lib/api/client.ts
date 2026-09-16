import { getAccessToken, clearAccessToken } from '../../auth/tokenStorage'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5002/api'

// Every error the API layer throws is one of these — components never have
// to guess whether a caught value has `.status`/`.code`/`.message`.
export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

// Fired whenever a request comes back 401 — the one signal "the frontend
// must never generate its own JWT" leaves for "the token this frontend is
// holding is no longer valid." AuthContext listens for this to clear state
// and redirect to /login; the API layer itself has no notion of routing.
type UnauthorizedListener = () => void
let unauthorizedListener: UnauthorizedListener | null = null

export function onUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListener = listener
}

// Maps a backend status/code into a message safe and useful to show a user
// — never a raw Prisma/stack-trace string, per this project's own backend
// error-handling convention (see server/src/middleware/errorHandler.js).
// The backend's own `message` is still preferred when present and this
// isn't a 401/5xx, since validation messages (400s) are already
// user-safe and specific (e.g. "username must be 3-30 characters...").
function normalizeMessage(status: number, backendMessage: string | undefined): string {
  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 403) return backendMessage || "You don't have permission to perform this action."
  if (status === 404) return backendMessage || 'The requested item could not be found.'
  if (status === 409) return backendMessage || 'This item already exists.'
  if (status >= 500) return 'Something went wrong. Please try again.'
  return backendMessage || 'Something went wrong. Please try again.'
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined>
  auth?: boolean
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(`${API_URL}${path}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

// The one place every REST call in this app goes through. Attaches the
// bearer token (unless explicitly opted out, e.g. login/register), parses
// the backend's `{ success, data }` / `{ success, message, code }`
// envelope, and normalizes every failure into an ApiError with a safe
// message — never a raw network error object or backend stack trace
// reaching a component.
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Something went wrong. Please try again.', 0, 'NETWORK_ERROR')
  }

  // Notifications/other DELETE endpoints return `{ success, message }` with
  // no `data` — treated the same as `{ data: undefined }` below.
  let json: { success: boolean; message?: string; code?: string; data?: unknown } | null = null
  try {
    json = await res.json()
  } catch {
    // No JSON body (rare — e.g. a proxy error page). Fall through to the
    // status-based branch below with an empty envelope.
  }

  if (!res.ok || !json || json.success === false) {
    if (res.status === 401 && auth) {
      clearAccessToken()
      unauthorizedListener?.()
    }
    throw new ApiError(normalizeMessage(res.status, json?.message), res.status, json?.code)
  }

  return json.data as T
}

export function get<T>(path: string, query?: RequestOptions['query'], auth = true) {
  return request<T>(path, { method: 'GET', query, auth })
}

export function post<T>(path: string, body?: unknown, auth = true) {
  return request<T>(path, { method: 'POST', body: body ?? {}, auth })
}

export function patch<T>(path: string, body?: unknown, auth = true) {
  return request<T>(path, { method: 'PATCH', body: body ?? {}, auth })
}

export function del<T>(path: string, auth = true) {
  return request<T>(path, { method: 'DELETE', auth })
}
