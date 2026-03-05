import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { pharmaciesApi } from '../services/api'

interface Order {
  id: string
  patientId: string
  pharmacyId: string
  status: string
  prescriptionUrl: string | null
  notes: string | null
  createdAt: string
  items: { id: string; name: string; quantity: number; unitPrice: number }[]
}

export default function PharmacistDashboard() {
  const { logout } = useAuth()
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [note, setNote] = useState('')

  // In a real app this would filter by pharmacyId from user context
  // For now we show all orders from our test pharmacy
  const PHARMACY_ID = '8d5a116f-3533-49cf-bd6c-13ea1c4ecc2a'

  useEffect(() => {
    pharmaciesApi.getById(PHARMACY_ID)
      .then(() => setIsLoading(false))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const validate = async (orderId: string, approved: boolean) => {
    setProcessing(orderId)
    try {
      await pharmaciesApi.validatePrescription({ orderId, approved, note })
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId))
      alert(approved ? '✅ Prescription approved' : '❌ Prescription rejected')
    } catch {
      alert('Failed to validate prescription')
    } finally {
      setProcessing(null)
      setNote('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💊</span>
          <span className="font-bold text-gray-900 text-lg">MedDeliver</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
            Pharmacist
          </span>
          <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 font-medium">
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Prescription Validation</h1>
          <p className="text-gray-500 mt-1">Review and approve incoming orders</p>
        </div>

        {isLoading && (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        )}

        {!isLoading && pendingOrders.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-gray-500">No pending prescriptions</p>
            <p className="text-gray-400 text-sm mt-1">Use the form below to validate by order ID</p>
          </div>
        )}

        {/* Manual validation form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-4">
          <h2 className="font-semibold text-gray-900 mb-4">Validate a prescription</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
              <input
                id="orderId"
                type="text"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste order ID here"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a note..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const id = (document.getElementById('orderId') as HTMLInputElement).value
                  if (id) validate(id, true)
                }}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                ✅ Approve
              </button>
              <button
                onClick={() => {
                  const id = (document.getElementById('orderId') as HTMLInputElement).value
                  if (id) validate(id, false)
                }}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                ❌ Reject
              </button>
            </div>
          </div>
        </div>

        {/* Orders pending validation */}
        {pendingOrders.length > 0 && (
          <div className="space-y-4 mt-6">
            {pendingOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl border border-yellow-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-500 mt-1">Patient: {order.patientId.slice(0, 8)}</p>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    ⏳ Pending
                  </span>
                </div>
                <div className="space-y-1 mb-4">
                  {order.items.map((item) => (
                    <p key={item.id} className="text-sm text-gray-700">
                      {item.name} x{item.quantity}
                    </p>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    disabled={processing === order.id}
                    onClick={() => validate(order.id, true)}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={processing === order.id}
                    onClick={() => validate(order.id, false)}
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
