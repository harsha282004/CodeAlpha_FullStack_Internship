import { prisma } from '../config/prisma.js'
import { hashPassword, comparePassword } from '../utils/password.js'
import { signAccessToken } from '../utils/jwt.js'
import { AppError } from '../utils/AppError.js'

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
}

export async function registerUser({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase()

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    throw new AppError('Email is already registered', 409)
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'customer',
    },
    select: SAFE_USER_SELECT,
  })

  const token = signAccessToken(user.id)

  return { user, token }
}

export async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase()

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (!user) {
    throw new AppError('Invalid email or password', 401)
  }

  const passwordMatches = await comparePassword(password, user.passwordHash)
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401)
  }

  const token = signAccessToken(user.id)
  const { passwordHash, ...safeUser } = user

  return { user: safeUser, token }
}

export async function getUserById(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: SAFE_USER_SELECT })
  if (!user) {
    throw new AppError('User not found', 404)
  }
  return user
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export async function getAllUsersAdmin({ page, limit } = {}) {
  const parsedPage = Number.parseInt(page, 10)
  const parsedLimit = Number.parseInt(limit, 10)

  const currentPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : DEFAULT_PAGE
  const pageSize =
    Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_LIMIT) : DEFAULT_LIMIT

  const [total, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      select: SAFE_USER_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    users,
    meta: {
      total,
      count: users.length,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    },
  }
}
