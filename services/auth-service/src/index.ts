import express from 'express'
import dotenv from 'dotenv'
import morgan from 'morgan'
import authRoutes from './routes/auth.routes'
import { connectRabbitMQ } from './config/rabbitmq'
import prisma from './config/prisma'

dotenv.config()

const app = express()
app.use(express.json())

// HTTP request logger — logs method, url, status, response time
app.use(morgan('dev'))

// Health check — used by Docker and AWS to know if the service is alive
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'auth-service' }))

app.use('/auth', authRoutes)

const PORT = process.env.PORT || 3001

const start = async () => {
  try {
    await prisma.$connect()
    console.log('✅ PostgreSQL connected')
    await connectRabbitMQ()
    app.listen(PORT, () => {
      console.log(`🚀 auth-service running on port ${PORT}`)
    })
  } catch (error) {
    console.error('❌ Failed to start:', error)
    process.exit(1)
  }
}

start()