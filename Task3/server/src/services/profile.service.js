import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'
import { toSafeUser, toPublicUser, PRIVATE_USER_SELECT, PUBLIC_USER_SELECT } from '../utils/user.js'

export async function getPublicProfile(rawUsername) {
  // Usernames are always stored lowercase (enforced at registration and at
  // update time), so normalizing the URL segment the same way makes the
  // lookup case-insensitive without needing a separate case-insensitive
  // query — /Alice_Johnson and /alice_johnson resolve to the same profile.
  const username = String(rawUsername ?? '').trim().toLowerCase()

  const user = await prisma.user.findUnique({
    where: { username },
    select: PUBLIC_USER_SELECT,
  })

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND')
  }

  return toPublicUser(user)
}

export async function getCurrentProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PRIVATE_USER_SELECT,
  })

  if (!user) {
    // The token itself was valid, but the account it points to is gone —
    // same treatment as auth.service.js's getCurrentUser, for the same
    // reason: from the caller's side this looks like "not authenticated,"
    // not "resource missing."
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  return toSafeUser(user)
}

export async function updateCurrentProfile(userId, update) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: update,
      select: PRIVATE_USER_SELECT,
    })
    return toSafeUser(user)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new AppError('Username is already taken', 409, 'USERNAME_ALREADY_EXISTS')
      }
      if (error.code === 'P2025') {
        // The authenticated user's row disappeared between the JWT being
        // issued and this update — treated the same way getCurrentProfile
        // treats it, not as a generic 500.
        throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
      }
    }
    throw error
  }
}

// Matches against username OR name, case-insensitively — Postgres's ILIKE
// via Prisma's `mode: 'insensitive'`, not an in-memory filter. `q` is
// required by the validator before this ever runs, so there's no unbounded
// "list everyone" path through this function.
export async function searchUsers({ q, page, limit }) {
  const where = {
    OR: [
      { username: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
    ],
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: PUBLIC_USER_SELECT,
      orderBy: { username: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return {
    users: users.map(toPublicUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
