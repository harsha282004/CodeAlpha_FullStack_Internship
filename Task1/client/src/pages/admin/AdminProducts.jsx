import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  listProducts,
  createProductAdmin,
  updateProductAdmin,
  deleteProductAdmin,
} from '../../api/products.js'
import { getErrorMessage } from '../../api/client.js'
import { useToast } from '../../hooks/useToast.js'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js'
import { handleImageError } from '../../utils/image.js'
import AdminNav from '../../components/layout/AdminNav.jsx'
import ProductForm from '../../components/admin/ProductForm.jsx'
import CategoryFilter from '../../components/product/CategoryFilter.jsx'
import Pagination from '../../components/product/Pagination.jsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ErrorState from '../../components/ui/ErrorState.jsx'

const PAGE_SIZE = 10
const EMPTY_FORM = { name: '', slug: '', description: '', price: '', imageUrl: '', category: '', stock: '' }

export default function AdminProducts() {
  const [searchParams, setSearchParams] = useSearchParams()
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

  const [formMode, setFormMode] = useState(null) // null | 'create' | 'edit'
  const [editingProduct, setEditingProduct] = useState(null)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Lets the dashboard's "Add Product" quick action jump straight into the create form.
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setFormMode('create')
      const next = new URLSearchParams(searchParams)
      next.delete('action')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    listProducts({ limit: 50 })
      .then((data) => {
        const unique = [...new Set(data.products.map((product) => product.category))].sort()
        setCategories(unique)
      })
      .catch(() => {
        // Non-critical: filters just won't render if this fails, the table still works.
      })
  }, [refreshKey])

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

  function openCreateForm() {
    setEditingProduct(null)
    setFormError('')
    setFormMode('create')
  }

  function openEditForm(product) {
    setEditingProduct(product)
    setFormError('')
    setFormMode('edit')
  }

  function closeForm() {
    setFormMode(null)
    setEditingProduct(null)
    setFormError('')
  }

  async function handleFormSubmit(values) {
    setIsSubmitting(true)
    setFormError('')
    try {
      if (formMode === 'create') {
        await createProductAdmin(values)
        showToast('Product created', 'success')
      } else {
        await updateProductAdmin(editingProduct.id, values)
        showToast('Product updated', 'success')
      }
      closeForm()
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteConfirm() {
    setIsDeleting(true)
    try {
      await deleteProductAdmin(deleteTarget.id)
      showToast('Product deleted', 'success')
      setDeleteTarget(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      // Surfaces the backend's specific message (e.g. "referenced by existing orders")
      // instead of a generic failure toast.
      showToast(getErrorMessage(err), 'error')
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminNav />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Admin - Products</h1>
        {formMode === null && <Button onClick={openCreateForm}>Add Product</Button>}
      </div>

      {formMode !== null && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {formMode === 'create' ? 'Add Product' : 'Edit Product'}
          </h2>
          <div className="mt-4">
            <ProductForm
              initialValues={
                formMode === 'edit'
                  ? {
                      name: editingProduct.name,
                      slug: editingProduct.slug,
                      description: editingProduct.description,
                      price: String(editingProduct.price),
                      imageUrl: editingProduct.imageUrl,
                      category: editingProduct.category,
                      stock: String(editingProduct.stock),
                    }
                  : EMPTY_FORM
              }
              onSubmit={handleFormSubmit}
              onCancel={closeForm}
              isSubmitting={isSubmitting}
              apiError={formError}
              submitLabel={formMode === 'create' ? 'Create Product' : 'Save Changes'}
            />
          </div>
        </Card>
      )}

      <div className="mt-6 flex flex-col gap-4">
        <Input
          id="admin-product-search"
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

      <div className="mt-6">
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
          <EmptyState title="No products found" description="Try a different search term or category." />
        )}

        {status === 'ready' && result.products.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Image
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Name
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Category
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Price
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Stock
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Created
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.products.map((product) => (
                    <tr key={product.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4">
                        <img
                          src={product.imageUrl}
                          onError={handleImageError}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      </td>
                      <td className="py-3 pr-4 text-slate-900">{product.name}</td>
                      <td className="py-3 pr-4 capitalize text-slate-600">{product.category}</td>
                      <td className="py-3 pr-4 text-slate-900">${Number(product.price).toFixed(2)}</td>
                      <td className="py-3 pr-4 text-slate-600">{product.stock}</td>
                      <td className="py-3 pr-4 text-slate-600">
                        {new Date(product.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => openEditForm(product)}
                            aria-label={`Edit ${product.name}`}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => setDeleteTarget(product)}
                            aria-label={`Delete ${product.name}`}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this product?"
        description={
          deleteTarget ? `"${deleteTarget.name}" will be permanently deleted. This cannot be undone.` : ''
        }
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
