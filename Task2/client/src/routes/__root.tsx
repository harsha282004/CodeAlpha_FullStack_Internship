import type { ReactNode } from 'react'
import { Outlet, createRootRoute, HeadContent, Scripts, Link } from '@tanstack/react-router'
import { Compass } from 'lucide-react'
import appCss from '../styles.css?url'
import { ThemeProvider } from '../lib/theme/ThemeContext'
import { ToastProvider } from '../lib/toast/ToastContext'
import { AuthProvider } from '../lib/auth/AuthContext'
import { Button } from '../components/ui/Button'

// Applies a previously-chosen light theme before first paint, so returning
// visitors don't see a flash of the dark default. Dark needs no script since
// it's already what the CSS defaults to.
const THEME_BOOTSTRAP_SCRIPT = `
try {
  if (localStorage.getItem('connectly.theme') === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
} catch (e) {}
`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Connectly' },
      { name: 'description', content: 'Connectly — a modern social platform.' },
      { name: 'theme-color', content: '#181820' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
      </div>
      <Link to="/">
        <Button variant="outline">Back to Connectly</Button>
      </Link>
    </div>
  )
}

function RootComponent() {
  return (
    <RootDocument>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
