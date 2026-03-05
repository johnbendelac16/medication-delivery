import Redis from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times) => {
    // Retry connection up to 3 times with exponential backoff
    if (times > 3) return null
    return Math.min(times * 200, 1000)
  }
})

redis.on('connect', () => console.log('✅ Redis connected'))
redis.on('error', (err) => console.error('❌ Redis error:', err.message))

// ─── Helper functions ─────────────────────────────────────────────────────────

// Get cached value — returns parsed object or null
export const getCache = async <T>(key: string): Promise<T | null> => {
  const value = await redis.get(key)
  if (!value) return null
  return JSON.parse(value) as T
}

// Set cached value with TTL in seconds
export const setCache = async (key: string, value: unknown, ttlSeconds = 300): Promise<void> => {
  await redis.setex(key, ttlSeconds, JSON.stringify(value))
}

// Delete cached value — call when data changes
export const deleteCache = async (key: string): Promise<void> => {
  await redis.del(key)
}

// Delete all keys matching a pattern — ex: 'pharmacies:*'
export const deleteCachePattern = async (pattern: string): Promise<void> => {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) await redis.del(...keys)
}

export default redis