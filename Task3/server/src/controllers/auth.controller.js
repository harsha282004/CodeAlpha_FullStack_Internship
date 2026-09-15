import { validateRegisterInput, validateLoginInput } from '../validators/auth.validator.js'
import { registerUser, loginUser, getCurrentUser } from '../services/auth.service.js'

export async function register(req, res) {
  const input = validateRegisterInput(req.body)
  const { user, token } = await registerUser(input)
  res.status(201).json({ success: true, data: { user, token } })
}

export async function login(req, res) {
  const input = validateLoginInput(req.body)
  const { user, token } = await loginUser(input)
  res.status(200).json({ success: true, data: { user, token } })
}

export async function me(req, res) {
  const user = await getCurrentUser(req.user.id)
  res.status(200).json({ success: true, data: { user } })
}
