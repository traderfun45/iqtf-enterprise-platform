import type { FastifyInstance } from 'fastify'
import { db } from '../db/database.js'

export async function userRoutes(app: FastifyInstance) {
  app.get('/users', async () => {
    const users = db
      .prepare(
        'SELECT id, email, name, created_at FROM users ORDER BY id DESC'
      )
      .all()

    return {
      data: users
    }
  })

  app.get('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = Number(id)

    if (!Number.isInteger(userId) || userId <= 0) {
      return reply.code(400).send({
        error: 'Invalid user id'
      })
    }

    const user = db
      .prepare(
        'SELECT id, email, name, created_at FROM users WHERE id = ?'
      )
      .get(userId)

    if (!user) {
      return reply.code(404).send({
        error: 'User not found'
      })
    }

    return {
      data: user
    }
  })

  app.post('/users', async (request, reply) => {
    const body = request.body as {
      email?: string
      name?: string
    }

    if (!body?.email || typeof body.email !== 'string') {
      return reply.code(400).send({
        error: 'email is required'
      })
    }

    const email = body.email.trim()
    const name =
      typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : null

    if (!email) {
      return reply.code(400).send({
        error: 'email is required'
      })
    }

    try {
      const result = db
        .prepare(
          'INSERT INTO users (email, name) VALUES (?, ?)'
        )
        .run(email, name)

      const user = db
        .prepare(
          'SELECT id, email, name, created_at FROM users WHERE id = ?'
        )
        .get(Number(result.lastInsertRowid))

      return reply.code(201).send({
        data: user
      })
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('UNIQUE constraint failed')
      ) {
        return reply.code(409).send({
          error: 'Email already exists'
        })
      }

      throw error
    }
  })
}
