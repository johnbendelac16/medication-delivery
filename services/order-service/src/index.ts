import express from 'express'
import dotenv from 'dotenv'
import morgan from 'morgan'
import orderRoutes from './routes/order.routes'
import { connectRabbitMQ } from './config/rabbitmq'
import prisma from './config/prisma'

dotenv.config()

const app = express()
app.use(express.json())
app.use(morgan('dev'))

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'order-service' }))

app.use('/orders', orderRoutes)

const PORT = process.env.PORT || 3002

const start = async () => {
  try {
    await prisma.$connect()
    console.log('✅ PostgreSQL connected')
    await connectRabbitMQ()
    app.listen(PORT, () => console.log(`🚀 order-service running on port ${PORT}`))
  } catch (error) {
    console.error('❌ Failed to start:', error)
    process.exit(1)
  }
}

start()