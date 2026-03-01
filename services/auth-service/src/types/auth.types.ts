export enum UserRole {
  PATIENT = 'PATIENT',
  PHARMACIST = 'PHARMACIST',
  DELIVERY_DRIVER = 'DELIVERY_DRIVER',
  ADMIN = 'ADMIN'
}

export interface JwtPayload {
  sub: string       // userId
  role: UserRole
  pharmacyId?: string
  iat: number
  exp: number
}

export interface AuthTokens {
  accessToken: string   // short-lived: 15 minutes
  refreshToken: string  // long-lived: 7 days, stored in DB
}

export interface RegisterDto {
  email: string
  password: string
  role: UserRole
  pharmacyId?: string
  licenseNumber?: string
}

export interface LoginDto {
  email: string
  password: string
}
