import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProductBySlug } from '../api/products.js'
import { getErrorMessage } from '../api/client.js'
import { useCart } from '../hooks/useCart.js'
import { useToast } from '../hooks/useToast.js'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import { handleImageError } from '../utils/image.js'
import { getStockStatus } from '../utils/stock.js'

// Keyed by slug so navigating between products fully remounts this view -
// quantity/product/status state all start fresh without manual resets in effects.
export default function ProductDetail() {
  const { slug } = useParams()
  return <ProductDetailView key={slug} slug={slug} />
}

function ProductDetailView({ slug }) {
  const { addItem } = useCart()
  const { showToast } = useToast()

  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    let cancelled = false

    getProductBySlug(slug)
      .then((data) => {
        if (cancelled) return
        setProduct(data)
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
  }, [slug])

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
        <h1 className="text-2xl font-semibold text-slate-800">Product not found</h1>
        <p className="mt-3 text-slate-500">We couldn&apos;t find a product at this address.</p>
        <div className="mt-6 flex justify-center">
          <Link to="/products">
            <Button variant="secondary">Back to Products</Button>
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

  const stockStatus = getStockStatus(product.stock)
  const isOutOfStock = product.stock <= 0

  function handleQuantityChange(event) {
    const value = Number.parseInt(event.target.value, 10)
    if (Number.isNaN(value)) return
    setQuantity(Math.min(Math.max(value, 1), Math.max(product.stock, 1)))
  }

  function handleAddToCart() {
    const outcome = addItem(product, quantity)
    if (outcome.status === 'added') {
      showToast(`${product.name} added to cart`, 'success')
    } else if (outcome.status === 'clamped') {
      showToast(`Only ${outcome.added} more ${product.name} available - cart updated`, 'info')
    } else {
      showToast(`${product.name} is out of stock`, 'error')
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link to="/products" className="text-sm font-medium text-slate-500 hover:text-slate-900">
        &larr; Back to Products
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <img
          src={product.imageUrl}
          onError={handleImageError}
          alt={product.name}
          className="w-full rounded-xl border border-slate-200 object-cover"
        />

        <div className="flex flex-col gap-4">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{product.category}</span>
          <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
          <p className="text-2xl font-semibold text-slate-900">${Number(product.price).toFixed(2)}</p>
          <p className="text-slate-600">{product.description}</p>
          <p className={`text-sm font-medium ${stockStatus.className}`}>{stockStatus.label}</p>

          {!isOutOfStock && (
            <div className="flex items-center gap-3">
              <label htmlFor="quantity" className="text-sm font-medium text-slate-700">
                Quantity
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                max={product.stock}
                value={quantity}
                onChange={handleQuantityChange}
                className="h-10 w-20 rounded-lg border border-slate-300 px-3 text-center text-sm"
              />
            </div>
          )}

          <Button className="mt-2 w-full sm:w-auto" disabled={isOutOfStock} onClick={handleAddToCart}>
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </div>
    </div>
  )
}
