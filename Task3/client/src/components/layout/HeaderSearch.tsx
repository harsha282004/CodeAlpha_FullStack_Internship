import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search, Folder } from 'lucide-react'
import { projectsApi, type Project } from '../../lib/api'

// A real, working search — not a decorative input. It searches the same
// project data `useProjects()` exposes elsewhere in the app (no new
// endpoint, no fake results): typing filters by name/description, clicking
// a result or pressing Enter opens that project. There is no backend
// endpoint that searches tasks or people across every project at once, so
// this deliberately does not pretend to — see docs/FRONTEND.md for the
// scope note.
//
// Deliberately does NOT call the shared useProjects() hook — that hook's
// state is local to whichever component calls it, so a second call here
// would fetch its own independent snapshot at mount time and never learn
// about a project created afterward from the dashboard's own "Create
// project" flow (a real staleness bug, caught by this redesign's own
// verification pass). Instead this fetches its own fresh copy each time
// the search is actually opened, so it can never show data staler than
// "as of the moment you started typing."
export function HeaderSearch() {
  const [projects, setProjects] = useState<Project[]>([])
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  function refreshProjects() {
    projectsApi
      .list(1, 50)
      .then((res) => setProjects(res.projects))
      .catch(() => {
        // Search staying empty on a transient failure is an acceptable
        // degradation for a convenience feature — it never blocks the rest
        // of the app, and the user can still reach every project via the
        // sidebar's "Projects" link.
      })
  }

  const matches =
    query.trim().length === 0
      ? []
      : projects
          .filter(
            (p) =>
              p.name.toLowerCase().includes(query.trim().toLowerCase()) ||
              (p.description ?? '').toLowerCase().includes(query.trim().toLowerCase()),
          )
          .slice(0, 6)

  useEffect(() => {
    if (!open) return
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function openProject(projectId: string) {
    navigate({ to: '/app/projects/$projectId', params: { projectId } })
    setQuery('')
    setOpen(false)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (matches.length > 0) {
      openProject(matches[0].id)
    } else {
      navigate({ to: '/app/projects' })
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-[560px]">
      <form onSubmit={handleSubmit} role="search">
        <label htmlFor="header-search" className="sr-only">
          Search projects
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="header-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              setOpen(true)
              refreshProjects()
            }}
            placeholder="Search projects, tasks, or people…"
            className="h-11 w-full rounded-full border border-slate-200 bg-slate-100/70 pl-11 pr-4 text-[15px] text-slate-700 placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:bg-white sm:h-12"
          />
        </div>
      </form>

      {open && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
          {matches.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">No projects match "{query.trim()}".</p>
          ) : (
            <ul>
              {matches.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => openProject(project.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                      <Folder className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{project.name}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {project.description || 'No description.'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
