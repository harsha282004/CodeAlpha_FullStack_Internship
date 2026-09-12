import Spinner from './Spinner.jsx'

const VARIANT_CLASSES = {
  primary: 'bg-slate-900 text-white hover:bg-slate-700 focus-visible:outline-slate-900',
  secondary: 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600',
}

const SPINNER_TONE = {
  primary: 'light',
  secondary: 'dark',
  danger: 'light',
}

export default function Button({
  variant = 'primary',
  className = '',
  isLoading = false,
  disabled = false,
  children,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Spinner size="sm" tone={SPINNER_TONE[variant]} />}
      {children}
    </button>
  )
}
