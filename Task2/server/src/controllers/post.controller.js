import {
  createPost as createPostService,
  getPostById as getPostByIdService,
  listPosts as listPostsService,
  updatePost as updatePostService,
  deletePost as deletePostService,
} from '../services/post.service.js'

export async function createPost(req, res, next) {
  try {
    const post = await createPostService(req.user.id, req.body)
    res.status(201).json({ success: true, message: 'Post created', data: { post } })
  } catch (error) {
    next(error)
  }
}

export async function getPost(req, res, next) {
  try {
    const post = await getPostByIdService(req.params.postId)
    res.json({ success: true, data: { post } })
  } catch (error) {
    next(error)
  }
}

export async function listPosts(req, res, next) {
  try {
    const { posts, pagination } = await listPostsService(req.query)
    res.json({ success: true, data: { posts, pagination } })
  } catch (error) {
    next(error)
  }
}

export async function updatePost(req, res, next) {
  try {
    const post = await updatePostService(req.user.id, req.params.postId, req.body)
    res.json({ success: true, message: 'Post updated', data: { post } })
  } catch (error) {
    next(error)
  }
}

export async function deletePost(req, res, next) {
  try {
    await deletePostService(req.user.id, req.params.postId)
    res.json({ success: true, data: { message: 'Post deleted successfully' } })
  } catch (error) {
    next(error)
  }
}
