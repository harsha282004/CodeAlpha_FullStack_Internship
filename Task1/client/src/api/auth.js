import { apiClient } from './client.js'

export async function register(name, email, password) {
  const { data } = await apiClient.post('/auth/register', { name, email, password })
  return data
}

export async function login(email, password) {
  const { data } = await apiClient.post('/auth/login', { email, password })
  return data
}

export async function getMe() {
  const { data } = await apiClient.get('/auth/me')
  return data.user
}
