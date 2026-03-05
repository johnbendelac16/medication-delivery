import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { deliveriesApi } from '../services/api'

type DeliveryStatus = 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED'

interface DeliveryEvent {
  id: string
  status: DeliveryStatus
  latitude: number | null
  longitude: number | null
  note: string | null
  createdAt: string
}

interface Delivery {
  id: string
  orderId: string
  driverId: string
  status: DeliveryStatus
  latitude: number | null
  longitude: number | null
  events: DeliveryEvent[]
  createdAt: string
}

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  ASSIGNED:   'bg-yellow-100 text-yellow-800',
  PICKED_UP:  'bg-blue-100 text-blue-800',
  IN_TRANSIT: 'bg-orange-100 text-orange-800',
  DELIVERED:  'bg-green-100 text-green-800',
  FAILED:     'bg-red-100 text-red-800',
}

const NEXT_STATUS: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  ASSIGNED:   'PICKED_UP',
  PICKED_UP:  'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
}

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  ASSIGNED:   '📋 Assigned',
  PICKED_UP:  '📦 Picked up',
  IN_TRANSIT: '🚚 In transit',
  DELIVERED:  '✅ Delivered',
  FAILED:     '❌ Failed',
}

export default function DriverDashboard() {
  const { logout } = useAuth()
  const [deliveryId, setDeliveryId] = useState('')
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')

  const loadDelivery = async () => {
    if (!deliveryId) return
    setIsLoading(true)
    try {
      const res = await deliveriesApi.getById(deliveryId)
      setDelivery(res.data)
      setMessage('')
    } catch {
      setMessage('Delivery not found')
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatus = async (status: DeliveryStatus) => {
    if (!delivery) return
    setIsUpdating(true)
    try {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const res = await deliveriesApi.updateStatus(delivery.id, {
            status,
            note,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          })
          setDelivery(res.data)
          setNote('')
          setMessage(`✅ Status updated to ${status}`)
          setIsUpdating(false)
        },
        async () => {
          const res = await deliveriesApi.updateStatus(delivery.id, { status, note })
          setDelivery(res.data)
          setNote('')
          setMessage(`✅ Status updated to ${status}`)
          setIsUpdating(false)
        }
      )
    } catch {
      setMessage('Failed to update status')
      setIsUpdating(false)
    }
  }

  const updateLocation = () => {
    if (!delivery) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await deliveriesApi.updateLocation(delivery.id, {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        })
        setMessage(`📍 Location updated: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`)
      },
      () => setMessage('GPS not available')
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💊</span>
          <span className="font-bold text-gray-900 text-lg">MedDeliver</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">Driver</span>
          <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 font-medium">Sign out</button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Deliveries</h1>
          <p className="text-gray-500 mt-1">Manage your active delivery</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Load a delivery</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={deliveryId}
              onChange={(e) => setDeliveryId(e.target.value)}
              placeholder="Paste delivery ID"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={loadDelivery}
              disabled={isLoading}
              className="bg-orange-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {isLoading ? '...' : 'Load'}
            </button>
          </div>
        </div>

        {message && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-lg mb-6">
            {message}
          </div>
        )}

        {delivery && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">

            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs text-gray-400 font-mono mb-1">#{delivery.id.slice(0, 8)}</p>
                <p className="text-sm text-gray-500">Order: #{delivery.orderId.slice(0, 8)}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[delivery.status]}`}>
                {STATUS_LABELS[delivery.status]}
              </span>
            </div>

            {delivery.latitude && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-xs text-gray-500 mb-1">Last known position</p>
                <p className="font-mono text-sm text-gray-700">
                  {delivery.latitude.toFixed(6)}, {delivery.longitude?.toFixed(6)}
                </p>
              </div>
            )}

            <div className="mb-4">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (optional)"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
            </div>

            <div className="flex flex-col gap-3">
              {NEXT_STATUS[delivery.status] && (
                <button
                  onClick={() => updateStatus(NEXT_STATUS[delivery.status]!)}
                  disabled={isUpdating}
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50"
                >
                  {isUpdating ? 'Updating...' : `Mark as ${STATUS_LABELS[NEXT_STATUS[delivery.status]!]}`}
                </button>
              )}

              {delivery.status === 'IN_TRANSIT' && (
                <button
                  onClick={updateLocation}
                  className="w-full bg-blue-500 text-white py-3 rounded-xl font-medium hover:bg-blue-600"
                >
                  📍 Update my location
                </button>
              )}

              {delivery.status !== 'DELIVERED' && delivery.status !== 'FAILED' && (
                <button
                  onClick={() => updateStatus('FAILED')}
                  disabled={isUpdating}
                  className="w-full border border-red-300 text-red-500 py-3 rounded-xl font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  ❌ Report failure
                </button>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">History</p>
              <div className="space-y-2">
                {delivery.events.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{STATUS_LABELS[event.status]}</p>
                      {event.note && <p className="text-xs text-gray-400">{event.note}</p>}
                      <p className="text-xs text-gray-300">{new Date(event.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
