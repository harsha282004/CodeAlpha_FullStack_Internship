const VARIANT_CLASSES = {
  error: 'bg-red-50 text-red-700 border-red-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  info: 'bg-slate-50 text-slate-700 border-slate-200',
}

export default function Alert({ variant = 'info', children }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${VARIANT_CLASSES[variant]}`} role="alert">
      {children}
    </div>
  )
}
