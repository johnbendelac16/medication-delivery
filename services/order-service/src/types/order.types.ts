export enum OrderStatus {
  PENDING_PRESCRIPTION  = 'PENDING_PRESCRIPTION',
  PRESCRIPTION_APPROVED = 'PRESCRIPTION_APPROVED',
  READY_FOR_PICKUP      = 'READY_FOR_PICKUP',
  IN_DELIVERY           = 'IN_DELIVERY',
  DELIVERED             = 'DELIVERED',
  CANCELLED             = 'CANCELLED'
}

// Data required to create a new order
export interface CreateOrderDto {
  pharmacyId: string
  prescriptionUrl?: string
  notes?: string
  items: {
    medicationId: string
    name: string
    quantity: number
    unitPrice: number
  }[]
}

// Data required to update an order status
export interface UpdateOrderStatusDto {
  status: OrderStatus
  note?: string
}

// Decoded user injected by the API gateway via x-user header
export interface RequestUser {
  sub: string       // userId
  role: string
  pharmacyId?: string
}