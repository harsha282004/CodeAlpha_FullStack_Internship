import { prisma } from '../config/prisma.js'
import { hashPassword, comparePassword } from '../utils/password.js'
import { signAccessToken } from '../utils/jwt.js'
import {
  normalizeEmail,
  normalizeUsername,
  isValidName,
  isValidUsername,
  isValidEmail,
  isValidPassword,
} from '../utils/validation.js'

// Never add passwordHash to this — every user-facing response is built from it.
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
}

function authError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

// Prisma throws code P2002 on a unique constraint violation. Pre-checking
// email/username above covers the common case; this catches the rare race
// where two registrations for the same email/username land concurrently.
function toSafeUniqueConstraintError(error) {
  if (error.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : ''
    if (target.includes('email')) return authError('Email is already registered', 409)
    if (target.includes('username')) return authError('Username is already taken', 409)
    return authError('Account already exists', 409)
  }
  return error
}

export async function registerUser({ name, username, email, password }) {
  if (!isValidName(name)) {
    throw authError('Name must not be empty', 400)
  }

  const normalizedUsername = normalizeUsername(username)
  if (!isValidUsername(normalizedUsername)) {
    throw authError(
      'Username must be 3-30 characters and contain only lowercase letters, numbers, and underscores',
      400,
    )
  }

  const normalizedEmail = normalizeEmail(email)
  if (!isValidEmail(normalizedEmail)) {
    throw authError('A valid email is required', 400)
  }

  if (!isValidPassword(password)) {
    throw authError('Password must be between 8 and 72 characters', 400)
  }

  const existingEmail = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  })
  if (existingEmail) {
    throw authError('Email is already registered', 409)
  }

  const existingUsername = await prisma.user.findUnique({
    where: { username: normalizedUsername },
    select: { id: true },
  })
  if (existingUsername) {
    throw authError('Username is already taken', 409)
  }

  const passwordHash = await hashPassword(password)

  let user
  try {
    user = await prisma.user.create({
      data: {
        name: name.trim(),
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
      },
      select: SAFE_USER_SELECT,
    })
  } catch (error) {
    throw toSafeUniqueConstraintError(error)
  }

  const token = signAccessToken(user.id)

  return { user, token }
}

export async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email)

  if (!isValidEmail(normalizedEmail) || typeof password !== 'string' || password.length === 0) {
    throw authError('Email and password are required', 400)
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (!user) {
    // Same message as a wrong password — never reveal whether the email exists.
    throw authError('Invalid email or password', 401)
  }

  const passwordMatches = await comparePassword(password, user.passwordHash)
  if (!passwordMatches) {
    throw authError('Invalid email or password', 401)
  }

  const token = signAccessToken(user.id)
  const { passwordHash, ...safeUser } = user

  return { user: safeUser, token }
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: SAFE_USER_SELECT,
  })

  if (!user) {
    throw authError('User no longer exists', 401)
  }

  return user
}
