import { apiClient } from './client.js'

export async function listProducts(params = {}) {
  const { data } = await apiClient.get('/products', { params })
  return data
}

export async function getProductBySlug(slug) {
  const { data } = await apiClient.get(`/products/${encodeURIComponent(slug)}`)
  return data.product
}
