import jwt from 'jsonwebtoken'
import { env } from '../env'

export interface AuthTokenPayload {
  userId: string
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] })
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret)
  if (typeof decoded === 'string' || !('userId' in decoded)) {
    throw new Error('Invalid token payload')
  }
  return { userId: (decoded as AuthTokenPayload & jwt.JwtPayload).userId }
}
