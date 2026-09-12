export function getStockStatus(stock) {
  if (stock <= 0) {
    return { label: 'Out of stock', className: 'text-red-600' }
  }
  if (stock <= 10) {
    return { label: `Low stock: ${stock} left`, className: 'text-amber-600' }
  }
  return { label: 'In stock', className: 'text-emerald-600' }
}
