import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard, FolderKanban, UserCircle, Settings2, Sparkles } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/projects', label: 'Projects', icon: FolderKanban },
  { to: '/profile', label: 'Profile', icon: UserCircle },
  { to: '/settings', label: 'Settings', icon: Settings2 },
] as const

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="flex h-full flex-col justify-between p-4">
      <nav className="flex flex-col gap-2" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== '/app/dashboard' && pathname.startsWith(to))
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className={`flex h-[52px] items-center gap-3 rounded-[14px] px-4 text-[16px] font-semibold transition-colors ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" strokeWidth={2.1} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Purely motivational — no project/team data, real or fake, is
          displayed on this card. */}
      <div className="rounded-2xl bg-violet-50 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="mt-3 text-[15px] font-bold leading-snug text-slate-900">
          Build something amazing together
        </p>
        <p className="mt-1 text-sm leading-snug text-slate-500">
          Turn ideas into reality with your team.
        </p>
      </div>
    </div>
  )
}
