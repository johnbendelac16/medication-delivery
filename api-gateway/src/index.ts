import express, { Request, Response, NextFunction } from 'express'
import httpProxy from 'http-proxy'
import jwt from 'jsonwebtoken'
import morgan from 'morgan'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(morgan('dev'))

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

// Strip the full /api/xxx prefix and forward to service
// /api/auth/login → /auth/login (keeps the service prefix)
const forward = (target: string, apiPrefix: string, servicePrefix: string) => {
  return (req: Request, res: Response) => {
    const url = req.originalUrl.replace(apiPrefix, servicePrefix)
    console.log(`Forwarding: ${req.originalUrl} → ${target}${url}`)
    req.url = url
    proxy.web(req, res, { target })
  }
}

// PUBLIC
app.use('/api/auth',          forward(SERVICES.auth,         '/api/auth',          '/auth'))

// PROTECTED
app.use('/api/orders',        authenticate, forward(SERVICES.order,        '/api/orders',        '/orders'))
app.use('/api/deliveries',    authenticate, forward(SERVICES.delivery,     '/api/deliveries',    '/deliveries'))
app.use('/api/notifications', authenticate, forward(SERVICES.notification, '/api/notifications', '/notifications'))
app.use('/api/pharmacies',    authenticate, forward(SERVICES.pharmacy,     '/api/pharmacies',    '/pharmacies'))

app.use((_, res) => res.status(404).json({ message: 'Route not found' }))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🚀 api-gateway running on port ${PORT}`))