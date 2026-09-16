import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Menu, LayoutGrid, ChevronDown } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useSocket } from '../../realtime/SocketContext'
import { Avatar } from '../ui/Avatar'
import { ConnectionDot } from '../ui/Feedback'
import { NotificationBell } from './NotificationBell'
import { HeaderSearch } from './HeaderSearch'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth()
  const { status } = useSocket()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <header className="flex h-[76px] items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <Link to="/app/dashboard" className="flex shrink-0 items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
          <LayoutGrid className="h-5 w-5" aria-hidden="true" strokeWidth={2.25} />
        </span>
        <span className="hidden sm:block">
          <span className="block text-[22px] font-extrabold leading-none tracking-tight text-slate-900">
            TaskFlow
          </span>
          <span className="block text-[11px] font-medium leading-tight text-slate-400">
            Plan. Collaborate. Build.
          </span>
        </span>
      </Link>

      <div className="hidden flex-1 justify-center md:flex">
        <HeaderSearch />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center sm:flex">
          <ConnectionDot status={status} />
        </div>
        <NotificationBell />

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100 sm:pr-3"
          >
            <span className="relative shrink-0">
              <Avatar name={user?.name ?? '?'} avatarUrl={user?.avatarUrl} />
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"
                aria-hidden="true"
                title="Online"
              />
            </span>
            <span className="hidden text-left sm:block">
              <span className="block max-w-[120px] truncate text-sm font-semibold text-slate-800">
                {user?.name}
              </span>
            </span>
            <ChevronDown className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" aria-hidden="true" />
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-20 cursor-default"
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
                  <p className="truncate text-xs text-slate-500">@{user?.username}</p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Profile
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
