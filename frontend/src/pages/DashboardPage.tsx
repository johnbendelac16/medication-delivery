import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { ordersApi } from '../services/api'

interface OrderItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
}

interface Order {
  id: string
  status: string
  pharmacyId: string
  notes: string | null
  createdAt: string
  items: OrderItem[]
}

interface GPSPosition {
  latitude: number
  longitude: number
  timestamp: string
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_PRESCRIPTION:  'bg-yellow-100 text-yellow-800',
  PRESCRIPTION_APPROVED: 'bg-blue-100 text-blue-800',
  READY_FOR_PICKUP:      'bg-purple-100 text-purple-800',
  IN_DELIVERY:           'bg-orange-100 text-orange-800',
  DELIVERED:             'bg-green-100 text-green-800',
  CANCELLED:             'bg-red-100 text-red-800',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PRESCRIPTION:  '⏳ Awaiting validation',
  PRESCRIPTION_APPROVED: '✅ Prescription approved',
  READY_FOR_PICKUP:      '📦 Ready for pickup',
  IN_DELIVERY:           '🚚 In delivery',
  DELIVERED:             '✅ Delivered',
  CANCELLED:             '❌ Cancelled',
}

// GPS Tracker component — connects to WebSocket for a specific order
function GPSTracker({ orderId }: { orderId: string }) {
  const [position, setPosition] = useState<GPSPosition | null>(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
    const ws = new WebSocket(`${WS_URL}?orderId=${orderId}`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'gps') {
        setPosition({
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp
        })
      }
    }

    return () => ws.close()
  }, [orderId])

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`}></div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Live tracking {connected ? '— connected' : '— connecting...'}
        </p>
      </div>

      {position ? (
        <div className="bg-orange-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📍</span>
            <p className="text-sm font-medium text-orange-800">Driver location</p>
          </div>
          <p className="font-mono text-sm text-orange-700">
            {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
          </p>
          <p className="text-xs text-orange-400 mt-1">
            Updated {new Date(position.timestamp).toLocaleTimeString()}
          </p>
          {/* Link to Google Maps */}
          <a
            href={`https://www.google.com/maps?q=${position.latitude},${position.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-xs text-orange-600 hover:underline"
          >
            Open in Google Maps →
          </a>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-400">
          Waiting for driver position...
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    ordersApi.getMyOrders()
      .then((res) => setOrders(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">

      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💊</span>
          <span className="font-bold text-gray-900 text-lg">MedDeliver</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.role}</span>
          <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 font-medium">
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 mt-1">Track all your medication orders</p>
        </div>

        {isLoading && (
          <div className="text-center py-16 text-gray-400">Loading orders...</div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-500">No orders yet</p>
          </div>
        )}

        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-200 p-6">

              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">#{order.id.slice(0, 8)}</p>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </p>
              </div>

              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{item.name} <span className="text-gray-400">x{item.quantity}</span></span>
                    <span className="text-gray-500">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <p className="text-sm text-gray-400 mt-3 pt-3 border-t border-gray-100">
                  Note: {order.notes}
                </p>
              )}

              {/* Show GPS tracker only for orders in delivery */}
              {order.status === 'IN_DELIVERY' && (
                <GPSTracker orderId={order.id} />
              )}

            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
