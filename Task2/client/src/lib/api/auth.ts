import { apiFetch } from './client'
import type { PrivateUser } from './types'

export interface AuthResult {
  user: PrivateUser
  token: string
}

export interface RegisterInput {
  name: string
  username: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export function registerAccount(input: RegisterInput): Promise<AuthResult> {
  return apiFetch<AuthResult>('/auth/register', { method: 'POST', body: input })
}

export function login(input: LoginInput): Promise<AuthResult> {
  return apiFetch<AuthResult>('/auth/login', { method: 'POST', body: input })
}

// suppressUnauthorizedHandling defaults to true because the initial session
// bootstrap uses this to silently discover a stale/invalid token — that 401
// is expected, not a "you got logged out" event. A later, explicit refresh
// (e.g. after editing a profile) passes false so a genuinely expired token
// still triggers the normal session-expired flow.
export function getCurrentUser(options: { suppressUnauthorizedHandling?: boolean } = {}): Promise<{
  user: PrivateUser
}> {
  return apiFetch<{ user: PrivateUser }>('/auth/me', {
    auth: true,
    suppressUnauthorizedHandling: options.suppressUnauthorizedHandling ?? true,
  })
}
