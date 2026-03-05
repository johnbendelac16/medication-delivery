import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Axios instance with base URL
const api = axios.create({
  baseURL: API_URL
})

// Automatically attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// If token is expired (401), redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
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