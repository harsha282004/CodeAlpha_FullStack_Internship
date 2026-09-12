import { prisma } from '../config/prisma.js'

export async function getAdminStats() {
  const [products, orders, pendingOrders, users] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'pending' } }),
    prisma.user.count(),
  ])

  return { products, orders, pendingOrders, users }
}
