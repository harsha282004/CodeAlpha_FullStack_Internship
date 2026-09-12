import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { getErrorMessage } from '../api/client.js'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Alert from '../components/ui/Alert.jsx'
import Card from '../components/ui/Card.jsx'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
  }

  function validate() {
    if (form.name.trim().length < 2) return 'Name must be at least 2 characters.'
    if (!EMAIL_REGEX.test(form.email.trim())) return 'Enter a valid email address.'
    if (form.password.length < 8) return 'Password must be at least 8 characters.'
    if (form.password !== form.confirmPassword) return 'Passwords do not match.'
    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      await register(form.name.trim(), form.email.trim(), form.password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <Card>
        <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">Join ShopSphere to start shopping.</p>

        {error && (
          <div className="mt-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <Input
            id="name"
            name="name"
            label="Full name"
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
          />
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
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
          />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
          />
          <Button type="submit" isLoading={isSubmitting} className="mt-2">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-slate-900 hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  )
}
