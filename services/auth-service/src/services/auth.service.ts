import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import prisma from '../config/prisma'
import { publishEvent } from '../config/rabbitmq'
import { AuthTokens, LoginDto, RegisterDto, UserRole } from '../types/auth.types'

export class AuthService {

  // ─── Register ─────────────────────────────────────────────────────────────
  // Creates a new user, hashes the password, saves to DB, notifies other services

  async register(dto: RegisterDto): Promise<{ id: string; email: string; role: UserRole }> {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new Error('Email already in use')

    // bcrypt hash with salt 12 — higher than default (10), justified for medical data
    const passwordHash = await bcrypt.hash(dto.password, 12)

    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role as any,
        pharmacyId: dto.pharmacyId,
        licenseNumber: dto.licenseNumber
      }
    })

    // Notify other services that a new user was created
    publishEvent('user.registered', {
      userId: user.id,
      email: user.email,
      role: user.role
    })

    return { id: user.id, email: user.email, role: user.role as UserRole }
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  // Verifies email + password, returns a pair of tokens

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } })

    // Generic error to prevent user enumeration attacks
    if (!user) throw new Error('Invalid credentials')

    const isValid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!isValid) throw new Error('Invalid credentials')

    if (!user.isVerified) throw new Error('Account not verified')

    return this.generateTokens(user.id, user.role as UserRole, user.pharmacyId ?? undefined)
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────
  // Validates the refresh token, deletes it, and issues a fresh pair of tokens

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    })

    if (!stored || stored.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token')
    }

    // Token rotation — old token is deleted, a new pair is issued
    await prisma.refreshToken.delete({ where: { id: stored.id } })

    return this.generateTokens(
      stored.user.id,
      stored.user.role as UserRole,
      stored.user.pharmacyId ?? undefined
    )
  }

  // ─── Logout ───────────────────────────────────────────────────────────────
  // Deletes the refresh token from DB so it can no longer be used

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
  }

  // ─── Private: Generate Tokens ─────────────────────────────────────────────
  // Creates a short-lived JWT access token + a long-lived refresh token

  private async generateTokens(
    userId: string,
    role: UserRole,
    pharmacyId?: string
  ): Promise<AuthTokens> {
    // JWT access token — expires in 15 minutes
    const accessToken = jwt.sign(
      { sub: userId, role, pharmacyId },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    )

    // Opaque refresh token — stored in DB, expires in 7 days
    const rawRefresh = crypto.randomBytes(64).toString('hex')

    await prisma.refreshToken.create({
      data: {
        token: rawRefresh,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })

    return { accessToken, refreshToken: rawRefresh }
  }
}
