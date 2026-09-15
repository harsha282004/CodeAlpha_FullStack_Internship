import bcrypt from 'bcryptjs'

// 12 rounds is bcrypt's commonly recommended baseline in 2026 — expensive
// enough to resist offline brute-forcing, cheap enough not to make login
// noticeably slow on ordinary hardware.
const SALT_ROUNDS = 12

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash)
}
