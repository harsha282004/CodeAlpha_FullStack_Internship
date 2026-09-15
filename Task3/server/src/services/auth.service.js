import { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma.js'
import { AppError } from '../utils/AppError.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { signAccessToken } from '../utils/jwt.js'
import { toSafeUser } from '../utils/user.js'

// Selected once per query purpose — the two lists intentionally differ:
// login needs passwordHash to verify against, everything else must not be
// able to select it at all. That's the security boundary, enforced at the
// query itself rather than trusted to a serializer downstream.
const SAFE_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
}

const AUTH_SELECT = {
  ...SAFE_SELECT,
  passwordHash: true,
}

const DUPLICATE_USER_MESSAGE = 'An account with that email or username already exists'

// Computed once per process, not per request — used only so a login attempt
// against a nonexistent email still pays for a bcrypt comparison, keeping
// its response time in the same ballpark as a real "wrong password" attempt.
// Never a real account's password.
const dummyHashPromise = hashPassword('not-a-real-account-timing-safety-only')

export async function registerUser({ name, username, email, password }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { id: true },
  })
  if (existing) {
    throw new AppError(DUPLICATE_USER_MESSAGE, 409, 'USER_ALREADY_EXISTS')
  }

  const passwordHash = await hashPassword(password)

  let user
  try {
    user = await prisma.user.create({
      data: { name, username, email, passwordHash },
      select: SAFE_SELECT,
    })
  } catch (error) {
    // Narrows a race between the check above and this insert (e.g. two
    // concurrent registrations for the same email) back to the same clean
    // 409 — Prisma's unique constraint is the real guarantee either way.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(DUPLICATE_USER_MESSAGE, 409, 'USER_ALREADY_EXISTS')
    }
    throw error
  }

  const token = signAccessToken(user.id)
  return { user: toSafeUser(user), token }
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: AUTH_SELECT,
  })

  // Same generic error and shape whether the email doesn't exist or the
  // password was wrong — a different message per case would let a caller
  // enumerate which registered emails exist.
  const invalidCredentials = () => new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')

  if (!user) {
    await verifyPassword(password, await dummyHashPromise)
    throw invalidCredentials()
  }

  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    throw invalidCredentials()
  }

  const token = signAccessToken(user.id)
  return { user: toSafeUser(user), token }
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: SAFE_SELECT,
  })

  if (!user) {
    // The token itself was valid, but the account it points to is gone
    // (e.g. deleted after the token was issued) — treated as an
    // authentication failure, not a 404, since from the caller's
    // perspective they simply aren't authenticated as anyone real.
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  return toSafeUser(user)
}
