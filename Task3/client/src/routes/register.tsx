import { useState, type FormEvent } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../lib/api'
import { Button } from '../components/ui/Button'
import { InputField } from '../components/ui/FormField'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

// Mirrors server/src/validators/auth.validator.js exactly — client-side
// validation is a UX convenience only; the backend re-validates every one
// of these rules itself and remains the actual authority.
const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FieldErrors {
  name?: string
  username?: string
  email?: string
  password?: string
}

function validate(name: string, username: string, email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!name.trim()) errors.name = 'Name is required.'
  else if (name.trim().length > 100) errors.name = 'Name must be at most 100 characters.'

  if (!USERNAME_REGEX.test(username)) {
    errors.username = 'Username must be 3-30 characters: lowercase letters, numbers, and underscores only.'
  }
  if (!EMAIL_REGEX.test(email)) errors.email = 'Enter a valid email address.'
  if (password.length < 8) errors.password = 'Password must be at least 8 characters.'
  else if (password.length > 72) errors.password = 'Password must be at most 72 characters.'

  return errors
}

function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)

    const errors = validate(name, username, email, password)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    try {
      await register({ name: name.trim(), username: username.trim().toLowerCase(), email: email.trim(), password })
      navigate({ to: '/app/dashboard' })
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Start organizing projects with your team</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <InputField
            label="Full name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
            required
          />
          <InputField
            label="Username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={fieldErrors.username}
            hint={fieldErrors.username ? undefined : 'Lowercase letters, numbers, and underscores only.'}
            required
          />
          <InputField
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            required
          />
          <InputField
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            hint={fieldErrors.password ? undefined : 'At least 8 characters.'}
            required
          />

          {formError && (
            <p role="alert" className="text-sm text-red-600">
              {formError}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
