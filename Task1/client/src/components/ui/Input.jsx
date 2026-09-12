export default function Input({ label, error, id, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${
          error ? 'border-red-400' : 'border-slate-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
