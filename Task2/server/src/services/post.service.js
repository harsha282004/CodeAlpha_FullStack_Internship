import { prisma } from '../config/prisma.js'
import {
  isValidUuid,
  isValidPostContent,
  normalizePostContent,
  isValidPostImageUrl,
  normalizePostImageUrl,
  parsePagination,
} from '../utils/validation.js'

// Never add email or passwordHash to this — post authors are visible to
// anyone who can read the post.
const SAFE_AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
}

const POST_SELECT = {
  id: true,
  content: true,
  imageUrl: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: SAFE_AUTHOR_SELECT,
  },
}

const ALLOWED_CREATE_FIELDS = ['content', 'imageUrl']
const ALLOWED_UPDATE_FIELDS = ['content', 'imageUrl']

const FORBIDDEN_OWNER_MESSAGE = 'You do not have permission to modify this post'

function postError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

function rejectUnsupportedFields(rawInput, allowedFields) {
  const unsupportedFields = Object.keys(rawInput).filter((key) => !allowedFields.includes(key))
  if (unsupportedFields.length > 0) {
    throw postError(`Unsupported field(s): ${unsupportedFields.join(', ')}`, 400)
  }
}

export async function createPost(userId, input) {
  const rawInput = input ?? {}
  rejectUnsupportedFields(rawInput, ALLOWED_CREATE_FIELDS)

  if (!isValidPostContent(rawInput.content)) {
    throw postError('Content must not be empty and at most 5000 characters', 400)
  }

  if (rawInput.imageUrl !== undefined && !isValidPostImageUrl(rawInput.imageUrl)) {
    throw postError('Image URL must be a valid http:// or https:// URL', 400)
  }

  return prisma.post.create({
    data: {
      content: normalizePostContent(rawInput.content),
      imageUrl: rawInput.imageUrl !== undefined ? normalizePostImageUrl(rawInput.imageUrl) : undefined,
      // Always the authenticated caller — never trust a client-supplied authorId.
      authorId: userId,
    },
    select: POST_SELECT,
  })
}

export async function getPostById(postId) {
  if (!isValidUuid(postId)) {
    throw postError('Invalid post ID', 400)
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: POST_SELECT,
  })

  if (!post) {
    throw postError('Post not found', 404)
  }

  return post
}

export async function listPosts(query) {
  const pagination = parsePagination(query)
  if (!pagination) {
    throw postError('Invalid pagination parameters', 400)
  }

  const { page, limit } = pagination

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      select: POST_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count(),
  ])

  return {
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  }
}

async function assertOwnedPost(userId, postId) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  })

  if (!post) {
    throw postError('Post not found', 404)
  }

  if (post.authorId !== userId) {
    throw postError(FORBIDDEN_OWNER_MESSAGE, 403)
  }
}

export async function updatePost(userId, postId, input) {
  if (!isValidUuid(postId)) {
    throw postError('Invalid post ID', 400)
  }

  const rawInput = input ?? {}
  rejectUnsupportedFields(rawInput, ALLOWED_UPDATE_FIELDS)

  const data = {}

  if (rawInput.content !== undefined) {
    if (!isValidPostContent(rawInput.content)) {
      throw postError('Content must not be empty and at most 5000 characters', 400)
    }
    data.content = normalizePostContent(rawInput.content)
  }

  if (rawInput.imageUrl !== undefined) {
    if (!isValidPostImageUrl(rawInput.imageUrl)) {
      throw postError('Image URL must be a valid http:// or https:// URL', 400)
    }
    data.imageUrl = normalizePostImageUrl(rawInput.imageUrl)
  }

  await assertOwnedPost(userId, postId)

  if (Object.keys(data).length === 0) {
    // Nothing to change — an empty PATCH isn't invalid, just a no-op.
    return getPostById(postId)
  }

  try {
    return await prisma.post.update({
      where: { id: postId },
      data,
      select: POST_SELECT,
    })
  } catch (error) {
    if (error.code === 'P2025') {
      throw postError('Post not found', 404)
    }
    throw error
  }
}

export async function deletePost(userId, postId) {
  if (!isValidUuid(postId)) {
    throw postError('Invalid post ID', 400)
  }

  await assertOwnedPost(userId, postId)

  try {
    await prisma.post.delete({ where: { id: postId } })
  } catch (error) {
    if (error.code === 'P2025') {
      throw postError('Post not found', 404)
    }
    throw error
  }
}
