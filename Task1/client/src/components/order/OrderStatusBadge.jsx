const STATUS_META = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  paid: { label: 'Paid', className: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Shipped', className: 'bg-indigo-100 text-indigo-700' },
  delivered: { label: 'Delivered', className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
}

const FALLBACK_META = { label: 'Unknown', className: 'bg-slate-100 text-slate-700' }

export default function OrderStatusBadge({ status }) {
  const meta = STATUS_META[status] ?? FALLBACK_META

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${meta.className}`}>{meta.label}</span>
  )
}
