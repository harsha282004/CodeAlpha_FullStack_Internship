import { prisma } from '../config/prisma.js'
import { parsePagination } from '../utils/validation.js'

// Never add email or passwordHash to this — post authors are visible to
// anyone who can read the feed/explore stream.
const SAFE_AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
}

// _count gives like/comment totals in the same findMany call — no per-post
// follow-up queries needed.
const FEED_POST_SELECT = {
  id: true,
  content: true,
  imageUrl: true,
  createdAt: true,
  updatedAt: true,
  author: { select: SAFE_AUTHOR_SELECT },
  _count: {
    select: { likes: true, comments: true },
  },
}

function feedError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

function shapePost(post, likedByMe) {
  const { _count, ...rest } = post
  return {
    ...rest,
    likeCount: _count.likes,
    commentCount: _count.comments,
    likedByMe,
  }
}

function findPostsPage(where, { page, limit }) {
  return Promise.all([
    prisma.post.findMany({
      where,
      select: FEED_POST_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ])
}

// One extra query for the whole page, not one per post — avoids N+1.
async function getLikedPostIds(userId, postIds) {
  if (postIds.length === 0) return new Set()

  const likedRows = await prisma.like.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true },
  })

  return new Set(likedRows.map((row) => row.postId))
}

function buildPagedResult(posts, total, { page, limit }) {
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

export async function getFeed(userId, query) {
  const pagination = parsePagination(query)
  if (!pagination) {
    throw feedError('Invalid pagination parameters', 400)
  }

  // One query to resolve who the caller follows, then a single IN-list
  // filter — not a query per followed author.
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  })
  const authorIds = [userId, ...follows.map((follow) => follow.followingId)]

  const [posts, total] = await findPostsPage({ authorId: { in: authorIds } }, pagination)
  const likedPostIds = await getLikedPostIds(
    userId,
    posts.map((post) => post.id),
  )
  const shapedPosts = posts.map((post) => shapePost(post, likedPostIds.has(post.id)))

  return buildPagedResult(shapedPosts, total, pagination)
}

export async function getExplore(query) {
  const pagination = parsePagination(query)
  if (!pagination) {
    throw feedError('Invalid pagination parameters', 400)
  }

  const [posts, total] = await findPostsPage({}, pagination)
  // No authenticated viewer for a public endpoint, so likedByMe is always false.
  const shapedPosts = posts.map((post) => shapePost(post, false))

  return buildPagedResult(shapedPosts, total, pagination)
}
