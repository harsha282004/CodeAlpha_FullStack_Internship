import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart.js'
import { createOrder } from '../api/orders.js'
import { getErrorMessage } from '../api/client.js'
import ShippingForm from '../components/checkout/ShippingForm.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Alert from '../components/ui/Alert.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

const EMPTY_ADDRESS = {
  fullName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
}

const REQUIRED_FIELDS = ['fullName', 'addressLine1', 'city', 'state', 'postalCode', 'country']
const POSTAL_CODE_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s-]{1,10}[A-Za-z0-9]$/

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart()
  const [address, setAddress] = useState(EMPTY_ADDRESS)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [order, setOrder] = useState(null)

  if (order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Order placed!</h1>
          <p className="mt-2 text-sm text-slate-500">
            This is a simulated checkout - no real payment was processed.
          </p>
          <dl className="mt-6 flex justify-center gap-10 text-sm">
            <div>
              <dt className="text-slate-500">Order ID</dt>
              <dd className="font-mono text-slate-900">{order.id.slice(0, 8)}...</dd>
            </div>
            <div>
              <dt className="text-slate-500">Total</dt>
              <dd className="font-semibold text-slate-900">${Number(order.total).toFixed(2)}</dd>
            </div>
          </dl>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link to={`/orders/${order.id}`}>
              <Button variant="secondary" className="w-full">
                View Order
              </Button>
            </Link>
            <Link to="/orders">
              <Button variant="secondary" className="w-full">
                View Order History
              </Button>
            </Link>
            <Link to="/products">
              <Button className="w-full">Continue Shopping</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          title="Your cart is empty"
          description="Add something to your cart before checking out."
          action={
            <Link to="/products">
              <Button>Browse Products</Button>
            </Link>
          }
        />
      </div>
    )
  }

  function handleChange(event) {
    const { name, value } = event.target
    setAddress((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function validate() {
    const nextErrors = {}
    for (const field of REQUIRED_FIELDS) {
      if (!address[field].trim()) {
        nextErrors[field] = 'Required'
      }
    }
    if (address.postalCode.trim() && !POSTAL_CODE_REGEX.test(address.postalCode.trim())) {
      nextErrors.postalCode = 'Enter a valid postal code'
    }
    return nextErrors
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setApiError('')
    setIsSubmitting(true)
    try {
      const payload = {
        shippingAddress: {
          fullName: address.fullName.trim(),
          addressLine1: address.addressLine1.trim(),
          ...(address.addressLine2.trim() ? { addressLine2: address.addressLine2.trim() } : {}),
          city: address.city.trim(),
          state: address.state.trim(),
          postalCode: address.postalCode.trim(),
          country: address.country.trim(),
        },
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      }
      const createdOrder = await createOrder(payload)
      // Only clear the cart after the backend confirms the order was created.
      clearCart()
      setOrder(createdOrder)
    } catch (err) {
      setApiError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>
      <p className="mt-1 text-sm text-slate-500">
        This is a simulated checkout - no real payment will be processed.
      </p>

      <div className="mt-6 grid gap-8 md:grid-cols-3">
        <form className="flex flex-col gap-4 md:col-span-2" onSubmit={handleSubmit} noValidate>
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Shipping Address</h2>
            <div className="mt-4">
              <ShippingForm values={address} errors={errors} onChange={handleChange} />
            </div>
          </Card>

          {apiError && <Alert variant="error">{apiError}</Alert>}

          <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
            Place Order
          </Button>
        </form>

        <Card className="h-fit">
          <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-2">
                <span className="text-slate-600">
                  {item.name} &times; {item.quantity}
                </span>
                <span className="font-medium text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 font-semibold text-slate-900">
            <span>Estimated Total</span>
            <span>${totalPrice.toFixed(2)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">The final total is calculated by the server at checkout.</p>
        </Card>
      </div>
    </div>
  )
}
