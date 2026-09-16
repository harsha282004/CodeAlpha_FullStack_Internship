import { FolderPlus } from 'lucide-react'
import { Link } from '@tanstack/react-router'

// A deliberately larger, more intentional empty state than a generic
// "nothing here" message — this is often the very first thing a brand-new
// user sees on this app, so it doubles as an onboarding prompt rather than
// dead space.
export function EmptyProjectState() {
  return (
    <div className="flex flex-col items-center gap-5 px-6 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
        <FolderPlus className="h-8 w-8" aria-hidden="true" strokeWidth={1.75} />
      </span>
      <div className="max-w-sm space-y-2">
        <h3 className="text-2xl font-bold text-slate-900">Create your first project</h3>
        <p className="text-base text-slate-500">
          Start by creating a project to organize your work, invite team members, and get things done together.
        </p>
      </div>
      <Link
        to="/app/projects"
        className="inline-flex h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 text-base font-semibold text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-500"
      >
        + Create a project
      </Link>
    </div>
  )
}
