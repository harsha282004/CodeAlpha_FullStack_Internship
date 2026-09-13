import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Rss } from 'lucide-react'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Ambient background: two soft color fields plus a faint node grid —
          fills the empty space around the card without becoming an
          illustration. Every value is low-opacity and purely decorative. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-[-12%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/25 blur-[110px]" />
        <div className="absolute bottom-[-18%] right-[-8%] h-[26rem] w-[26rem] rounded-full bg-accent/20 blur-[100px]" />
        <div className="absolute left-[-10%] bottom-[10%] h-[18rem] w-[18rem] rounded-full bg-primary/10 blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(color-mix(in oklch, var(--color-foreground) 70%, transparent) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        <Link to="/" className="animate-fade-in mb-10 flex items-center justify-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_0_6px_color-mix(in_oklch,var(--color-primary)_14%,transparent)]">
            <Rss className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-2xl font-extrabold tracking-tight text-foreground">Connectly</span>
        </Link>

        <div className="animate-scale-in rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-popover)] sm:p-8">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
      </div>
    </div>
  )
}
