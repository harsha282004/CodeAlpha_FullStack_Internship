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
