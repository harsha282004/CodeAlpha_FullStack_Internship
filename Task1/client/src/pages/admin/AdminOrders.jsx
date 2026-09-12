import { useEffect, useState } from 'react'
import { listAllOrdersAdmin, updateOrderStatusAdmin } from '../../api/orders.js'
import { getErrorMessage } from '../../api/client.js'
import { useToast } from '../../hooks/useToast.js'
import Spinner from '../../components/ui/Spinner.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'

const STATUS_OPTIONS = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const { showToast } = useToast()

  useEffect(() => {
    let cancelled = false
    listAllOrdersAdmin()
      .then((data) => {
        if (cancelled) return
        setOrders(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(getErrorMessage(err))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleStatusChange(orderId, newStatus) {
    setUpdatingId(orderId)
    try {
      const updated = await updateOrderStatusAdmin(orderId, newStatus)
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)))
      showToast('Order status updated', 'success')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState description={error} />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState title="No orders yet" description="Orders placed by customers will appear here." />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Admin - Orders</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4 font-medium">Order ID</th>
              <th className="py-2 pr-4 font-medium">Customer</th>
              <th className="py-2 pr-4 font-medium">Date</th>
              <th className="py-2 pr-4 font-medium">Items</th>
              <th className="py-2 pr-4 font-medium">Total</th>
              <th className="py-2 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-slate-100">
                <td className="py-3 pr-4 font-mono text-xs text-slate-500">{order.id.slice(0, 8)}...</td>
                <td className="py-3 pr-4">
                  <p className="text-slate-900">{order.customer.name}</p>
                  <p className="text-xs text-slate-500">{order.customer.email}</p>
                </td>
                <td className="py-3 pr-4 text-slate-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                <td className="py-3 pr-4 text-slate-600">{order.items.length}</td>
                <td className="py-3 pr-4 font-medium text-slate-900">${Number(order.total).toFixed(2)}</td>
                <td className="py-3 pr-4">
                  <select
                    value={order.status}
                    disabled={updatingId === order.id}
                    onChange={(event) => handleStatusChange(order.id, event.target.value)}
                    aria-label={`Update status for order ${order.id}`}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm capitalize disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
