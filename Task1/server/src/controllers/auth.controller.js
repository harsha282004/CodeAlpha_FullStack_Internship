import { registerUser, loginUser, getUserById } from '../services/auth.service.js'
import { AppError } from '../utils/AppError.js'
import { isValidEmail, isValidName, isValidPassword } from '../utils/validate.js'

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body ?? {}

    if (!isValidName(name)) {
      throw new AppError('Name must be between 2 and 100 characters', 400)
    }
    if (!isValidEmail(email)) {
      throw new AppError('A valid email is required', 400)
    }
    if (!isValidPassword(password)) {
      throw new AppError('Password must be between 8 and 72 characters', 400)
    }

    const { user, token } = await registerUser({ name, email, password })
    res.status(201).json({ user, token })
  } catch (error) {
    next(error)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {}

    if (!isValidEmail(email) || typeof password !== 'string' || password.length === 0) {
      throw new AppError('Email and password are required', 400)
    }

    const { user, token } = await loginUser({ email, password })
    res.json({ user, token })
  } catch (error) {
    next(error)
  }
}

export async function me(req, res, next) {
  try {
    const user = await getUserById(req.user.id)
    res.json({ user })
  } catch (error) {
    next(error)
  }
}
