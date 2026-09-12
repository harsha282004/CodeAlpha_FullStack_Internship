import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'

export async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.id) {
      throw new AppError('Authentication required', 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true },
    })

    if (!user) {
      throw new AppError('Authentication required', 401)
    }

    if (user.role !== 'admin') {
      throw new AppError('Admin access required', 403)
    }

    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}
