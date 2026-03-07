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

// Publish GPS update to Redis Pub/Sub
export const publishGPS = async (orderId: string, driverId: string, latitude: number, longitude: number): Promise<void> => {
  await redis.publish('gps:updates', JSON.stringify({
    orderId,
    driverId,
    latitude,
    longitude,
    timestamp: new Date().toISOString()
  }))
  console.log(`📍 GPS published for order ${orderId.slice(0, 8)}: ${latitude}, ${longitude}`)
}

export default redis