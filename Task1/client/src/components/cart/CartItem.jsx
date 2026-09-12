import { Link } from 'react-router-dom'
import { handleImageError } from '../../utils/image.js'

export default function CartItem({ item, onIncrease, onDecrease, onQuantityChange, onRemove }) {
  const isOutOfStock = item.stock <= 0
  const subtotal = item.price * item.quantity

  function handleInputChange(event) {
    const value = Number.parseInt(event.target.value, 10)
    if (Number.isNaN(value)) return
    onQuantityChange(value)
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
      <img
        src={item.imageUrl}
        onError={handleImageError}
        alt={item.name}
        className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
      />

      <div className="flex-1">
        <Link to={`/products/${item.slug}`} className="font-medium text-slate-900 hover:underline">
          {item.name}
        </Link>
        <p className="text-sm text-slate-500">${item.price.toFixed(2)} each</p>
        {isOutOfStock && <p className="mt-1 text-sm font-medium text-red-600">No longer available</p>}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDecrease}
          disabled={item.quantity <= 1}
          aria-label={`Decrease quantity of ${item.name}`}
          className="h-8 w-8 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          &minus;
        </button>
        <input
          type="number"
          value={item.quantity}
          min={1}
          max={item.stock}
          disabled={isOutOfStock}
          onChange={handleInputChange}
          aria-label={`Quantity of ${item.name}`}
          className="h-8 w-14 rounded-lg border border-slate-300 text-center text-sm"
        />
        <button
          type="button"
          onClick={onIncrease}
          disabled={item.quantity >= item.stock}
          aria-label={`Increase quantity of ${item.name}`}
          className="h-8 w-8 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          +
        </button>
      </div>

      <p className="w-20 text-right font-semibold text-slate-900">${subtotal.toFixed(2)}</p>

      <button
        type="button"
        onClick={onRemove}
        className="text-sm font-medium text-slate-500 hover:text-red-600"
        aria-label={`Remove ${item.name} from cart`}
      >
        Remove
      </button>
    </div>
  )
}
