import { Link } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-800">Page not found</h1>
      <p className="mt-3 text-slate-500">The page you're looking for doesn't exist.</p>
      <div className="mt-6 flex justify-center">
        <Link to="/">
          <Button variant="secondary">Back to Home</Button>
        </Link>
      </div>
    </div>
  )
}
