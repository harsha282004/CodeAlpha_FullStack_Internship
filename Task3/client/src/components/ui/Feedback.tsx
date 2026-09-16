import type { ReactNode } from 'react'

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin text-indigo-600 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export function PageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
      <Spinner className="h-7 w-7" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`tf-skeleton rounded-md ${className}`} aria-hidden="true" />
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      {icon && <div className="text-3xl text-slate-300">{icon}</div>}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center"
    >
      <p className="text-sm font-medium text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          Try again
        </button>
      )}
    </div>
  )
}

// Small inline connection indicator for the header — never blocks the rest
// of the UI, since REST remains the source of truth even while realtime is
// disconnected (see realtime/SocketContext.tsx).
export function ConnectionDot({ status }: { status: 'connected' | 'connecting' | 'disconnected' }) {
  const label =
    status === 'connected' ? 'Live updates connected' : status === 'connecting' ? 'Connecting…' : 'Live updates offline'
  const color =
    status === 'connected' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-amber-400' : 'bg-slate-300'

  return (
    <span className="inline-flex items-center gap-1.5" title={label}>
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
