import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listProducts } from '../api/products.js'
import { getErrorMessage } from '../api/client.js'
import { useCart } from '../hooks/useCart.js'
import { useToast } from '../hooks/useToast.js'
import { useDebouncedValue } from '../hooks/useDebouncedValue.js'
import ProductGrid from '../components/product/ProductGrid.jsx'
import CategoryFilter from '../components/product/CategoryFilter.jsx'
import Pagination from '../components/product/Pagination.jsx'
import Input from '../components/ui/Input.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import Button from '../components/ui/Button.jsx'

const PAGE_SIZE = 12

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { addItem } = useCart()
  const { showToast } = useToast()

  const page = Math.max(Number.parseInt(searchParams.get('page') || '1', 10) || 1, 1)
  const category = searchParams.get('category') || ''
  const search = searchParams.get('search') || ''

  const [searchInput, setSearchInput] = useState(search)
  const debouncedSearch = useDebouncedValue(searchInput, 400)

  const [result, setResult] = useState({ products: [], meta: { total: 0, totalPages: 1 } })
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [categories, setCategories] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  // Derive the category list once from the available products rather than hardcoding it.
  useEffect(() => {
    listProducts({ limit: 50 })
      .then((data) => {
        const unique = [...new Set(data.products.map((product) => product.category))].sort()
        setCategories(unique)
      })
      .catch(() => {
        // Non-critical: filters just won't render if this fails, the grid still works.
      })
  }, [])

  // Push the debounced search text into the URL, resetting to page 1.
  useEffect(() => {
    if (debouncedSearch === search) return
    const next = new URLSearchParams(searchParams)
    if (debouncedSearch) {
      next.set('search', debouncedSearch)
    } else {
      next.delete('search')
    }
    next.set('page', '1')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setError('')

    listProducts({ search, category, page, limit: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return
        // If a filter change left the current page past the end, snap back to the last valid page.
        if (data.meta.total > 0 && page > data.meta.totalPages) {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            next.set('page', String(data.meta.totalPages))
            return next
          })
          return
        }
        setResult(data)
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
  }, [search, category, page, refreshKey, setSearchParams])

  function updateParams(updates) {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
    })
    setSearchParams(next)
  }

  function handleCategoryChange(newCategory) {
    updateParams({ category: newCategory, page: '1' })
  }

  function handlePrevious() {
    updateParams({ page: String(Math.max(page - 1, 1)) })
  }

  function handleNext() {
    updateParams({ page: String(page + 1) })
  }

  function handleAddToCart(product) {
    const outcome = addItem(product, 1)
    if (outcome.status === 'added') {
      showToast(`${product.name} added to cart`, 'success')
    } else if (outcome.status === 'clamped') {
      showToast(`Only ${outcome.added} more ${product.name} available - cart updated`, 'info')
    } else {
      showToast(`${product.name} is out of stock`, 'error')
    }
  }

  function handleClearFilters() {
    setSearchInput('')
    setSearchParams({})
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Products</h1>

      <div className="mt-6 flex flex-col gap-4">
        <Input
          id="product-search"
          type="search"
          placeholder="Search products..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="Search products"
        />
        {categories.length > 0 && (
          <CategoryFilter categories={categories} value={category} onChange={handleCategoryChange} />
        )}
      </div>

      <div className="mt-8">
        {status === 'loading' && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {status === 'error' && (
          <ErrorState
            description={error}
            action={
              <Button variant="secondary" onClick={() => setRefreshKey((key) => key + 1)}>
                Try Again
              </Button>
            }
          />
        )}

        {status === 'ready' && result.products.length === 0 && (
          <EmptyState
            title="No products found"
            description="Try a different search term or category."
            action={
              <Button variant="secondary" onClick={handleClearFilters}>
                Clear filters
              </Button>
            }
          />
        )}

        {status === 'ready' && result.products.length > 0 && (
          <>
            <ProductGrid products={result.products} onAddToCart={handleAddToCart} />
            <Pagination
              page={result.meta.page}
              totalPages={result.meta.totalPages}
              total={result.meta.total}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />
          </>
        )}
      </div>
    </div>
  )
}
