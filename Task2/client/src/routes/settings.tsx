import { createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { AtSign, Image as ImageIcon, User } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { RequireAuth } from '../lib/auth/RequireAuth'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Card } from '../components/ui/Card'
import { useAuth } from '../lib/auth/AuthContext'
import { updateMyProfile } from '../lib/api/users'
import { ApiError } from '../lib/api/client'
import { useToast } from '../lib/toast/ToastContext'

export const Route = createFileRoute('/settings')({
  component: SettingsRoute,
})

function SettingsRoute() {
  return (
    <RequireAuth>
      <SettingsPage />
    </RequireAuth>
  )
}

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/

function SettingsPage() {
  const { user, refreshUser, logout } = useAuth()
  const { showToast } = useToast()

  const [name, setName] = useState(user?.name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  const previewAvatar = avatarUrl.trim().length > 0 ? avatarUrl.trim() : null

  function hasChanges() {
    return (
      name.trim() !== user!.name ||
      username.trim().toLowerCase() !== user!.username ||
      (bio.trim() || null) !== (user!.bio || null) ||
      (avatarUrl.trim() || null) !== (user!.avatarUrl || null)
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (name.trim().length === 0) {
      setError('Name cannot be empty.')
      return
    }
    if (!USERNAME_PATTERN.test(username.trim().toLowerCase())) {
      setError('Username must be 3-30 characters: lowercase letters, numbers, and underscores only.')
      return
    }
    if (bio.length > 500) {
      setError('Bio must be 500 characters or fewer.')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await updateMyProfile({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim().length > 0 ? bio.trim() : null,
        avatarUrl: avatarUrl.trim().length > 0 ? avatarUrl.trim() : null,
      })
      await refreshUser()
      showToast({ tone: 'success', message: 'Profile updated.' })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not update your profile.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    setName(user!.name)
    setUsername(user!.username)
    setBio(user!.bio ?? '')
    setAvatarUrl(user!.avatarUrl ?? '')
    setError(null)
  }

  return (
    <AppShell>
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <h1 className="text-lg font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your public profile.</p>
      </div>

      <div className="p-4 sm:p-6">
        <Card className="p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar src={previewAvatar} name={name || user.name} size="xl" />
              <div className="min-w-0 flex-1">
                <Input
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  label="Avatar URL"
                  placeholder="https://"
                  leadingIcon={<ImageIcon className="h-4 w-4" aria-hidden="true" />}
                  hint="Paste a link to an image. Leave blank to use your initials."
                />
              </div>
            </div>

            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              label="Name"
              leadingIcon={<User className="h-4 w-4" aria-hidden="true" />}
              required
            />
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              label="Username"
              leadingIcon={<AtSign className="h-4 w-4" aria-hidden="true" />}
              hint="3-30 characters: lowercase letters, numbers, underscores."
              required
            />
            <Textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              label="Bio"
              placeholder="Tell people about yourself"
              maxLength={500}
              rows={4}
              hint={`${bio.length} / 500`}
            />

            <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              Email: <span className="font-medium text-foreground">{user.email}</span> (cannot be changed here)
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" isLoading={isSaving} disabled={!hasChanges()}>
                Save changes
              </Button>
              <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>

        <Card className="mt-4 p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Session</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign out of Connectly on this device.</p>
          <Button variant="destructive" size="sm" className="mt-3" onClick={logout}>
            Log out
          </Button>
        </Card>
      </div>
    </AppShell>
  )
}
