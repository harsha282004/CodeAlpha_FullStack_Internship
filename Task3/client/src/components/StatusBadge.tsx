type Status = 'idle' | 'loading' | 'ok' | 'error'

const LABEL: Record<Status, string> = {
  idle: 'Idle',
  loading: 'Checking…',
  ok: 'Connected',
  error: 'Unreachable',
}

const COLOR: Record<Status, string> = {
  idle: 'bg-slate-200 text-slate-700',
  loading: 'bg-amber-100 text-amber-800',
  ok: 'bg-emerald-100 text-emerald-800',
  error: 'bg-red-100 text-red-800',
}

export function StatusBadge({ label, status }: { label: string; status: Status }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${COLOR[status]}`}>
        {LABEL[status]}
      </span>
    </div>
  )
}
