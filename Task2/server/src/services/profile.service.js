import { prisma } from '../config/prisma.js'
import {
  normalizeUsername,
  isValidName,
  isValidUsername,
  isValidBio,
  normalizeBio,
  isValidAvatarUrl,
  normalizeAvatarUrl,
  normalizeSearchQuery,
  isValidSearchQuery,
  parsePagination,
} from '../utils/validation.js'

// Never add email or passwordHash to this — used for profiles anyone can view.
const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
}

// Never add passwordHash to this — used for the authenticated user's own profile.
const PRIVATE_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
}

const ALLOWED_UPDATE_FIELDS = ['name', 'username', 'bio', 'avatarUrl']

function profileError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

// Prisma throws code P2002 on a unique constraint violation. The explicit
// pre-check in updateMyProfile covers the common case; this catches the rare
// race where two requests claim the same username concurrently.
function toSafeUniqueConstraintError(error) {
  if (error.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : ''
    if (target.includes('username')) return profileError('Username is already taken', 409)
    return profileError('Account already exists', 409)
  }
  return error
}

export async function getPublicProfile(username) {
  const normalizedUsername = normalizeUsername(username)

  const user = await prisma.user.findUnique({
    where: { username: normalizedUsername },
    select: PUBLIC_USER_SELECT,
  })

  if (!user) {
    throw profileError('User not found', 404)
  }

  return user
}

export async function searchUsers(rawQuery, paginationQuery) {
  const query = normalizeSearchQuery(rawQuery)
  if (!isValidSearchQuery(query)) {
    throw profileError('Search query must be between 1 and 100 characters', 400)
  }

  const pagination = parsePagination(paginationQuery)
  if (!pagination) {
    throw profileError('Invalid pagination parameters', 400)
  }
  const { page, limit } = pagination

  // Deterministic tiebreaker-free order — username is unique, so pagination
  // never straddles a tie the way ordering by name/createdAt could.
  const where = {
    OR: [
      { username: { contains: query, mode: 'insensitive' } },
      { name: { contains: query, mode: 'insensitive' } },
    ],
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: PUBLIC_USER_SELECT,
      orderBy: { username: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  }
}

export async function getMyProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PRIVATE_USER_SELECT,
  })

  if (!user) {
    throw profileError('User no longer exists', 401)
  }

  return user
}

export async function updateMyProfile(userId, input) {
  const rawInput = input ?? {}

  const unsupportedFields = Object.keys(rawInput).filter((key) => !ALLOWED_UPDATE_FIELDS.includes(key))
  if (unsupportedFields.length > 0) {
    throw profileError(`Unsupported field(s): ${unsupportedFields.join(', ')}`, 400)
  }

  const data = {}

  if (rawInput.name !== undefined) {
    if (!isValidName(rawInput.name)) {
      throw profileError('Name must not be empty and at most 100 characters', 400)
    }
    data.name = rawInput.name.trim()
  }

  let normalizedUsername
  if (rawInput.username !== undefined) {
    normalizedUsername = normalizeUsername(rawInput.username)
    if (!isValidUsername(normalizedUsername)) {
      throw profileError(
        'Username must be 3-30 characters and contain only lowercase letters, numbers, and underscores',
        400,
      )
    }
  }

  if (rawInput.bio !== undefined) {
    if (!isValidBio(rawInput.bio)) {
      throw profileError('Bio must be at most 500 characters', 400)
    }
    data.bio = normalizeBio(rawInput.bio)
  }

  if (rawInput.avatarUrl !== undefined) {
    if (!isValidAvatarUrl(rawInput.avatarUrl)) {
      throw profileError('Avatar URL must be a valid http:// or https:// URL', 400)
    }
    data.avatarUrl = normalizeAvatarUrl(rawInput.avatarUrl)
  }

  if (normalizedUsername !== undefined) {
    const existingUsername = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: { id: true },
    })
    if (existingUsername && existingUsername.id !== userId) {
      throw profileError('Username is already taken', 409)
    }
    data.username = normalizedUsername
  }

  if (Object.keys(data).length === 0) {
    // Nothing to change — an empty PATCH isn't invalid, just a no-op.
    return getMyProfile(userId)
  }

  try {
    return await prisma.user.update({
      where: { id: userId },
      data,
      select: PRIVATE_USER_SELECT,
    })
  } catch (error) {
    if (error.code === 'P2025') {
      throw profileError('User no longer exists', 401)
    }
    throw toSafeUniqueConstraintError(error)
  }
}
