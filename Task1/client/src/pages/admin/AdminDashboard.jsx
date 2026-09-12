import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminStats } from '../../api/admin.js'
import { getErrorMessage } from '../../api/client.js'
import AdminNav from '../../components/layout/AdminNav.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'

const CARDS = [
  { key: 'products', label: 'Total Products' },
  { key: 'orders', label: 'Total Orders' },
  { key: 'pendingOrders', label: 'Pending Orders' },
  { key: 'users', label: 'Registered Users' },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getAdminStats()
      .then((data) => {
        if (cancelled) return
        setStats(data)
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
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminNav />
      <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>

      <div className="mt-6">
        {status === 'loading' && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {status === 'error' && <ErrorState description={error} />}

        {status === 'ready' && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CARDS.map((card) => (
              <Card key={card.key}>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats[card.key]}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/admin/products?action=new">
            <Button>Add Product</Button>
          </Link>
          <Link to="/admin/products">
            <Button variant="secondary">Manage Products</Button>
          </Link>
          <Link to="/admin/orders">
            <Button variant="secondary">View Orders</Button>
          </Link>
          <Link to="/admin/users">
            <Button variant="secondary">View Users</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
