import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_URL
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Track if we're already refreshing to avoid infinite loops
let isRefreshing = false
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token!)
  })
  failedQueue = []
}

// Auto-refresh access token when it expires
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refreshToken')

      // No refresh token — redirect to login
      if (!refreshToken) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Queue the request until refresh is done
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Call refresh endpoint
        const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken })
        const { accessToken, refreshToken: newRefreshToken } = res.data

        // Store new tokens
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', newRefreshToken)

        // Retry all queued requests with new token
        processQueue(null, accessToken)

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed — logout
        processQueue(refreshError, null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; role: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  refresh: (refreshToken: string) =>
    api.post('/api/auth/refresh', { refreshToken }),
  me: () => api.get('/api/auth/me')
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export interface CreateOrderDto {
  pharmacyId: string
  notes?: string
  items: { medicationId: string; name: string; quantity: number; unitPrice: number }[]
}

export interface UpdateOrderStatusDto {
  status: string
  note?: string
}

export const ordersApi = {
  create: (data: CreateOrderDto) => api.post('/api/orders', data),
  getMyOrders: () => api.get('/api/orders/me'),
  getById: (id: string) => api.get(`/api/orders/${id}`),
  updateStatus: (id: string, data: UpdateOrderStatusDto) => api.patch(`/api/orders/${id}/status`, data)
}

// ─── Deliveries ───────────────────────────────────────────────────────────────
export interface CreateDeliveryDto {
  orderId: string
  driverId: string
}

export interface UpdateLocationDto {
  latitude: number
  longitude: number
}

export interface UpdateDeliveryStatusDto {
  status: string
  note?: string
  latitude?: number
  longitude?: number
}

export const deliveriesApi = {
  create: (data: CreateDeliveryDto) => api.post('/api/deliveries', data),
  getById: (id: string) => api.get(`/api/deliveries/${id}`),
  getByOrderId: (orderId: string) => api.get(`/api/deliveries/order/${orderId}`),
  updateLocation: (id: string, data: UpdateLocationDto) => api.patch(`/api/deliveries/${id}/location`, data),
  updateStatus: (id: string, data: UpdateDeliveryStatusDto) => api.patch(`/api/deliveries/${id}/status`, data)
}

// ─── Pharmacies ───────────────────────────────────────────────────────────────
export interface ValidatePrescriptionDto {
  orderId: string
  approved: boolean
  note?: string
}

export const pharmaciesApi = {
  getAll: () => api.get('/api/pharmacies'),
  getById: (id: string) => api.get(`/api/pharmacies/${id}`),
  getMedications: (id: string) => api.get(`/api/pharmacies/${id}/medications`),
  validatePrescription: (data: ValidatePrescriptionDto) => api.post('/api/pharmacies/prescriptions/validate', data)
}

export default api