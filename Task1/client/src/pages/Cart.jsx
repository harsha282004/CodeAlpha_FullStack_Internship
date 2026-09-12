import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../hooks/useCart.js'
import { useToast } from '../hooks/useToast.js'
import CartItem from '../components/cart/CartItem.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart, totalItems, totalPrice } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          title="Your cart is empty"
          description="Browse the catalogue and add something you like."
          action={
            <Link to="/products">
              <Button>Continue Shopping</Button>
            </Link>
          }
        />
      </div>
    )
  }

  function handleRemove(item) {
    removeItem(item.productId)
    showToast(`${item.name} removed from cart`, 'info')
  }

  function handleClearCart() {
    clearCart()
    showToast('Cart cleared', 'info')
  }

  function handleCheckout() {
    if (items.length === 0) return
    navigate('/checkout')
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Your Cart</h1>
        <button type="button" onClick={handleClearCart} className="text-sm font-medium text-slate-500 hover:text-red-600">
          Clear Cart
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {items.map((item) => (
          <CartItem
            key={item.productId}
            item={item}
            onIncrease={() => updateQuantity(item.productId, item.quantity + 1)}
            onDecrease={() => updateQuantity(item.productId, item.quantity - 1)}
            onQuantityChange={(quantity) => updateQuantity(item.productId, quantity)}
            onRemove={() => handleRemove(item)}
          />
        ))}
      </div>

      <Card className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">{totalItems} item{totalItems === 1 ? '' : 's'} in cart</p>
          <p className="text-xl font-bold text-slate-900">Total: ${totalPrice.toFixed(2)}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to="/products">
            <Button variant="secondary" className="w-full">
              Continue Shopping
            </Button>
          </Link>
          <Button className="w-full" disabled={items.length === 0} onClick={handleCheckout}>
            Proceed to Checkout
          </Button>
        </div>
      </Card>
    </div>
  )
}
