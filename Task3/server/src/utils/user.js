// Centralized Prisma select shapes — the security boundary between "safe to
// return" and "not" is enforced here, at the query itself, not just by the
// serializers below remembering to drop a field.
export const PRIVATE_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
}

export const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
}

// The authenticated user's own view of themselves (register, login, /me).
// Explicit allow-list, never a spread of the raw Prisma row — that's what
// guarantees passwordHash (or any future internal-only column) can never
// leak into an API response even if a query forgets to exclude it.
export function toSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

// What anyone else sees when looking up a username — no email, no
// updatedAt. Same allow-list discipline as toSafeUser: never a spread.
export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt,
  }
}
