import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../db'
import { env } from '../env'

function generateCode(): string {
  // 6-digit numeric code, always zero-padded.
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export interface CreatedOtp {
  code: string // the plaintext code — caller is responsible for delivering it and MUST NOT log/store it beyond that
  otpId: string
  expiresAt: Date
}

export async function createOtp(userId: string): Promise<CreatedOtp> {
  const code = generateCode()
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60_000)

  // Invalidate any previous unconsumed codes for this user so only the most
  // recent one is valid — avoids a stale earlier code still working.
  await prisma.otpCode.updateMany({
    where: { userId, consumedAt: null },
    data: { consumedAt: new Date() },
  })

  const record = await prisma.otpCode.create({
    data: { userId, codeHash, expiresAt },
  })

  return { code, otpId: record.id, expiresAt }
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: 'not-found' | 'expired' | 'too-many-attempts' | 'incorrect' }

export async function verifyOtp(userId: string, code: string): Promise<VerifyOtpResult> {
  const record = await prisma.otpCode.findFirst({
    where: { userId, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  if (!record) return { ok: false, reason: 'not-found' }

  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' }
  if (record.attempts >= env.otpMaxAttempts) return { ok: false, reason: 'too-many-attempts' }

  const matches = await bcrypt.compare(code, record.codeHash)
  if (!matches) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } })
    return { ok: false, reason: 'incorrect' }
  }

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } })
  return { ok: true }
}
