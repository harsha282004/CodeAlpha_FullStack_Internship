import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { useCart } from '../../hooks/useCart.js'
import Button from '../ui/Button.jsx'

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition-colors ${isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`

function CartBadge({ count }) {
  if (count <= 0) return null
  return (
    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-xs font-semibold text-white">
      {count}
    </span>
  )
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { totalItems } = useCart()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    setIsMenuOpen(false)
    navigate('/')
  }

  function closeMenu() {
    setIsMenuOpen(false)
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-lg font-bold text-slate-900">
          ShopSphere
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <NavLink to="/" className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/products" className={navLinkClass}>
            Products
          </NavLink>
          <NavLink to="/cart" className={navLinkClass}>
            <span className="inline-flex items-center">
              Cart
              <CartBadge count={totalItems} />
            </span>
          </NavLink>

          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <NavLink to="/profile" className={navLinkClass}>
                {user?.name ?? 'Account'}
              </NavLink>
              {user?.role === 'admin' && (
                <NavLink to="/admin" className={navLinkClass}>
                  Admin
                </NavLink>
              )}
              <Button variant="secondary" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900">
                Login
              </Link>
              <Link to="/register">
                <Button>Register</Button>
              </Link>
            </div>
          )}
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {isMenuOpen && (
        <div className="border-t border-slate-200 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-3">
            <NavLink to="/" className={navLinkClass} onClick={closeMenu}>
              Home
            </NavLink>
            <NavLink to="/products" className={navLinkClass} onClick={closeMenu}>
              Products
            </NavLink>
            <NavLink to="/cart" className={navLinkClass} onClick={closeMenu}>
              <span className="inline-flex items-center">
                Cart
                <CartBadge count={totalItems} />
              </span>
            </NavLink>

            {isAuthenticated ? (
              <>
                <NavLink to="/profile" className={navLinkClass} onClick={closeMenu}>
                  {user?.name ?? 'Account'}
                </NavLink>
                {user?.role === 'admin' && (
                  <NavLink to="/admin" className={navLinkClass} onClick={closeMenu}>
                    Admin
                  </NavLink>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-left text-sm font-medium text-slate-500 hover:text-slate-900"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900" onClick={closeMenu}>
                  Login
                </Link>
                <Link to="/register" className="text-sm font-medium text-slate-500 hover:text-slate-900" onClick={closeMenu}>
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
