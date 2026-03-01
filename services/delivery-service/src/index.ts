import express from 'express'
import dotenv from 'dotenv'
import morgan from 'morgan'
import deliveryRoutes from './routes/delivery.routes'
import { connectRabbitMQ } from './config/rabbitmq'
import prisma from './config/prisma'

dotenv.config()

const app = express()
app.use(express.json())
app.use(morgan('dev'))

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'delivery-service' }))

app.use('/deliveries', deliveryRoutes)

const PORT = process.env.PORT || 3003

const start = async () => {
  try {
    await prisma.$connect()
    console.log('✅ PostgreSQL connected')
    await connectRabbitMQ()
    app.listen(PORT, () => console.log(`🚀 delivery-service running on port ${PORT}`))
  } catch (error) {
    console.error('❌ Failed to start:', error)
    process.exit(1)
  }
}

start()