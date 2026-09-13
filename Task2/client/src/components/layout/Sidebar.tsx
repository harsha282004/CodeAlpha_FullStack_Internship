import { Link, useRouterState } from '@tanstack/react-router'
import type { ComponentType } from 'react'
import { Compass, Home, LogOut, Moon, Rss, Search, Settings, Sun, User } from 'lucide-react'
import { useAuth } from '../../lib/auth/AuthContext'
import { useTheme } from '../../lib/theme/ThemeContext'
import { Avatar } from '../ui/Avatar'

interface NavIconProps {
  className?: string
  strokeWidth?: number
}

function NavLink({
  to,
  label,
  icon: Icon,
}: {
  to: '/feed' | '/explore' | '/search' | '/settings'
  label: string
  icon: ComponentType<NavIconProps>
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isActive = pathname === to

  return (
    <Link
      to={to}
      className={`flex items-center gap-4 rounded-xl px-3 py-2.5 text-[0.95rem] font-medium transition-colors ${
        isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={isActive ? 2.4 : 2} />
      <span className="hidden lg:inline">{label}</span>
    </Link>
  )
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isOwnProfileActive = user ? pathname === `/profile/${user.username}` : false

  return (
    <aside className="sticky top-0 z-30 hidden h-screen w-[76px] shrink-0 flex-col border-r border-border bg-background sm:flex lg:w-[248px]">
      <Link to="/feed" className="flex h-16 items-center gap-2.5 px-4 lg:px-6" aria-label="Connectly home">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Rss className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="hidden text-lg font-bold tracking-tight text-foreground lg:inline">Connectly</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2" aria-label="Primary">
        <NavLink to="/feed" label="Home" icon={Home} />
        <NavLink to="/explore" label="Explore" icon={Compass} />
        <NavLink to="/search" label="Search" icon={Search} />

        {user && (
          <Link
            to="/profile/$username"
            params={{ username: user.username }}
            className={`flex items-center gap-4 rounded-xl px-3 py-2.5 text-[0.95rem] font-medium transition-colors ${
              isOwnProfileActive
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <User className="h-[22px] w-[22px] shrink-0" strokeWidth={isOwnProfileActive ? 2.4 : 2} />
            <span className="hidden lg:inline">Profile</span>
          </Link>
        )}

        {user && <NavLink to="/settings" label="Settings" icon={Settings} />}
      </nav>

      {user && (
        <div className="border-t border-border p-3">
          <Link
            to="/profile/$username"
            params={{ username: user.username }}
            className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted"
          >
            <Avatar src={user.avatarUrl} name={user.name} size="md" />
            <span className="hidden min-w-0 flex-col text-left lg:flex">
              <span className="truncate text-sm font-semibold text-foreground">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === 'dark' ? (
              <Sun className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            ) : (
              <Moon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            )}
            <span className="hidden lg:inline">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <span className="hidden lg:inline">Log out</span>
          </button>
        </div>
      )}
    </aside>
  )
}
