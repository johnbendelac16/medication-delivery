import express from 'express'
import dotenv from 'dotenv'
import morgan from 'morgan'
import { startConsumer } from './services/notification.consumer'

dotenv.config()

const app = express()
app.use(express.json())
app.use(morgan('dev'))

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'notification-service' }))

const PORT = process.env.PORT || 3004

const start = async () => {
  try {
    // No database — this service only listens to RabbitMQ events
    await startConsumer()
    app.listen(PORT, () => console.log(`🚀 notification-service running on port ${PORT}`))
  } catch (error) {
    console.error('❌ Failed to start:', error)
    process.exit(1)
  }
}

start()