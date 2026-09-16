import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '../../auth/AuthContext'
import { Avatar } from '../../components/ui/Avatar'
import { Card } from '../../components/ui/Card'
import { formatDate } from '../../lib/format'

export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfilePage,
})

// Public-facing profile (what any project collaborator would see) shown
// separately from private account details (email, member-since) — per
// Phase 14.14's requirement not to blur the two together. Editing happens
// on /settings; this page is the read view.
function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
          <div>
            <p className="text-lg font-semibold text-slate-900">{user.name}</p>
            <p className="text-sm text-slate-500">@{user.username}</p>
          </div>
        </div>
        {user.bio && <p className="mt-4 text-sm text-slate-600">{user.bio}</p>}
        <Link to="/settings" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
          Edit profile →
        </Link>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Account details</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Email</dt>
            <dd className="text-slate-900">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Member since</dt>
            <dd className="text-slate-900">{formatDate(user.createdAt)}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
