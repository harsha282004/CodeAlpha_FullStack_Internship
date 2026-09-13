import { Link, useRouterState } from '@tanstack/react-router'
import { Compass, Home, Search, User } from 'lucide-react'
import { useAuth } from '../../lib/auth/AuthContext'

const ITEMS: Array<{ to: '/feed' | '/explore' | '/search'; label: string; icon: typeof Home }> = [
  { to: '/feed', label: 'Home', icon: Home },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/search', label: 'Search', icon: Search },
]

export function MobileNav() {
  const { user } = useAuth()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch justify-around border-t border-border bg-surface-elevated/95 backdrop-blur sm:hidden"
      aria-label="Primary"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITEMS.map(({ to, label, icon: Icon }) => {
        const isActive = pathname === to
        return (
          <Link key={to} to={to} aria-label={label} className="flex flex-1 flex-col items-center justify-center gap-0.5">
            <Icon className={isActive ? 'h-6 w-6 text-primary' : 'h-6 w-6 text-muted-foreground'} strokeWidth={isActive ? 2.4 : 2} />
          </Link>
        )
      })}
      {user && (
        <Link
          to="/profile/$username"
          params={{ username: user.username }}
          aria-label="Profile"
          className="flex flex-1 flex-col items-center justify-center gap-0.5"
        >
          <User
            className={pathname === `/profile/${user.username}` ? 'h-6 w-6 text-primary' : 'h-6 w-6 text-muted-foreground'}
            strokeWidth={pathname === `/profile/${user.username}` ? 2.4 : 2}
          />
        </Link>
      )}
    </nav>
  )
}
