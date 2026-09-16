import type { ReactNode } from 'react'
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { AuthProvider } from '../auth/AuthContext'
import { SocketProvider } from '../realtime/SocketContext'
import { ToastProvider } from '../components/ui/ToastContext'
import appCss from '../styles/global.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'TaskFlow' },
      { name: 'description', content: 'TaskFlow — collaborative project management.' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
})

// Provider order matters: SocketProvider reads auth status from
// AuthProvider (a socket only ever connects once authenticated — see
// realtime/SocketContext.tsx), so it must be nested inside it. ToastProvider
// doesn't depend on either and wraps everything so any screen can call
// useToast().
function RootComponent() {
  return (
    <RootDocument>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <Outlet />
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
