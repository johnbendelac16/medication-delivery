import Redis from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times) => {
    if (times > 3) return null
    return Math.min(times * 200, 1000)
  }
})

redis.on('connect', () => console.log('✅ Redis connected'))
redis.on('error', (err) => console.error('❌ Redis error:', err.message))

// ─── Refresh Token helpers ────────────────────────────────────────────────────

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 // 7 days in seconds

// Store refresh token → userId mapping
export const saveRefreshToken = async (token: string, userId: string): Promise<void> => {
  await redis.setex(`refresh:${token}`, REFRESH_TOKEN_TTL, userId)
}

// Get userId from refresh token
export const getRefreshToken = async (token: string): Promise<string | null> => {
  return redis.get(`refresh:${token}`)
}

// Delete a single refresh token (logout)
export const deleteRefreshToken = async (token: string): Promise<void> => {
  await redis.del(`refresh:${token}`)
}

// Delete all refresh tokens for a user (logout all devices)
export const deleteAllUserTokens = async (userId: string): Promise<void> => {
  // Find all tokens for this user
  const keys = await redis.keys('refresh:*')
  for (const key of keys) {
    const uid = await redis.get(key)
    if (uid === userId) await redis.del(key)
  }
}

export default redis