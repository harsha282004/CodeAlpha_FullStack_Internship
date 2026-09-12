import { useEffect, useState } from 'react'
import { listAdminUsers } from '../../api/admin.js'
import { getErrorMessage } from '../../api/client.js'
import AdminNav from '../../components/layout/AdminNav.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    listAdminUsers()
      .then((data) => {
        if (cancelled) return
        setUsers(data.users)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(getErrorMessage(err))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <AdminNav />
      <h1 className="text-2xl font-bold text-slate-900">Admin - Users</h1>

      <div className="mt-6">
        {status === 'loading' && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {status === 'error' && <ErrorState description={error} />}

        {status === 'ready' && users.length === 0 && (
          <EmptyState title="No users yet" description="Registered users will appear here." />
        )}

        {status === 'ready' && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Name
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Email
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Role
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 text-slate-900">{user.name}</td>
                    <td className="py-3 pr-4 text-slate-600">{user.email}</td>
                    <td className="py-3 pr-4 capitalize text-slate-600">{user.role}</td>
                    <td className="py-3 pr-4 text-slate-600">{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
