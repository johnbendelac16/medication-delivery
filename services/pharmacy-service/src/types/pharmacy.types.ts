// Data required to create a pharmacy
export interface CreatePharmacyDto {
  name: string
  address: string
  phone: string
}

// Data required to create a medication
export interface CreateMedicationDto {
  name: string
  description?: string
  unitPrice: number
  stock: number
  requiresPrescription: boolean
}

// Data required to update stock
export interface UpdateStockDto {
  stock: number
}

// Data required to validate a prescription
export interface ValidatePrescriptionDto {
  orderId: string
  approved: boolean
  note?: string
}

// Decoded user injected by the API gateway via x-user header
export interface RequestUser {
  sub: string
  role: string
  pharmacyId?: string
}