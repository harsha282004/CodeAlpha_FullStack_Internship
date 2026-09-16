import type { LucideIcon } from 'lucide-react'

type Tone = 'violet' | 'mint' | 'peach' | 'sky'

const TONE_CLASSES: Record<Tone, { bg: string; iconBg: string; iconText: string }> = {
  violet: { bg: 'bg-violet-50', iconBg: 'bg-violet-100', iconText: 'text-violet-600' },
  mint: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
  peach: { bg: 'bg-orange-50', iconBg: 'bg-orange-100', iconText: 'text-orange-600' },
  sky: { bg: 'bg-sky-50', iconBg: 'bg-sky-100', iconText: 'text-sky-600' },
}

interface StatCardProps {
  icon: LucideIcon
  tone: Tone
  label: string
  value: string
  description: string
}

// One card design, four pastel tones — Total Projects / Total Tasks /
// Unread Notifications / Team Members all render through this, so the
// visual language (padding, radius, hierarchy) stays identical and only
// the color/content changes. `value` is always a string so a caller can
// pass "—" for "loading" or "unavailable" without this component needing
// to know why.
export function StatCard({ icon: Icon, tone, label, value, description }: StatCardProps) {
  const { bg, iconBg, iconText } = TONE_CLASSES[tone]

  return (
    <div
      className={`flex min-h-[150px] flex-col justify-between rounded-[20px] border border-black/[0.04] ${bg} p-6 shadow-sm shadow-slate-900/[0.03] transition-shadow hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${iconBg} ${iconText}`}>
          <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={2.25} />
        </span>
      </div>
      <div>
        <p className="text-[34px] font-extrabold leading-none tracking-tight text-slate-900">{value}</p>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  )
}
