import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'

export default function Profile() {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Card>
        <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
        <dl className="mt-6 grid gap-4 text-sm">
          <div>
            <dt className="font-medium text-slate-500">Name</dt>
            <dd className="text-slate-900">{user?.name}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Email</dt>
            <dd className="text-slate-900">{user?.email}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Role</dt>
            <dd className="capitalize text-slate-900">{user?.role}</dd>
          </div>
        </dl>
        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-6">
          <div>
            <p className="text-sm font-medium text-slate-900">Order History</p>
            <p className="text-sm text-slate-500">View your past orders and their status.</p>
          </div>
          <Link to="/orders">
            <Button variant="secondary">View Orders</Button>
          </Link>
        </div>
        <p className="mt-6 text-sm text-slate-500">Profile editing is coming in a later phase.</p>
      </Card>
    </div>
  )
}
