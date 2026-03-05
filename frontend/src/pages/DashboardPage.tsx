import { useState, useEffect } from 'react'
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

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💊</span>
          <span className="font-bold text-gray-900 text-lg">MedDeliver</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.role}</span>
          <button
            onClick={logout}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 mt-1">Track all your medication orders</p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-16 text-gray-400">Loading orders...</div>
        )}

        {/* Empty state */}
        {!isLoading && orders.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-500">No orders yet</p>
          </div>
        )}

        {/* Orders list */}
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-200 p-6">

              {/* Order header */}
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

              {/* Items */}
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{item.name} <span className="text-gray-400">x{item.quantity}</span></span>
                    <span className="text-gray-500">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {order.notes && (
                <p className="text-sm text-gray-400 mt-3 pt-3 border-t border-gray-100">
                  Note: {order.notes}
                </p>
              )}

            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
