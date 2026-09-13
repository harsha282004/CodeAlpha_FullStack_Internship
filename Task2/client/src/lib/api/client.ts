// Single shared fetch wrapper. No component should call fetch() directly —
// every API module in this directory goes through apiFetch so the base URL,
// auth header, JSON parsing, and error shape stay consistent everywhere.

const DEFAULT_API_URL = 'http://localhost:5001/api'

function getBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL as string | undefined
  const base = configured && configured.trim().length > 0 ? configured : DEFAULT_API_URL
  return base.replace(/\/+$/, '')
}

const TOKEN_STORAGE_KEY = 'connectly.token'

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } catch {
    // Storage can be unavailable (private browsing, quota exceeded). The
    // session just won't persist across a reload — an acceptable degradation.
  }
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | null = null

// AuthProvider registers this once, so any protected call that comes back
//401 mid-session (an expired/invalidated token) can clear auth state and
// notify the user, without every call site needing to know about that.
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

type QueryValue = string | number | undefined | null

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  auth?: boolean
  query?: Record<string, QueryValue>
  // Login/register/initial "who am I" checks expect a 401 as ordinary,
  // expected feedback — not a "your session just expired" event.
  suppressUnauthorizedHandling?: boolean
}

function buildQueryString(query?: Record<string, QueryValue>): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && String(value).length > 0) {
      params.set(key, String(value))
    }
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

interface ApiEnvelope<T> {
  success?: boolean
  message?: string
  data?: T
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, query, suppressUnauthorizedHandling = false } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (auth) {
    const token = getStoredToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${getBaseUrl()}${path}${buildQueryString(query)}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Unable to reach the server. Check your connection and try again.', 0)
  }

  let payload: ApiEnvelope<T> | null = null
  try {
    payload = (await response.json()) as ApiEnvelope<T>
  } catch {
    payload = null
  }

  if (!response.ok) {
    if (response.status === 401 && auth && !suppressUnauthorizedHandling) {
      unauthorizedHandler?.()
    }
    throw new ApiError(payload?.message || 'Something went wrong. Please try again.', response.status)
  }

  return (payload?.data as T) ?? (undefined as T)
}
