import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'

export const preferencesRouter = Router()
preferencesRouter.use(requireAuth)

// Stored as a single opaque Json blob per user — the frontend's
// ClothingPreferences shape (src/types/index.ts) is the source of truth;
// the server just persists whatever object it's given for this user and
// hands it back unchanged, the same round-trip contract localStorage used
// to provide.
const preferencesBodySchema = z.record(z.string(), z.unknown())

preferencesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const record = await prisma.clothingPreferences.findUnique({ where: { userId: req.userId } })
    res.json({ preferences: record ? JSON.parse(record.data) : null })
  }),
)

preferencesRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = preferencesBodySchema.parse(req.body)
    const data = JSON.stringify(parsed)
    const record = await prisma.clothingPreferences.upsert({
      where: { userId: req.userId },
      create: { userId: req.userId!, data },
      update: { data },
    })
    res.json({ preferences: JSON.parse(record.data) })
  }),
)
