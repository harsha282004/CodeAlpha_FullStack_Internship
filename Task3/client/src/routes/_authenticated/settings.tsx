import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../../auth/AuthContext'
import { ApiError, usersApi } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { InputField, TextareaField } from '../../components/ui/FormField'
import { useToast } from '../../components/ui/ToastContext'

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
})

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/

// Only the four fields the backend actually allows to change (see
// profile.validator.js's UPDATABLE_FIELDS) — email, password, id, role, and
// every timestamp are deliberately not editable here because there is no
// endpoint for them in this phase.
function SettingsPage() {
  const { user, updateUser } = useAuth()
  const { show } = useToast()

  const [name, setName] = useState(user?.name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')
  const [errors, setErrors] = useState<{ name?: string; username?: string; avatarUrl?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!user) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)

    const nextErrors: typeof errors = {}
    if (!name.trim()) nextErrors.name = 'Name is required.'
    if (!USERNAME_REGEX.test(username)) {
      nextErrors.username = 'Username must be 3-30 characters: lowercase letters, numbers, and underscores only.'
    }
    if (avatarUrl.trim() && !/^https?:\/\//i.test(avatarUrl.trim())) {
      nextErrors.avatarUrl = 'Avatar URL must start with http:// or https://.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      const { user: updated } = await usersApi.updateMe({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
      })
      updateUser(updated)
      show('Profile updated.', 'success')
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label="Full name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
          <InputField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={errors.username}
          />
          <TextareaField
            label="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            hint="Shown on your public profile."
          />
          <InputField
            label="Avatar URL"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            error={errors.avatarUrl}
            placeholder="https://…"
          />

          {formError && (
            <p role="alert" className="text-sm text-red-600">
              {formError}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Account</h2>
        <p className="text-sm text-slate-500">
          Email address ({user.email}) can't be changed from this screen — the account API doesn't support it in
          this version of TaskFlow.
        </p>
      </Card>
    </div>
  )
}
