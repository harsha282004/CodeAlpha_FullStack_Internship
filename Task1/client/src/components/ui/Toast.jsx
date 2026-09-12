const VARIANT_CLASSES = {
  info: 'bg-slate-900 text-white',
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
}

export default function Toast({ message, variant = 'info' }) {
  return (
    <div
      className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${VARIANT_CLASSES[variant]}`}
      role="status"
    >
      {message}
    </div>
  )
}
