import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { AtSign, Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { RedirectIfAuthenticated } from '../lib/auth/RedirectIfAuthenticated'
import { useAuth } from '../lib/auth/AuthContext'
import { useToast } from '../lib/toast/ToastContext'
import { ApiError } from '../lib/api/client'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  return (
    <RedirectIfAuthenticated>
      <RegisterForm />
    </RedirectIfAuthenticated>
  )
}

// Mirrors the backend's actual validation (server/src/utils/validation.js)
// so a client-side rejection matches what the API would say anyway.
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/

function RegisterForm() {
  const { register } = useAuth()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validate(): string | null {
    if (name.trim().length === 0) return 'Enter your name.'
    if (!USERNAME_PATTERN.test(username.trim().toLowerCase())) {
      return 'Username must be 3-30 characters: lowercase letters, numbers, and underscores only.'
    }
    if (email.trim().length === 0) return 'Enter your email.'
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (password !== confirmPassword) return 'Passwords do not match.'
    return null
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await register({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        password,
      })
      showToast({ tone: 'success', message: 'Welcome to Connectly!' })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Connectly and start sharing."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          leadingIcon={<User className="h-4 w-4" aria-hidden="true" />}
          required
        />
        <Input
          label="Username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          leadingIcon={<AtSign className="h-4 w-4" aria-hidden="true" />}
          hint="3-30 characters: lowercase letters, numbers, underscores."
          required
        />
        <Input
          type="email"
          label="Email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          leadingIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
          required
        />
        <Input
          type={showPassword ? 'text' : 'password'}
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          leadingIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
          trailingElement={
            <button
              type="button"
              onClick={() => setShowPassword((show) => !show)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          }
          hint="At least 8 characters."
          required
        />
        <Input
          type={showPassword ? 'text' : 'password'}
          label="Confirm password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          leadingIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
          required
        />
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
