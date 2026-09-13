import { prisma } from '../config/prisma.js'
import { isValidUuid, isValidCommentContent, normalizeCommentContent, parsePagination } from '../utils/validation.js'

// Never add email or passwordHash to this — comment authors are visible to
// anyone who can read the post's comments.
const SAFE_AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
}

const COMMENT_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: SAFE_AUTHOR_SELECT,
  },
}

const ALLOWED_CREATE_FIELDS = ['content']
const ALLOWED_UPDATE_FIELDS = ['content']

const FORBIDDEN_OWNER_MESSAGE = 'You do not have permission to modify this comment'

function commentError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

function rejectUnsupportedFields(rawInput, allowedFields) {
  const unsupportedFields = Object.keys(rawInput).filter((key) => !allowedFields.includes(key))
  if (unsupportedFields.length > 0) {
    throw commentError(`Unsupported field(s): ${unsupportedFields.join(', ')}`, 400)
  }
}

async function assertPostExists(postId) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  })

  if (!post) {
    throw commentError('Post not found', 404)
  }
}

// Shared by update and delete: find the comment, 404 if missing, 403 if the
// caller doesn't own it.
async function assertOwnedComment(userId, commentId) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  })

  if (!comment) {
    throw commentError('Comment not found', 404)
  }

  if (comment.authorId !== userId) {
    throw commentError(FORBIDDEN_OWNER_MESSAGE, 403)
  }

  return comment
}

export async function createComment(userId, postId, input) {
  if (!isValidUuid(postId)) {
    throw commentError('Invalid post ID', 400)
  }

  const rawInput = input ?? {}
  rejectUnsupportedFields(rawInput, ALLOWED_CREATE_FIELDS)

  if (!isValidCommentContent(rawInput.content)) {
    throw commentError('Content must not be empty and at most 2000 characters', 400)
  }

  await assertPostExists(postId)

  return prisma.comment.create({
    data: {
      content: normalizeCommentContent(rawInput.content),
      postId,
      // Always the authenticated caller — never trust a client-supplied authorId.
      authorId: userId,
    },
    select: COMMENT_SELECT,
  })
}

export async function listComments(postId, query) {
  if (!isValidUuid(postId)) {
    throw commentError('Invalid post ID', 400)
  }

  const pagination = parsePagination(query)
  if (!pagination) {
    throw commentError('Invalid pagination parameters', 400)
  }

  await assertPostExists(postId)

  const { page, limit } = pagination

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where: { postId },
      select: COMMENT_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.comment.count({ where: { postId } }),
  ])

  return {
    comments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  }
}

export async function updateComment(userId, commentId, input) {
  if (!isValidUuid(commentId)) {
    throw commentError('Invalid comment ID', 400)
  }

  const rawInput = input ?? {}
  rejectUnsupportedFields(rawInput, ALLOWED_UPDATE_FIELDS)

  if (!isValidCommentContent(rawInput.content)) {
    throw commentError('Content must not be empty and at most 2000 characters', 400)
  }

  await assertOwnedComment(userId, commentId)

  try {
    return await prisma.comment.update({
      where: { id: commentId },
      data: { content: normalizeCommentContent(rawInput.content) },
      select: COMMENT_SELECT,
    })
  } catch (error) {
    if (error.code === 'P2025') {
      throw commentError('Comment not found', 404)
    }
    throw error
  }
}

export async function deleteComment(userId, commentId) {
  if (!isValidUuid(commentId)) {
    throw commentError('Invalid comment ID', 400)
  }

  await assertOwnedComment(userId, commentId)

  try {
    await prisma.comment.delete({ where: { id: commentId } })
  } catch (error) {
    if (error.code === 'P2025') {
      throw commentError('Comment not found', 404)
    }
    throw error
  }
}
