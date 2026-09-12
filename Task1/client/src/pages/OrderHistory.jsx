import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listOrders } from '../api/orders.js'
import { getErrorMessage } from '../api/client.js'
import OrderStatusBadge from '../components/order/OrderStatusBadge.jsx'
import { ORDER_STATUSES } from '../utils/orderStatus.js'
import Spinner from '../components/ui/Spinner.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Button from '../components/ui/Button.jsx'

export default function OrderHistory() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    listOrders()
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

  const visibleOrders = useMemo(
    () => (statusFilter ? orders.filter((order) => order.status === statusFilter) : orders),
    [orders, statusFilter],
  )

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
        <EmptyState
          title="No orders yet"
          description="Your past orders will appear here once you place one."
          action={
            <Link to="/products">
              <Button>Browse Products</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Order History</h1>
        <Link to="/products">
          <Button variant="secondary">Continue Shopping</Button>
        </Link>
      </div>

      {orders.length > 1 && (
        <div className="mt-4 flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-slate-700">
            Filter by status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm capitalize"
          >
            <option value="">All</option>
            {ORDER_STATUSES.map((option) => (
              <option key={option} value={option} className="capitalize">
                {option}
              </option>
            ))}
          </select>
        </div>
      )}

      {visibleOrders.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No orders match this status" description="Try a different filter." />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {visibleOrders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-sm text-slate-500">{order.id.slice(0, 8)}...</p>
                <p className="text-sm text-slate-500">
                  {new Date(order.createdAt).toLocaleDateString()} &middot; {order.items.length} item
                  {order.items.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <OrderStatusBadge status={order.status} />
                <span className="font-semibold text-slate-900">${Number(order.total).toFixed(2)}</span>
                <Link to={`/orders/${order.id}`} aria-label={`View order ${order.id}`}>
                  <Button variant="secondary">View</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
