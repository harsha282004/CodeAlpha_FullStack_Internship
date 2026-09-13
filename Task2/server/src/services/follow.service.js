import { prisma } from '../config/prisma.js'
import { normalizeUsername, isValidUsername, parsePagination } from '../utils/validation.js'

// Never add email or passwordHash to this — used for public follower/following lists.
const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
}

function followError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

// Follow mutations take no request body — the follower is always the
// authenticated identity and the target comes from the URL username, so any
// field submitted (e.g. a spoofed followerId/followingId) is rejected
// outright rather than silently ignored.
function assertNoBodyFields(input) {
  const fields = Object.keys(input ?? {})
  if (fields.length > 0) {
    throw followError(`Unsupported field(s): ${fields.join(', ')}`, 400)
  }
}

function normalizeAndValidateUsername(rawUsername) {
  const username = normalizeUsername(rawUsername)
  if (!isValidUsername(username)) {
    throw followError('Invalid username', 400)
  }
  return username
}

async function findTargetUserId(rawUsername) {
  const username = normalizeAndValidateUsername(rawUsername)

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  })

  if (!user) {
    throw followError('User not found', 404)
  }

  return user.id
}

function countFollowers(userId) {
  return prisma.follow.count({ where: { followingId: userId } })
}

function countFollowing(userId) {
  return prisma.follow.count({ where: { followerId: userId } })
}

async function getCounts(userId) {
  const [followerCount, followingCount] = await Promise.all([countFollowers(userId), countFollowing(userId)])
  return { followerCount, followingCount }
}

export async function followUser(followerId, targetUsername, input) {
  assertNoBodyFields(input)

  const targetUserId = await findTargetUserId(targetUsername)

  if (targetUserId === followerId) {
    throw followError('Users cannot follow themselves', 400)
  }

  const existingFollow = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId: targetUserId } },
    select: { followerId: true },
  })

  if (!existingFollow) {
    try {
      await prisma.follow.create({ data: { followerId, followingId: targetUserId } })
    } catch (error) {
      // P2002 = the composite primary key already exists. A concurrent
      // request won the race between our pre-check and this create — that's
      // exactly the state we want, so treat it as success, not an error.
      if (error.code !== 'P2002') {
        throw error
      }
    }
  }

  const counts = await getCounts(targetUserId)

  return { following: true, ...counts }
}

export async function unfollowUser(followerId, targetUsername, input) {
  assertNoBodyFields(input)

  const targetUserId = await findTargetUserId(targetUsername)

  // Self-follow can never exist as a row, but reject explicitly for the same
  // reason (and the same message) as followUser, rather than silently
  // treating it as an ordinary no-op unfollow.
  if (targetUserId === followerId) {
    throw followError('Users cannot follow themselves', 400)
  }

  try {
    await prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId: targetUserId } },
    })
  } catch (error) {
    // P2025 = no such row. Already not following — idempotent, not an error.
    if (error.code !== 'P2025') {
      throw error
    }
  }

  const counts = await getCounts(targetUserId)

  return { following: false, ...counts }
}

export async function getFollowStatus(followerId, targetUsername) {
  const targetUserId = await findTargetUserId(targetUsername)

  const [existingFollow, counts] = await Promise.all([
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId: targetUserId } },
      select: { followerId: true },
    }),
    getCounts(targetUserId),
  ])

  return { following: Boolean(existingFollow), ...counts }
}

export async function listFollowers(targetUsername, query) {
  const pagination = parsePagination(query)
  if (!pagination) {
    throw followError('Invalid pagination parameters', 400)
  }

  const targetUserId = await findTargetUserId(targetUsername)

  const { page, limit } = pagination

  const [follows, total] = await Promise.all([
    prisma.follow.findMany({
      where: { followingId: targetUserId },
      select: {
        follower: { select: PUBLIC_USER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.follow.count({ where: { followingId: targetUserId } }),
  ])

  return {
    users: follows.map((follow) => follow.follower),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  }
}

export async function listFollowing(targetUsername, query) {
  const pagination = parsePagination(query)
  if (!pagination) {
    throw followError('Invalid pagination parameters', 400)
  }

  const targetUserId = await findTargetUserId(targetUsername)

  const { page, limit } = pagination

  const [follows, total] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: targetUserId },
      select: {
        following: { select: PUBLIC_USER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.follow.count({ where: { followerId: targetUserId } }),
  ])

  return {
    users: follows.map((follow) => follow.following),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  }
}
