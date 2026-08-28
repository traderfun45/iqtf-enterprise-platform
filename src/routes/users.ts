import type { FastifyInstance } from 'fastify'
import { db } from '../db/database.js'
import { hashPassword, verifyPassword } from '../utils/password.js'

export async function userRoutes(app: FastifyInstance) {
  // Render Free has ephemeral storage. Bootstrap the first admin
  // from environment variables whenever the SQLite database is empty.
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD

  if (adminEmail && adminPassword) {
    const existingUser = db
      .prepare('SELECT id FROM users LIMIT 1')
      .get() as { id: number } | undefined

    if (!existingUser) {
      if (adminPassword.length < 8) {
        throw new Error('ADMIN_PASSWORD must be at least 8 characters')
      }

      const passwordHash = await hashPassword(adminPassword)

      db.prepare(
        `INSERT INTO users (email, name, password_hash, role)
         VALUES (?, ?, ?, 'ADMIN')`,
      ).run(adminEmail, 'IQTF Administrator', passwordHash)

      console.log('[AUTH] Bootstrap admin created:', adminEmail)
    }
  }

  app.get('/users', async () => {
    const users = db
      .prepare(
        'SELECT id, email, name, role, created_at FROM users ORDER BY id DESC',
      )
      .all()

    return {
      data: users,
    }
  })

  app.get('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = Number(id)

    if (!Number.isInteger(userId) || userId <= 0) {
      return reply.code(400).send({
        error: 'Invalid user id',
      })
    }

    const user = db
      .prepare(
        'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
      )
      .get(userId)

    if (!user) {
      return reply.code(404).send({
        error: 'User not found',
      })
    }

    return {
      data: user,
    }
  })


  app.post('/login', async (request, reply) => {
    const body = request.body as {
      email?: string
      password?: string
    }

    if (!body?.email || typeof body.email !== 'string') {
      return reply.code(400).send({
        error: 'email is required',
      })
    }

    if (!body?.password || typeof body.password !== 'string') {
      return reply.code(400).send({
        error: 'password is required',
      })
    }

    const email = body.email.trim().toLowerCase()
    const password = body.password

    if (!email) {
      return reply.code(400).send({
        error: 'email is required',
      })
    }

    const user = db
      .prepare(
        `SELECT
          id,
          email,
          name,
          role,
          password_hash,
          created_at
        FROM users
        WHERE email = ?`,
      )
      .get(email) as {
        id: number
        email: string
        name: string | null
        role: string
        password_hash: string | null
        created_at: string
      } | undefined

    if (!user || !user.password_hash) {
      return reply.code(401).send({
        error: 'Invalid email or password',
      })
    }

    const valid = await verifyPassword(password, user.password_hash)

    if (!valid) {
      return reply.code(401).send({
        error: 'Invalid email or password',
      })
    }

    return reply.send({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
      },
    })
  })

  app.post('/users', async (request, reply) => {
    const body = request.body as {
      email?: string
      name?: string
      password?: string
    }

    if (!body?.email || typeof body.email !== 'string') {
      return reply.code(400).send({
        error: 'email is required',
      })
    }

    if (!body?.password || typeof body.password !== 'string') {
      return reply.code(400).send({
        error: 'password is required',
      })
    }

    const email = body.email.trim()

    const name =
      typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : null

    const password = body.password

    if (!email) {
      return reply.code(400).send({
        error: 'email is required',
      })
    }

    if (password.length < 8) {
      return reply.code(400).send({
        error: 'password must be at least 8 characters',
      })
    }

    try {
      const passwordHash = await hashPassword(password)

      const result = db
        .prepare(
          `
          INSERT INTO users (
            email,
            name,
            password_hash
          )
          VALUES (?, ?, ?)
          `,
        )
        .run(email, name, passwordHash)

      const user = db
        .prepare(
          `
          SELECT
            id,
            email,
            name,
            role,
            created_at
          FROM users
          WHERE id = ?
          `,
        )
        .get(Number(result.lastInsertRowid))

      return reply.code(201).send({
        data: user,
      })
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('UNIQUE constraint failed')
      ) {
        return reply.code(409).send({
          error: 'Email already exists',
        })
      }

      throw error
    }
  })
}
