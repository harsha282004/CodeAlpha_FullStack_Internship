import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const apiClient = axios.create({ baseURL })

export function setAuthToken(token) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete apiClient.defaults.headers.common.Authorization
  }
}

export function getErrorMessage(error) {
  return error?.response?.data?.error?.message || 'Something went wrong. Please try again.'
}
