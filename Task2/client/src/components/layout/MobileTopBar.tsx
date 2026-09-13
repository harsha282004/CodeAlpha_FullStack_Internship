import { Link } from '@tanstack/react-router'
import { Moon, Rss, Settings, Sun } from 'lucide-react'
import { useTheme } from '../../lib/theme/ThemeContext'
import { IconButton } from '../ui/IconButton'

export function MobileTopBar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur sm:hidden">
      <Link to="/feed" className="flex items-center gap-2" aria-label="Connectly home">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Rss className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="text-base font-bold tracking-tight text-foreground">Connectly</span>
      </Link>
      <div className="flex items-center gap-1">
        <IconButton label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </IconButton>
        <Link
          to="/settings"
          aria-label="Settings"
          title="Settings"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </header>
  )
}
