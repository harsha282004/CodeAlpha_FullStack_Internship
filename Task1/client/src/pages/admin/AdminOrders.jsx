import { Fragment, useEffect, useState } from 'react'
import { listAllOrdersAdmin, updateOrderStatusAdmin } from '../../api/orders.js'
import { getErrorMessage } from '../../api/client.js'
import { useToast } from '../../hooks/useToast.js'
import { ORDER_STATUSES } from '../../utils/orderStatus.js'
import { handleImageError } from '../../utils/image.js'
import AdminNav from '../../components/layout/AdminNav.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Button from '../../components/ui/Button.jsx'

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
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

  function toggleExpanded(orderId) {
    setExpandedId((prev) => (prev === orderId ? null : orderId))
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminNav />
      <h1 className="text-2xl font-bold text-slate-900">Admin - Orders</h1>

      <div className="mt-6">
        {status === 'loading' && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {status === 'error' && <ErrorState description={error} />}

        {status === 'ready' && orders.length === 0 && (
          <EmptyState title="No orders yet" description="Orders placed by customers will appear here." />
        )}

        {status === 'ready' && orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Order ID
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Customer
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Date
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Items
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Total
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isExpanded = expandedId === order.id
                  return (
                    <Fragment key={order.id}>
                      <tr className="border-b border-slate-100">
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
                            {ORDER_STATUSES.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 pr-4">
                          <Button
                            variant="secondary"
                            onClick={() => toggleExpanded(order.id)}
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? 'Hide' : 'Show'} details for order ${order.id}`}
                          >
                            {isExpanded ? 'Hide' : 'Details'}
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid gap-6 md:grid-cols-2">
                              <div>
                                <h3 className="text-sm font-semibold text-slate-900">Shipping Address</h3>
                                <address className="mt-1 not-italic text-sm text-slate-600">
                                  {order.shippingAddress.fullName}
                                  <br />
                                  {order.shippingAddress.addressLine1}
                                  <br />
                                  {order.shippingAddress.addressLine2 && (
                                    <>
                                      {order.shippingAddress.addressLine2}
                                      <br />
                                    </>
                                  )}
                                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                                  {order.shippingAddress.postalCode}
                                  <br />
                                  {order.shippingAddress.country}
                                </address>
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-slate-900">Items (purchase-time prices)</h3>
                                <ul className="mt-1 flex flex-col gap-2">
                                  {order.items.map((item) => (
                                    <li key={item.id} className="flex items-center gap-3 text-sm text-slate-600">
                                      <img
                                        src={item.imageUrl}
                                        onError={handleImageError}
                                        alt={item.name}
                                        className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                                      />
                                      <span className="min-w-0 flex-1 break-words">
                                        {item.name} &times; {item.quantity} (${Number(item.unitPrice).toFixed(2)}{' '}
                                        each)
                                      </span>
                                      <span className="flex-shrink-0 font-medium text-slate-900">
                                        ${Number(item.subtotal).toFixed(2)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
