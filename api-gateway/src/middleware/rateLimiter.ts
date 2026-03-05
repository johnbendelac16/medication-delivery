import Redis from 'ioredis'
import { Request, Response, NextFunction } from 'express'

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

// ─── Rate Limiter Factory ─────────────────────────────────────────────────────

interface RateLimitOptions {
  max: number       // max requests allowed
  windowSec: number // time window in seconds
  message?: string
}

export const createRateLimiter = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const key = `rate:${req.path}:${ip}`

    try {
      const current = await redis.incr(key)

      // First request — set TTL
      if (current === 1) {
        await redis.expire(key, options.windowSec)
      }

      // Add headers so client knows their limit status
      const ttl = await redis.ttl(key)
      res.setHeader('X-RateLimit-Limit', options.max)
      res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - current))
      res.setHeader('X-RateLimit-Reset', ttl)

      if (current > options.max) {
        res.status(429).json({
          message: options.message || 'Too many requests, please try again later',
          retryAfter: ttl
        })
        return
      }

      next()
    } catch (err) {
      // If Redis is down, allow the request (fail open)
      console.error('Rate limiter error:', err)
      next()
    }
  }
}

// ─── Pre-configured limiters ──────────────────────────────────────────────────

// Strict — for login/register (5 attempts per 15 minutes)
export const authLimiter = createRateLimiter({
  max: 5,
  windowSec: 15 * 60,
  message: 'Too many attempts, please try again in 15 minutes'
})

// Normal — for all other routes (100 requests per minute)
export const globalLimiter = createRateLimiter({
  max: 100,
  windowSec: 60
})

export default redis