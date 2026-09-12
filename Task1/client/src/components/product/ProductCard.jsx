import { Link } from 'react-router-dom'
import Button from '../ui/Button.jsx'
import { handleImageError } from '../../utils/image.js'
import { getStockStatus } from '../../utils/stock.js'

export default function ProductCard({ product, onAddToCart }) {
  const stockStatus = getStockStatus(product.stock)
  const isOutOfStock = product.stock <= 0

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Link to={`/products/${product.slug}`} className="block">
        <img
          src={product.imageUrl}
          onError={handleImageError}
          alt={product.name}
          className="h-48 w-full object-cover"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{product.category}</span>
        <Link to={`/products/${product.slug}`} className="font-semibold text-slate-900 hover:underline">
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-slate-900">${Number(product.price).toFixed(2)}</span>
          <span className={`text-xs font-medium ${stockStatus.className}`}>{stockStatus.label}</span>
        </div>
        <div className="flex gap-2 pt-2">
          <Link to={`/products/${product.slug}`} className="flex-1">
            <Button variant="secondary" className="w-full">
              View Details
            </Button>
          </Link>
          <Button className="flex-1" disabled={isOutOfStock} onClick={() => onAddToCart(product)}>
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  )
}
