import { get, post } from './client'
import type { CurrentUser } from './types'

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

interface AuthResult {
  user: CurrentUser
  token: string
}

export const authApi = {
  // auth:false — logging in/registering must not send a (possibly stale)
  // Authorization header from a previous session.
  register: (input: RegisterInput) => post<AuthResult>('/auth/register', input, false),
  login: (input: LoginInput) => post<AuthResult>('/auth/login', input, false),
  me: () => get<{ user: CurrentUser }>('/auth/me'),
}
