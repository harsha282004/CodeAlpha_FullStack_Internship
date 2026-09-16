import { useState, type ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

// AppShell ⊃ Sidebar / Header / MainContent — the authenticated app frame
// every /app, /profile, and /settings route renders inside (see
// routes/_authenticated.tsx). On desktop the sidebar is a fixed column; on
// mobile it becomes a slide-over drawer opened from the header's menu
// button, closed by its own backdrop, Escape (handled by the browser's
// native <dialog>-less backdrop click here), or navigating.
export function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header onMenuClick={() => setMobileNavOpen(true)} />

      <div className="flex flex-1">
        <aside className="hidden w-[260px] shrink-0 border-r border-slate-200 bg-white lg:block">
          <Sidebar />
        </aside>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 w-[260px] max-w-[80vw] bg-white shadow-xl">
              <div className="flex h-[76px] items-center justify-between border-b border-slate-200 px-4">
                <span className="text-lg font-extrabold tracking-tight text-slate-900">TaskFlow</span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close navigation menu"
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
              <Sidebar onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  )
}
