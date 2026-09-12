import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 12
const MAX_LIMIT = 50

export async function listProducts({ search, category, page, limit } = {}) {
  const parsedPage = Number.parseInt(page, 10)
  const parsedLimit = Number.parseInt(limit, 10)

  const currentPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : DEFAULT_PAGE
  const pageSize =
    Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_LIMIT) : DEFAULT_LIMIT

  const where = {}

  if (typeof category === 'string' && category.trim().length > 0) {
    where.category = { equals: category.trim(), mode: 'insensitive' }
  }

  if (typeof search === 'string' && search.trim().length > 0) {
    const term = search.trim()
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
    ]
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    products,
    meta: {
      total,
      count: products.length,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    },
  }
}

export async function getProductBySlug(slug) {
  const product = await prisma.product.findUnique({ where: { slug } })
  if (!product) {
    throw new AppError('Product not found', 404)
  }
  return product
}

export async function createProduct(data) {
  try {
    return await prisma.product.create({ data })
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('A product with this slug already exists', 409)
    }
    throw error
  }
}

export async function updateProduct(id, data) {
  try {
    return await prisma.product.update({ where: { id }, data })
  } catch (error) {
    if (error.code === 'P2025') {
      throw new AppError('Product not found', 404)
    }
    if (error.code === 'P2002') {
      throw new AppError('A product with this slug already exists', 409)
    }
    throw error
  }
}

export async function deleteProduct(id) {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) {
    throw new AppError('Product not found', 404)
  }

  const orderItemCount = await prisma.orderItem.count({ where: { productId: id } })
  if (orderItemCount > 0) {
    throw new AppError('Cannot delete a product referenced by existing orders', 409)
  }

  try {
    await prisma.product.delete({ where: { id } })
  } catch (error) {
    if (error.code === 'P2003') {
      throw new AppError('Cannot delete a product referenced by existing orders', 409)
    }
    throw error
  }
}
