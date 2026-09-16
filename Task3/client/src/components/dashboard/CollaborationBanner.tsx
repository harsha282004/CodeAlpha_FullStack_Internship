import { TrendingUp } from 'lucide-react'

// Purely decorative/motivational — no data, real or fake, is displayed
// here. The "chart" is CSS bars, not an image or a fabricated analytics
// widget.
export function CollaborationBanner() {
  return (
    <div className="relative overflow-hidden rounded-[20px] border border-violet-100 bg-gradient-to-r from-violet-50 via-indigo-50 to-violet-50 px-7 py-8 sm:px-9">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="max-w-xl">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Turn ideas into achievement</h2>
          <p className="mt-1.5 text-[15px] text-slate-600 sm:text-base">
            Collaborate, stay organized, and build amazing things together.
          </p>
        </div>

        <div className="flex shrink-0 items-end gap-1.5" aria-hidden="true">
          <span className="h-8 w-3 rounded-full bg-violet-200" />
          <span className="h-12 w-3 rounded-full bg-violet-300" />
          <span className="h-16 w-3 rounded-full bg-indigo-400" />
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
            <TrendingUp className="h-7 w-7 text-indigo-600" strokeWidth={2} />
          </span>
        </div>
      </div>
    </div>
  )
}
