import { Link, NavLink } from 'react-router-dom'

const tabClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`

export default function AdminNav() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <nav className="flex flex-wrap gap-2" aria-label="Admin sections">
        <NavLink to="/admin" end className={tabClass}>
          Dashboard
        </NavLink>
        <NavLink to="/admin/products" className={tabClass}>
          Products
        </NavLink>
        <NavLink to="/admin/orders" className={tabClass}>
          Orders
        </NavLink>
        <NavLink to="/admin/users" className={tabClass}>
          Users
        </NavLink>
      </nav>
      <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">
        &larr; Back to Store
      </Link>
    </div>
  )
}
