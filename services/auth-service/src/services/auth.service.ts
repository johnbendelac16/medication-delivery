import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import prisma from '../config/prisma'
import { publishEvent } from '../config/rabbitmq'
import { saveRefreshToken, getRefreshToken, deleteRefreshToken } from '../config/redis'
import { AuthTokens, LoginDto, RegisterDto, UserRole } from '../types/auth.types'

export class AuthService {

  async register(dto: RegisterDto): Promise<{ id: string; email: string; role: UserRole }> {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new Error('Email already in use')

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

    publishEvent('user.registered', {
      userId: user.id,
      email: user.email,
      role: user.role
    })

    return { id: user.id, email: user.email, role: user.role as UserRole }
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } })
    if (!user) throw new Error('Invalid credentials')

    const isValid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!isValid) throw new Error('Invalid credentials')

    if (!user.isVerified) throw new Error('Account not verified')

    return this.generateTokens(user.id, user.role as UserRole, user.pharmacyId ?? undefined)
  }

  // Now uses Redis instead of PostgreSQL
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const userId = await getRefreshToken(refreshToken)
    if (!userId) throw new Error('Invalid or expired refresh token')

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User not found')

    // Token rotation — delete old, issue new
    await deleteRefreshToken(refreshToken)

    return this.generateTokens(
      user.id,
      user.role as UserRole,
      user.pharmacyId ?? undefined
    )
  }

  async logout(refreshToken: string): Promise<void> {
    await deleteRefreshToken(refreshToken)
  }

  private async generateTokens(
    userId: string,
    role: UserRole,
    pharmacyId?: string
  ): Promise<AuthTokens> {
    const accessToken = jwt.sign(
      { sub: userId, role, pharmacyId },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    )

    // Store in Redis with 7 day TTL — auto-expires, no cleanup needed
    const rawRefresh = crypto.randomBytes(64).toString('hex')
    await saveRefreshToken(rawRefresh, userId)

    return { accessToken, refreshToken: rawRefresh }
  }
}