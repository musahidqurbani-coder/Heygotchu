import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Wraps an async route handler so a rejected promise reaches errorHandler
// below instead of crashing the process / hanging the request.
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  fn: T,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message })
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Invalid request.', details: err.flatten() })
  }
  console.error(err)
  return res.status(500).json({ error: 'Something went wrong. Please try again.' })
}
