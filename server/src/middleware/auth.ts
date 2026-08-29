import type { NextFunction, Request, Response } from 'express'
import { verifyAuthToken } from '../lib/jwt'

// Augment Express's Request type with the authenticated user id, set by
// requireAuth below. Every per-user route (closet, preferences, events, ai)
// reads req.userId — never a value from the request body — to scope its
// database queries, which is what keeps each account's data isolated.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' })
  }
  const token = header.slice('Bearer '.length)
  try {
    const payload = verifyAuthToken(token)
    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' })
  }
}
