import { OrderStatus } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'
import { isValidUuid } from '../utils/validate.js'

export const VALID_ORDER_STATUSES = Object.values(OrderStatus)

const ORDER_ITEM_INCLUDE = { items: { include: { product: true } } }
const ADMIN_ORDER_INCLUDE = {
  items: { include: { product: true } },
  user: { select: { id: true, name: true, email: true } },
}

function serializeOrderItem(item) {
  return {
    id: item.id,
    productId: item.productId,
    name: item.product?.name ?? 'Unknown product',
    imageUrl: item.product?.imageUrl ?? null,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: Number(item.unitPrice) * item.quantity,
  }
}

export function serializeOrder(order) {
  return {
    id: order.id,
    status: order.status,
    total: order.total,
    shippingAddress: order.shippingAddress,
    createdAt: order.createdAt,
    items: order.items.map(serializeOrderItem),
  }
}

export function serializeOrderAdmin(order) {
  return {
    ...serializeOrder(order),
    customer: {
      id: order.user.id,
      name: order.user.name,
      email: order.user.email,
    },
  }
}

// Merges duplicate productIds by summing their quantities rather than rejecting the request outright.
function normalizeItems(items) {
  const merged = new Map()
  for (const item of items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity)
  }
  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }))
}

export async function createOrder(userId, { shippingAddress, items }) {
  const normalizedItems = normalizeItems(items)

  const order = await prisma.$transaction(async (tx) => {
    const productIds = normalizedItems.map((item) => item.productId)
    const products = await tx.product.findMany({ where: { id: { in: productIds } } })
    const productMap = new Map(products.map((product) => [product.id, product]))

    for (const item of normalizedItems) {
      const product = productMap.get(item.productId)
      if (!product) {
        throw new AppError('One or more products in your order are no longer available', 404)
      }
      if (product.stock < item.quantity) {
        throw new AppError(`Insufficient stock for "${product.name}"`, 409)
      }
    }

    // Atomically decrement stock with a conditional WHERE clause so concurrent
    // checkouts can't both succeed and oversell the same inventory.
    for (const item of normalizedItems) {
      const result = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      })
      if (result.count === 0) {
        const product = productMap.get(item.productId)
        throw new AppError(`Insufficient stock for "${product?.name ?? 'this product'}"`, 409)
      }
    }

    const orderItemsData = normalizedItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: productMap.get(item.productId).price,
    }))

    const total =
      Math.round(
        orderItemsData.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0) * 100,
      ) / 100

    return tx.order.create({
      data: {
        userId,
        status: OrderStatus.pending,
        total,
        shippingAddress,
        items: { create: orderItemsData },
      },
      include: ORDER_ITEM_INCLUDE,
    })
  })

  return order
}

export async function getOrdersForUser(userId) {
  return prisma.order.findMany({
    where: { userId },
    include: ORDER_ITEM_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getOrderById(userId, orderId) {
  if (!isValidUuid(orderId)) {
    throw new AppError('Order not found', 404)
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: ORDER_ITEM_INCLUDE,
  })

  if (!order || order.userId !== userId) {
    throw new AppError('Order not found', 404)
  }

  return order
}

export async function getAllOrdersAdmin() {
  return prisma.order.findMany({
    include: ADMIN_ORDER_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateOrderStatusAdmin(orderId, status) {
  if (!isValidUuid(orderId)) {
    throw new AppError('Order not found', 404)
  }

  if (!VALID_ORDER_STATUSES.includes(status)) {
    throw new AppError('Invalid order status', 400)
  }

  try {
    return await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: ADMIN_ORDER_INCLUDE,
    })
  } catch (error) {
    if (error.code === 'P2025') {
      throw new AppError('Order not found', 404)
    }
    throw error
  }
}
