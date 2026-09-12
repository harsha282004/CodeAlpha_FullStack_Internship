import {
  listProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/product.service.js'
import { AppError } from '../utils/AppError.js'
import {
  isValidProductName,
  isValidSlug,
  isValidDescription,
  isValidPrice,
  isValidImageUrl,
  isValidCategory,
  isValidStock,
  isValidUuid,
} from '../utils/validate.js'

// Whitelists incoming fields into a plain data object, so request bodies can
// never set id/createdAt/updatedAt or any other field outside this list.
function buildProductData(body, { partial = false } = {}) {
  const data = {}

  if (!partial || body.name !== undefined) {
    if (!isValidProductName(body.name)) {
      throw new AppError('Name is required and must be at most 200 characters', 400)
    }
    data.name = body.name.trim()
  }

  if (!partial || body.slug !== undefined) {
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : body.slug
    if (!isValidSlug(slug)) {
      throw new AppError('Slug must contain only lowercase letters, numbers, and hyphens', 400)
    }
    data.slug = slug
  }

  if (!partial || body.description !== undefined) {
    if (!isValidDescription(body.description)) {
      throw new AppError('Description is required and must be at most 2000 characters', 400)
    }
    data.description = body.description.trim()
  }

  if (!partial || body.price !== undefined) {
    if (!isValidPrice(body.price)) {
      throw new AppError('Price must be a positive number with at most 2 decimal places', 400)
    }
    data.price = body.price
  }

  if (!partial || body.imageUrl !== undefined) {
    if (!isValidImageUrl(body.imageUrl)) {
      throw new AppError('imageUrl must be a valid http or https URL', 400)
    }
    data.imageUrl = body.imageUrl
  }

  if (!partial || body.category !== undefined) {
    if (!isValidCategory(body.category)) {
      throw new AppError('Category is required and must be at most 50 characters', 400)
    }
    data.category = body.category.trim()
  }

  if (!partial || body.stock !== undefined) {
    if (!isValidStock(body.stock)) {
      throw new AppError('Stock must be a non-negative integer', 400)
    }
    data.stock = body.stock
  }

  if (partial && Object.keys(data).length === 0) {
    throw new AppError('At least one field must be provided to update', 400)
  }

  return data
}

export async function getProducts(req, res, next) {
  try {
    const result = await listProducts(req.query)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export async function getProduct(req, res, next) {
  try {
    const product = await getProductBySlug(req.params.slug)
    res.json({ product })
  } catch (error) {
    next(error)
  }
}

export async function postProduct(req, res, next) {
  try {
    const data = buildProductData(req.body ?? {})
    const product = await createProduct(data)
    res.status(201).json({ product })
  } catch (error) {
    next(error)
  }
}

export async function putProduct(req, res, next) {
  try {
    if (!isValidUuid(req.params.id)) {
      throw new AppError('Invalid product ID', 400)
    }
    const data = buildProductData(req.body ?? {}, { partial: true })
    const product = await updateProduct(req.params.id, data)
    res.json({ product })
  } catch (error) {
    next(error)
  }
}

export async function removeProduct(req, res, next) {
  try {
    if (!isValidUuid(req.params.id)) {
      throw new AppError('Invalid product ID', 400)
    }
    await deleteProduct(req.params.id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
