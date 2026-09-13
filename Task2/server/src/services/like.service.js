import { prisma } from '../config/prisma.js'
import { isValidUuid } from '../utils/validation.js'

function likeError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

// Like operations take no request body — userId always comes from the
// authenticated identity, never from the client, so any field submitted
// (e.g. a spoofed userId) is rejected outright rather than silently ignored.
function assertNoBodyFields(input) {
  const fields = Object.keys(input ?? {})
  if (fields.length > 0) {
    throw likeError(`Unsupported field(s): ${fields.join(', ')}`, 400)
  }
}

async function assertPostExists(postId) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  })

  if (!post) {
    throw likeError('Post not found', 404)
  }
}

function countLikes(postId) {
  return prisma.like.count({ where: { postId } })
}

export async function likePost(userId, postId, input) {
  if (!isValidUuid(postId)) {
    throw likeError('Invalid post ID', 400)
  }
  assertNoBodyFields(input)

  await assertPostExists(postId)

  const existingLike = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
    select: { userId: true },
  })

  if (!existingLike) {
    try {
      await prisma.like.create({ data: { userId, postId } })
    } catch (error) {
      // P2002 = the composite primary key already exists. A concurrent
      // request won the race between our pre-check and this create — that's
      // exactly the state we want, so treat it as success, not an error.
      if (error.code !== 'P2002') {
        throw error
      }
    }
  }

  const likeCount = await countLikes(postId)

  return { liked: true, likeCount }
}

export async function unlikePost(userId, postId, input) {
  if (!isValidUuid(postId)) {
    throw likeError('Invalid post ID', 400)
  }
  assertNoBodyFields(input)

  await assertPostExists(postId)

  try {
    await prisma.like.delete({
      where: { userId_postId: { userId, postId } },
    })
  } catch (error) {
    // P2025 = no such row. Already unliked — idempotent, not an error.
    if (error.code !== 'P2025') {
      throw error
    }
  }

  const likeCount = await countLikes(postId)

  return { liked: false, likeCount }
}

export async function getPostLikeStatus(userId, postId) {
  if (!isValidUuid(postId)) {
    throw likeError('Invalid post ID', 400)
  }

  await assertPostExists(postId)

  const [existingLike, likeCount] = await Promise.all([
    prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { userId: true },
    }),
    countLikes(postId),
  ])

  return { liked: Boolean(existingLike), likeCount }
}
