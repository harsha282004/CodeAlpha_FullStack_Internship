import { apiClient } from './client.js'

export async function createOrder(payload) {
  const { data } = await apiClient.post('/orders', payload)
  return data.order
}

export async function listOrders() {
  const { data } = await apiClient.get('/orders')
  return data.orders
}

export async function getOrder(id) {
  const { data } = await apiClient.get(`/orders/${encodeURIComponent(id)}`)
  return data.order
}

export async function listAllOrdersAdmin() {
  const { data } = await apiClient.get('/admin/orders')
  return data.orders
}

export async function updateOrderStatusAdmin(id, status) {
  const { data } = await apiClient.put(`/admin/orders/${encodeURIComponent(id)}/status`, { status })
  return data.order
}
