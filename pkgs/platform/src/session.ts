import type { FastifyReply, FastifyRequest } from 'fastify'
import _ from './server/session/lib'

export const loadSession = async (req: FastifyRequest, res: FastifyReply) => {
  const r = req as any

  if (!r.session) {
    await r.handleSession()
  }

  if (
    !!r.session &&
    (Object.keys(r.session).length === 0 ||
      !r.session.user ||
      (r.session.user && !r.session.user.role))
  ) {
    r.session.user = {
      role: 'guest',
    }
  }

  return r.session
}
