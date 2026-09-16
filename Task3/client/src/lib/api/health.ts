// Health endpoints are the one place in this backend that don't use the
// `{ success, data }` envelope every other route does (see
// server/src/controllers/health.controller.js — they return
// `{ success, message }` directly) — so this talks to fetch() directly
// rather than through client.ts's request(), which assumes that envelope.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5002/api'

export interface HealthResponse {
  success: boolean
  message: string
}

async function getHealthJson(path: string): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`)
  }
  return res.json() as Promise<HealthResponse>
}

export const healthApi = {
  api: () => getHealthJson('/health'),
  db: () => getHealthJson('/health/db'),
}
