import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOrder } from '../api/orders.js'
import { getErrorMessage } from '../api/client.js'
import Spinner from '../components/ui/Spinner.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import OrderStatusBadge from '../components/order/OrderStatusBadge.jsx'
import { handleImageError } from '../utils/image.js'

export default function OrderDetail() {
  const { id } = useParams()
  return <OrderDetailView key={id} id={id} />
}

function OrderDetailView({ id }) {
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    getOrder(id)
      .then((data) => {
        if (cancelled) return
        setOrder(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        if (err?.response?.status === 404) {
          setStatus('not-found')
        } else {
          setError(getErrorMessage(err))
          setStatus('error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  if (status === 'loading') {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  if (status === 'not-found') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-800">Order not found</h1>
        <p className="mt-3 text-slate-500">This order doesn&apos;t exist or doesn&apos;t belong to your account.</p>
        <div className="mt-6 flex justify-center">
          <Link to="/orders">
            <Button variant="secondary">Back to Order History</Button>
          </Link>
        </div>
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

  const address = order.shippingAddress

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/orders" className="text-sm font-medium text-slate-500 hover:text-slate-900">
        &larr; Back to Order History
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Order Details</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-1 break-all font-mono text-sm text-slate-500">{order.id}</p>
      <p className="text-sm text-slate-500">Placed on {new Date(order.createdAt).toLocaleString()}</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-slate-900">Shipping Address</h2>
          <address className="mt-2 not-italic text-sm text-slate-600">
            {address.fullName}
            <br />
            {address.addressLine1}
            <br />
            {address.addressLine2 && (
              <>
                {address.addressLine2}
                <br />
              </>
            )}
            {address.city}, {address.state} {address.postalCode}
            <br />
            {address.country}
          </address>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900">Order Summary</h2>
          <p className="mt-2 text-sm text-slate-500">
            Prices shown are what you paid at checkout - they stay the same even if the product price changes
            later.
          </p>
          <div className="mt-4 flex justify-between text-lg font-bold text-slate-900">
            <span>Total</span>
            <span>${Number(order.total).toFixed(2)}</span>
          </div>
        </Card>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <img
              src={item.imageUrl}
              onError={handleImageError}
              alt={item.name}
              className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium text-slate-900">{item.name}</p>
              <p className="text-sm text-slate-500">
                ${Number(item.unitPrice).toFixed(2)} &times; {item.quantity}
              </p>
            </div>
            <p className="flex-shrink-0 font-semibold text-slate-900">${Number(item.subtotal).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Link to="/products">
          <Button variant="secondary">Continue Shopping</Button>
        </Link>
      </div>
    </div>
  )
}
