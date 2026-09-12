import { apiClient } from './client.js'

export async function listProducts(params = {}) {
  const { data } = await apiClient.get('/products', { params })
  return data
}

export async function getProductBySlug(slug) {
  const { data } = await apiClient.get(`/products/${encodeURIComponent(slug)}`)
  return data.product
}

export async function createProductAdmin(payload) {
  const { data } = await apiClient.post('/products', payload)
  return data.product
}

export async function updateProductAdmin(id, payload) {
  const { data } = await apiClient.put(`/products/${encodeURIComponent(id)}`, payload)
  return data.product
}

export async function deleteProductAdmin(id) {
  await apiClient.delete(`/products/${encodeURIComponent(id)}`)
}
