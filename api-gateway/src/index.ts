import express, { Request, Response, NextFunction } from 'express'
import httpProxy from 'http-proxy'
import jwt from 'jsonwebtoken'
import morgan from 'morgan'
import cors from 'cors'
import dotenv from 'dotenv'
import { authLimiter, globalLimiter } from './middleware/rateLimiter'
import { createServer } from 'http'
import { initWebSocket } from './websocket'

dotenv.config()

const app = express()

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

app.use(morgan('dev'))

// Global rate limit — 100 requests/minute for all routes
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'api-gateway' }))
app.use((req, res, next) => {
  if (req.headers.upgrade === 'websocket') return next()
  globalLimiter(req, res, next)
})

const proxy = httpProxy.createProxyServer({})

proxy.on('error', (err, req, res: any) => {
  console.error('Proxy error:', err.message)
  res.status(502).json({ message: 'Service unavailable' })
})

const SERVICES = {
  auth:         process.env.AUTH_SERVICE_URL         || 'http://localhost:3001',
  order:        process.env.ORDER_SERVICE_URL        || 'http://localhost:3002',
  delivery:     process.env.DELIVERY_SERVICE_URL     || 'http://localhost:3003',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
  pharmacy:     process.env.PHARMACY_SERVICE_URL     || 'http://localhost:3005'
}

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'api-gateway' }))

const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) { res.status(401).json({ message: 'Missing token' }); return }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!)
    req.headers['x-user'] = JSON.stringify(payload)
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}

const forward = (target: string) => {
  return (req: Request, res: Response) => {
    const url = req.originalUrl.replace(/^\/api/, '')
    req.url = url
    proxy.web(req, res, { target })
  }
}

// PUBLIC — strict rate limit on auth endpoints
app.use('/api/auth/login',    authLimiter, forward(SERVICES.auth))
app.use('/api/auth/register', authLimiter, forward(SERVICES.auth))
app.use('/api/auth',                       forward(SERVICES.auth))

// PROTECTED
app.use('/api/orders',        authenticate, forward(SERVICES.order))
app.use('/api/deliveries',    authenticate, forward(SERVICES.delivery))
app.use('/api/notifications', authenticate, forward(SERVICES.notification))
app.use('/api/pharmacies',    authenticate, forward(SERVICES.pharmacy))

app.use((_, res) => res.status(404).json({ message: 'Route not found' }))

const PORT = process.env.PORT || 3000
const server = createServer(app)
initWebSocket(server)
server.listen(PORT, () => console.log(`🚀 api-gateway running on port ${PORT}`))