import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import type { ToastTone } from '../../lib/toast/ToastContext'

interface ToastEntry {
  id: string
  message: string
  tone: ToastTone
}

const TONE_ICON: Record<ToastTone, typeof Info> = {
  default: Info,
  success: CheckCircle2,
  destructive: XCircle,
}

const TONE_ICON_COLOR: Record<ToastTone, string> = {
  default: 'text-accent',
  success: 'text-success',
  destructive: 'text-destructive',
}

function ToastCard({ message, tone, onDismiss }: { message: string; tone: ToastTone; onDismiss: () => void }) {
  const Icon = TONE_ICON[tone]

  return (
    <div
      role="status"
      className="animate-fade-in flex items-start gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3 shadow-[var(--shadow-popover)]"
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${TONE_ICON_COLOR[tone]}`} aria-hidden="true" />
      <p className="flex-1 text-sm font-medium leading-snug text-foreground">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export function ToastViewport({ toasts, onDismiss }: { toasts: ToastEntry[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:items-end"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-full max-w-sm">
          <ToastCard message={toast.message} tone={toast.tone} onDismiss={() => onDismiss(toast.id)} />
        </div>
      ))}
    </div>
  )
}
