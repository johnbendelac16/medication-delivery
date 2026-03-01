export enum DeliveryStatus {
  ASSIGNED   = 'ASSIGNED',
  PICKED_UP  = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED  = 'DELIVERED',
  FAILED     = 'FAILED'
}

// Data required to create a new delivery
export interface CreateDeliveryDto {
  orderId: string
  driverId: string
}

// Data required to update delivery location (GPS tracking)
export interface UpdateLocationDto {
  latitude: number
  longitude: number
}

// Data required to update delivery status
export interface UpdateStatusDto {
  status: DeliveryStatus
  note?: string
  latitude?: number
  longitude?: number
}

// Decoded user injected by the API gateway via x-user header
export interface RequestUser {
  sub: string
  role: string
}