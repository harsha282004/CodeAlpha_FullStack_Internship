import { Link } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'

const FEATURES = [
  {
    title: 'Curated catalogue',
    description: 'Browse a hand-picked selection of everyday essentials across apparel, electronics, home, and accessories.',
  },
  {
    title: 'Secure by design',
    description: 'Accounts and passwords are protected with modern authentication and encrypted password hashing.',
  },
  {
    title: 'Fast, simple shopping',
    description: 'Search, filter, and check out in just a few clicks — no clutter, no distractions.',
  },
]

export default function Home() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Shop smarter with ShopSphere
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-500 sm:text-lg">
          A simple, modern storefront for everyday essentials — built to make browsing and buying effortless.
        </p>
        <div className="mt-8 flex justify-center">
          <Link to="/products">
            <Button>Browse Products</Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
