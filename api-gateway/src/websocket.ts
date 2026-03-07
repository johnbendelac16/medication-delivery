import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'
import Redis from 'ioredis'

// Separate Redis connection for subscribe (can't be used for other commands)
const subscriber = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
})

// Map of orderId → Set of connected WebSocket clients watching that order
const clients = new Map<string, Set<WebSocket>>()

export const initWebSocket = (server: Server) => {
  const wss = new WebSocketServer({ server })

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://localhost`)
    const orderId = url.searchParams.get('orderId')

    if (!orderId) {
      ws.close(1008, 'Missing orderId')
      return
    }

    // Register client for this order
    if (!clients.has(orderId)) clients.set(orderId, new Set())
    clients.get(orderId)!.add(ws)
    console.log(`📡 Client connected for order ${orderId.slice(0, 8)}`)

    ws.send(JSON.stringify({ type: 'connected', orderId }))

    ws.on('close', () => {
      clients.get(orderId)?.delete(ws)
      if (clients.get(orderId)?.size === 0) clients.delete(orderId)
      console.log(`📡 Client disconnected from order ${orderId.slice(0, 8)}`)
    })
  })

  // Subscribe to GPS updates from delivery-service
  subscriber.subscribe('gps:updates', (err) => {
    if (err) console.error('❌ Redis subscribe error:', err)
    else console.log('✅ WebSocket server subscribed to gps:updates')
  })

  // Broadcast GPS update to all clients watching this order
  subscriber.on('message', (channel, message) => {
    if (channel !== 'gps:updates') return

    const data = JSON.parse(message)
    const { orderId } = data

    const orderClients = clients.get(orderId)
    if (!orderClients || orderClients.size === 0) return

    console.log(`📍 Broadcasting GPS to ${orderClients.size} client(s) for order ${orderId.slice(0, 8)}`)

    orderClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'gps', ...data }))
      }
    })
  })

  console.log('✅ WebSocket server initialized')
}