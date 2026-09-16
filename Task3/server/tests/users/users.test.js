import { describe, it, expect, beforeEach } from 'vitest'
import { api, resetDb, registerUser, authHeader } from '../helpers.js'

describe('users / profiles', () => {
  beforeEach(async () => {
    await resetDb()
  })

  describe('GET /api/users/me', () => {
    it("returns the caller's own private profile, including email", async () => {
      const { token, user } = await registerUser()
      const res = await api.get('/api/users/me').set(authHeader(token))
      expect(res.status).toBe(200)
      expect(res.body.data.user.email).toBe(user.email)
    })

    it('rejects unauthenticated requests', async () => {
      const res = await api.get('/api/users/me')
      expect(res.status).toBe(401)
    })
  })

  describe('PATCH /api/users/me', () => {
    it('updates name/username/bio/avatarUrl', async () => {
      const { token } = await registerUser()
      const res = await api
        .patch('/api/users/me')
        .set(authHeader(token))
        .send({ name: 'Updated Name', bio: 'Updated bio.' })
      expect(res.status).toBe(200)
      expect(res.body.data.user.name).toBe('Updated Name')
      expect(res.body.data.user.bio).toBe('Updated bio.')
    })

    it('rejects an unsupported field (mass-assignment attempt: role)', async () => {
      const { token } = await registerUser()
      const res = await api.patch('/api/users/me').set(authHeader(token)).send({ role: 'ADMIN' })
      expect(res.status).toBe(400)
    })

    it('rejects an attempt to change email through this endpoint', async () => {
      const { token } = await registerUser()
      const res = await api.patch('/api/users/me').set(authHeader(token)).send({ email: 'new@example.com' })
      expect(res.status).toBe(400)
    })

    it('rejects an attempt to set passwordHash directly', async () => {
      const { token } = await registerUser()
      const res = await api.patch('/api/users/me').set(authHeader(token)).send({ passwordHash: 'hacked' })
      expect(res.status).toBe(400)
    })

    it('rejects an empty body', async () => {
      const { token } = await registerUser()
      const res = await api.patch('/api/users/me').set(authHeader(token)).send({})
      expect(res.status).toBe(400)
    })

    it('rejects a duplicate username (already taken by someone else)', async () => {
      await registerUser({ username: 'taken_name' })
      const { token } = await registerUser({ username: 'changeable_name' })
      const res = await api.patch('/api/users/me').set(authHeader(token)).send({ username: 'taken_name' })
      expect(res.status).toBe(409)
    })
  })

  describe('GET /api/users/:username (public profile)', () => {
    it('returns public fields only — never email or passwordHash', async () => {
      const { user } = await registerUser({ username: 'public_check' })
      const res = await api.get(`/api/users/${user.username}`)
      expect(res.status).toBe(200)
      expect(res.body.data.user.username).toBe('public_check')
      expect(res.body.data.user.email).toBeUndefined()
      expect(JSON.stringify(res.body)).not.toContain('passwordHash')
    })

    it('returns 404 for a nonexistent username', async () => {
      const res = await api.get('/api/users/no_such_user_at_all')
      expect(res.status).toBe(404)
    })

    it('does not require authentication', async () => {
      const { user } = await registerUser({ username: 'no_auth_needed' })
      const res = await api.get(`/api/users/${user.username}`)
      expect(res.status).toBe(200)
    })
  })

  describe('GET /api/users/search', () => {
    it('finds a user by partial username, case-insensitively', async () => {
      await registerUser({ name: 'Searchable Person', username: 'searchable_person' })
      const res = await api.get('/api/users/search').query({ q: 'SEARCHABLE' })
      expect(res.status).toBe(200)
      expect(res.body.data.users.some((u) => u.username === 'searchable_person')).toBe(true)
    })

    it('rejects a missing/empty q (no unrestricted "list everyone")', async () => {
      const res = await api.get('/api/users/search').query({ q: '' })
      expect(res.status).toBe(400)
    })

    it('rejects an invalid (negative) page', async () => {
      const res = await api.get('/api/users/search').query({ q: 'a', page: '-1' })
      expect(res.status).toBe(400)
    })

    it('rejects a limit above the maximum', async () => {
      const res = await api.get('/api/users/search').query({ q: 'a', limit: '999' })
      expect(res.status).toBe(400)
    })
  })
})
