import { apiClient } from './client.js'

export async function getAdminStats() {
  const { data } = await apiClient.get('/admin/stats')
  return data.stats
}

export async function listAdminUsers(params = {}) {
  const { data } = await apiClient.get('/admin/users', { params })
  return data
}
