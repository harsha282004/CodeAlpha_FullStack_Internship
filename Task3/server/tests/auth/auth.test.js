import { describe, it, expect, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { api, resetDb, registerUser } from '../helpers.js'

describe('auth', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('POST /api/auth/register', () => {
    it('registers a user and returns a safe user + token', async () => {
      const res = await api.post('/api/auth/register').send({
        name: 'Alex Morgan',
        username: 'alex_morgan_t',
        email: 'alex.morgan.t@example.com',
        password: 'password123',
      })
      expect(res.status).toBe(201)
      expect(res.body.data.user.email).toBe('alex.morgan.t@example.com')
      expect(res.body.data.token).toEqual(expect.any(String))
      expect(res.body.data.user.passwordHash).toBeUndefined()
      expect(JSON.stringify(res.body)).not.toContain('passwordHash')
    })

    it('rejects a duplicate email', async () => {
      await registerUser({ email: 'dup@example.com', username: 'dup_one' })
      const res = await api.post('/api/auth/register').send({
        name: 'Someone Else',
        username: 'dup_two',
        email: 'dup@example.com',
        password: 'password123',
      })
      expect(res.status).toBe(409)
    })

    it('rejects a duplicate username', async () => {
      await registerUser({ email: 'first@example.com', username: 'dupname' })
      const res = await api.post('/api/auth/register').send({
        name: 'Someone Else',
        username: 'dupname',
        email: 'second@example.com',
        password: 'password123',
      })
      expect(res.status).toBe(409)
    })

    it('rejects missing required fields', async () => {
      const res = await api.post('/api/auth/register').send({ email: 'incomplete@example.com' })
      expect(res.status).toBe(400)
    })

    it('rejects an empty-string name', async () => {
      const res = await api.post('/api/auth/register').send({
        name: '   ',
        username: 'whitespace_name',
        email: 'whitespace@example.com',
        password: 'password123',
      })
      expect(res.status).toBe(400)
    })

    it('rejects a malformed username (uppercase not allowed)', async () => {
      const res = await api.post('/api/auth/register').send({
        name: 'Bad Username',
        username: 'BadUsername',
        email: 'baduser@example.com',
        password: 'password123',
      })
      expect(res.status).toBe(400)
    })

    it('rejects a password shorter than 8 characters', async () => {
      const res = await api.post('/api/auth/register').send({
        name: 'Short Pw',
        username: 'short_pw',
        email: 'shortpw@example.com',
        password: 'short',
      })
      expect(res.status).toBe(400)
    })

    it('rejects a password longer than 72 characters instead of silently truncating', async () => {
      const res = await api.post('/api/auth/register').send({
        name: 'Long Pw',
        username: 'long_pw',
        email: 'longpw@example.com',
        password: 'x'.repeat(73),
      })
      expect(res.status).toBe(400)
    })

    it('never persists or returns the raw password anywhere in the response', async () => {
      const res = await api.post('/api/auth/register').send({
        name: 'Secret Check',
        username: 'secret_check',
        email: 'secretcheck@example.com',
        password: 'superSecretPassword1',
      })
      expect(JSON.stringify(res.body)).not.toContain('superSecretPassword1')
    })
  })

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials', async () => {
      await registerUser({ email: 'login@example.com', username: 'login_user', password: 'password123' })
      const res = await api.post('/api/auth/login').send({ email: 'login@example.com', password: 'password123' })
      expect(res.status).toBe(200)
      expect(res.body.data.token).toEqual(expect.any(String))
    })

    it('rejects an incorrect password with a generic message', async () => {
      await registerUser({ email: 'login2@example.com', username: 'login_user2', password: 'password123' })
      const res = await api.post('/api/auth/login').send({ email: 'login2@example.com', password: 'wrongpassword' })
      expect(res.status).toBe(401)
      expect(res.body.message).toBe('Invalid email or password')
    })

    it('rejects a nonexistent account with the identical generic message (no enumeration)', async () => {
      const res = await api.post('/api/auth/login').send({ email: 'nobody@example.com', password: 'whatever123' })
      expect(res.status).toBe(401)
      expect(res.body.message).toBe('Invalid email or password')
    })

    it('never returns passwordHash on successful login', async () => {
      await registerUser({ email: 'nohash@example.com', username: 'nohash_user', password: 'password123' })
      const res = await api.post('/api/auth/login').send({ email: 'nohash@example.com', password: 'password123' })
      expect(JSON.stringify(res.body)).not.toContain('passwordHash')
    })
  })

  describe('GET /api/auth/me', () => {
    it('returns the authenticated user', async () => {
      const { token } = await registerUser()
      const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.data.user).toBeDefined()
      expect(res.body.data.user.passwordHash).toBeUndefined()
    })

    it('rejects a missing Authorization header', async () => {
      const res = await api.get('/api/auth/me')
      expect(res.status).toBe(401)
    })

    it('rejects a malformed Authorization header (wrong scheme)', async () => {
      const { token } = await registerUser()
      const res = await api.get('/api/auth/me').set('Authorization', `Token ${token}`)
      expect(res.status).toBe(401)
    })

    it('rejects an empty bearer token', async () => {
      const res = await api.get('/api/auth/me').set('Authorization', 'Bearer ')
      expect(res.status).toBe(401)
    })

    it('rejects a malformed (non-JWT) token', async () => {
      const res = await api.get('/api/auth/me').set('Authorization', 'Bearer not.a.real.jwt')
      expect(res.status).toBe(401)
    })

    it('rejects a tampered token (payload altered after signing)', async () => {
      const { token } = await registerUser()
      const [header, payload, signature] = token.split('.')
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
      const tamperedPayload = Buffer.from(JSON.stringify({ ...decoded, sub: 'ffffffff-ffff-4fff-8fff-ffffffffffff' })).toString(
        'base64url',
      )
      const tamperedToken = `${header}.${tamperedPayload}.${signature}`
      const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${tamperedToken}`)
      expect(res.status).toBe(401)
    })

    it('rejects a token signed with the wrong secret', async () => {
      const wrongSecretToken = jwt.sign({ sub: '11111111-1111-4111-8111-111111111111' }, 'a-completely-different-secret')
      const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${wrongSecretToken}`)
      expect(res.status).toBe(401)
    })

    it('rejects an expired token', async () => {
      const expiredToken = jwt.sign({ sub: '11111111-1111-4111-8111-111111111111' }, process.env.JWT_SECRET, {
        expiresIn: -10, // already expired
      })
      const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${expiredToken}`)
      expect(res.status).toBe(401)
    })

    it("JWT payload contains only the subject claim plus standard iat/exp — no email, role, or other data", async () => {
      const { token } = await registerUser()
      const decoded = jwt.decode(token)
      expect(Object.keys(decoded).sort()).toEqual(['exp', 'iat', 'sub'])
    })
  })

  describe('protected routes reject unauthenticated requests generally', () => {
    it('a representative protected route (list projects) requires auth', async () => {
      const res = await api.get('/api/projects')
      expect(res.status).toBe(401)
    })
  })
})
