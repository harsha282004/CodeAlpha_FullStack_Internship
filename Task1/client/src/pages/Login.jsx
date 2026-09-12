import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { getErrorMessage } from '../api/client.js'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Alert from '../components/ui/Alert.jsx'
import Card from '../components/ui/Card.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.email.trim() || !form.password) {
      setError('Email and password are required.')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      await login(form.email.trim(), form.password)
      const redirectTo = location.state?.from?.pathname || '/'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <Card>
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Log in to your ShopSphere account.</p>

        {error && (
          <div className="mt-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
          />
          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
          />
          <Button type="submit" isLoading={isSubmitting} className="mt-2">
            Log in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-slate-900 hover:underline">
            Register
          </Link>
        </p>
      </Card>
    </div>
  )
}
