import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Rss } from 'lucide-react'
import { useAuth } from '../lib/auth/AuthContext'
import { Button } from '../components/ui/Button'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { status } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'authenticated') {
      navigate({ to: '/feed' })
    }
  }, [status, navigate])

  if (status === 'authenticated') return null

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 text-center">
      <div className="animate-fade-in flex flex-col items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Rss className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">Connectly</h1>
        <p className="text-balance max-w-md text-lg text-muted-foreground">
          A calmer social feed, built around the people you actually follow.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/register">
          <Button size="lg">Create an account</Button>
        </Link>
        <Link to="/login">
          <Button size="lg" variant="outline">
            Log in
          </Button>
        </Link>
      </div>
    </div>
  )
}
