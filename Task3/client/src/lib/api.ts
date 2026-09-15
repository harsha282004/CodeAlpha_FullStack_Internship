// Minimal API client foundation. Grows into typed request/response wrappers
// per resource (auth, projects, boards, tasks, comments...) in later phases.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5002/api'

export type HealthResponse = {
  success: boolean
  message: string
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function getApiHealth() {
  return getJson<HealthResponse>('/health')
}

export function getDatabaseHealth() {
  return getJson<HealthResponse>('/health/db')
}
