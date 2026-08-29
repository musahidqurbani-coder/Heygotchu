import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { hashPassword, verifyPassword } from '../lib/password'
import { signAuthToken } from '../lib/jwt'
import { createOtp, verifyOtp } from '../lib/otp'
import { sendOtpEmail } from '../lib/email'
import { asyncHandler, ApiError } from '../middleware/errorHandler'
import { requireAuth } from '../middleware/auth'

export const authRouter = Router()

// Email + password only — verification happens via a one-time code sent to
// that email address.
const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
})

function publicUser(user: { id: string; email: string; verified: boolean; role: string }) {
  return { id: user.id, email: user.email, verified: user.verified, role: user.role }
}

authRouter.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { email, password } = signupSchema.parse(req.body)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ApiError(409, 'An account with this email already exists.')
    }

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({ data: { email, passwordHash } })

    res.status(201).json({
      user: publicUser(user),
      message: 'Account created. Call /auth/send-otp to verify it.',
    })
  }),
)

// Accepts EITHER a userId (right after signup, when the client already has
// it) OR an email (e.g. resending a code from the login screen after a
// "please verify your account" error, when the client only has what the
// person typed into the login form).
const sendOtpSchema = z
  .object({
    userId: z.string().min(1).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
  })
  .refine((v) => v.userId || v.email, { message: 'userId or email is required.' })

authRouter.post(
  '/send-otp',
  asyncHandler(async (req, res) => {
    const { userId, email } = sendOtpSchema.parse(req.body)
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findUnique({ where: { email } })
    if (!user) throw new ApiError(404, 'Account not found.')

    const { code, expiresAt } = await createOtp(user.id)
    const result = await sendOtpEmail(user.email, code)

    res.json({
      sent: true,
      userId: user.id,
      delivered: result.delivered,
      expiresAt,
      // Only present when no real email provider is configured yet (dev
      // mode) — lets the UI show the code directly instead of the user
      // needing a real inbox during development.
      devCode: result.devCode,
    })
  }),
)

const verifyOtpSchema = z.object({
  userId: z.string().min(1),
  code: z.string().length(6),
})

authRouter.post(
  '/verify-otp',
  asyncHandler(async (req, res) => {
    const { userId, code } = verifyOtpSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new ApiError(404, 'Account not found.')

    const result = await verifyOtp(userId, code)
    if (!result.ok) {
      const messages: Record<typeof result.reason, string> = {
        'not-found': 'No pending code — request a new one.',
        expired: 'This code has expired — request a new one.',
        'too-many-attempts': 'Too many incorrect attempts — request a new one.',
        incorrect: 'Incorrect code.',
      }
      throw new ApiError(400, messages[result.reason])
    }

    const updated = await prisma.user.update({ where: { id: userId }, data: { verified: true } })

    const token = signAuthToken({ userId: updated.id })
    res.json({ token, user: publicUser(updated) })
  }),
)

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) throw new ApiError(401, 'Incorrect email or password.')

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) throw new ApiError(401, 'Incorrect email or password.')

    if (!user.verified) {
      throw new ApiError(403, 'Please verify your account with the code sent to your email before logging in.')
    }

    const token = signAuthToken({ userId: user.id })
    res.json({ token, user: publicUser(user) })
  }),
)

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) throw new ApiError(404, 'Account not found.')
    res.json({ user: publicUser(user) })
  }),
)
