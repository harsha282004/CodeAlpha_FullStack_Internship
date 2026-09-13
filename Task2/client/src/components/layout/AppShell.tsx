import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { MobileTopBar } from './MobileTopBar'

interface AppShellProps {
  children: ReactNode
  rightPanel?: ReactNode
}

/**
 * The three-column app layout: sticky left nav rail (icons-only on tablet,
 * labeled on desktop), centered content column, optional right discovery
 * panel on wide screens. Mobile swaps the rail for a top bar + bottom nav.
 *
 * The sidebar is a normal flex child (sticky, not fixed) specifically so it
 * shares the same centered `max-w-[1200px]` coordinate frame as the content
 * column at every viewport width. A `fixed left-0` sidebar would only line
 * up with this centered wrapper exactly at 1200px — wider than that, the
 * wrapper's auto margins push the content right while the fixed sidebar
 * stays pinned to the real viewport edge, opening a growing gap between them.
 */
export function AppShell({ children, rightPanel }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1200px]">
        <Sidebar />
        <div className="min-h-screen w-full max-w-2xl flex-1 border-x border-border">
          <MobileTopBar />
          <main className="pb-20 sm:pb-10">{children}</main>
        </div>
        {rightPanel && (
          <aside className="hidden w-[320px] shrink-0 xl:block">
            <div className="sticky top-0 max-h-screen space-y-4 overflow-y-auto px-4 py-6">{rightPanel}</div>
          </aside>
        )}
      </div>
      <MobileNav />
    </div>
  )
}
