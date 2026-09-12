import { useState } from 'react'
import Input from '../ui/Input.jsx'
import Button from '../ui/Button.jsx'
import Alert from '../ui/Alert.jsx'

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const PRICE_TOLERANCE = 1e-6

// Client-side checks are UX only - the backend re-validates everything authoritatively.
function validate(form) {
  const errors = {}

  if (!form.name.trim()) {
    errors.name = 'Name is required'
  } else if (form.name.trim().length > 200) {
    errors.name = 'Name must be at most 200 characters'
  }

  if (!SLUG_REGEX.test(form.slug.trim().toLowerCase())) {
    errors.slug = 'Use lowercase letters, numbers, and hyphens only'
  }

  if (!form.description.trim()) {
    errors.description = 'Description is required'
  } else if (form.description.trim().length > 2000) {
    errors.description = 'Description must be at most 2000 characters'
  }

  const price = Number(form.price)
  if (form.price === '' || Number.isNaN(price) || price <= 0) {
    errors.price = 'Price must be a positive number'
  } else if (Math.abs(Math.round(price * 100) - price * 100) >= PRICE_TOLERANCE) {
    errors.price = 'Price can have at most 2 decimal places'
  }

  try {
    const url = new URL(form.imageUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('bad protocol')
  } catch {
    errors.imageUrl = 'Enter a valid http:// or https:// URL'
  }

  if (!form.category.trim()) {
    errors.category = 'Category is required'
  } else if (form.category.trim().length > 50) {
    errors.category = 'Category must be at most 50 characters'
  }

  const stock = Number(form.stock)
  if (form.stock === '' || !Number.isInteger(stock) || stock < 0) {
    errors.stock = 'Stock must be a non-negative whole number'
  }

  return errors
}

export default function ProductForm({ initialValues, onSubmit, onCancel, isSubmitting, apiError, submitLabel }) {
  const [form, setForm] = useState(initialValues)
  const [errors, setErrors] = useState({})

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    onSubmit({
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      description: form.description.trim(),
      price: Number(form.price),
      imageUrl: form.imageUrl.trim(),
      category: form.category.trim(),
      stock: Number(form.stock),
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="product-name" name="name" label="Name" value={form.name} onChange={handleChange} error={errors.name} />
        <Input id="product-slug" name="slug" label="Slug" value={form.slug} onChange={handleChange} error={errors.slug} />

        <div className="sm:col-span-2">
          <label htmlFor="product-description" className="text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="product-description"
            name="description"
            rows={3}
            value={form.description}
            onChange={handleChange}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${
              errors.description ? 'border-red-400' : 'border-slate-300'
            }`}
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
        </div>

        <Input
          id="product-price"
          name="price"
          type="number"
          step="0.01"
          min="0"
          label="Price"
          value={form.price}
          onChange={handleChange}
          error={errors.price}
        />
        <Input
          id="product-stock"
          name="stock"
          type="number"
          step="1"
          min="0"
          label="Stock"
          value={form.stock}
          onChange={handleChange}
          error={errors.stock}
        />

        <div className="sm:col-span-2">
          <Input
            id="product-imageUrl"
            name="imageUrl"
            label="Image URL"
            value={form.imageUrl}
            onChange={handleChange}
            error={errors.imageUrl}
          />
        </div>

        <Input
          id="product-category"
          name="category"
          label="Category"
          value={form.category}
          onChange={handleChange}
          error={errors.category}
        />
      </div>

      {apiError && <Alert variant="error">{apiError}</Alert>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
