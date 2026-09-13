import { registerUser, loginUser, getCurrentUser } from '../services/auth.service.js'

export async function register(req, res, next) {
  try {
    const { name, username, email, password } = req.body ?? {}
    const { user, token } = await registerUser({ name, username, email, password })
    res.status(201).json({ success: true, message: 'Account created', data: { user, token } })
  } catch (error) {
    next(error)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {}
    const { user, token } = await loginUser({ email, password })
    res.json({ success: true, message: 'Logged in', data: { user, token } })
  } catch (error) {
    next(error)
  }
}

export async function me(req, res, next) {
  try {
    const user = await getCurrentUser(req.user.id)
    res.json({ success: true, data: { user } })
  } catch (error) {
    next(error)
  }
}
