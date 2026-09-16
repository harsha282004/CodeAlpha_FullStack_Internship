import { CalendarDays } from 'lucide-react'

interface DashboardHeaderProps {
  name: string
}

// The date is read from `new Date()` at render time — never hardcoded —
// and reformatted with Intl.DateTimeFormat, the same approach the rest of
// this app uses for real timestamps (see lib/format.ts). The greeting name
// always comes from the authenticated user's own profile (see
// routes/_authenticated/app/dashboard.tsx), never a fixed string.
export function DashboardHeader({ name }: DashboardHeaderProps) {
  const today = new Date()
  const formatted = today.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[44px]">
          Welcome back, {name}! <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-2 max-w-xl text-base text-slate-500 sm:text-lg">
          Here's what's happening across your projects today.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm shadow-slate-900/[0.03] sm:flex-col sm:items-end sm:gap-1 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:text-right">
        <CalendarDays className="h-5 w-5 text-indigo-500 sm:hidden" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-slate-700 sm:text-base">{formatted}</p>
          <p className="hidden text-sm text-slate-400 sm:block">Let's make progress today!</p>
        </div>
      </div>
    </div>
  )
}
