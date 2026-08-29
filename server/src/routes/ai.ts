import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { asyncHandler, ApiError } from '../middleware/errorHandler'
import { env, isClaudeConfigured } from '../env'
import { tagClothingPhoto, suggestBeyondCloset } from '../lib/claude'
import { DEFAULT_PREFERENCES_FALLBACK } from '../lib/defaultPreferences'

export const aiRouter = Router()
aiRouter.use(requireAuth)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes },
})

aiRouter.post(
  '/tag-photo',
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    if (!isClaudeConfigured()) {
      throw new ApiError(
        503,
        'Photo auto-tagging needs an Anthropic API key — set ANTHROPIC_API_KEY on the server. You can still add this item manually.',
      )
    }
    if (!req.file) throw new ApiError(400, 'No photo uploaded — send it as multipart form field "photo".')
    if (!req.file.mimetype.startsWith('image/')) throw new ApiError(400, 'File must be an image.')

    const base64 = req.file.buffer.toString('base64')
    const tagged = await tagClothingPhoto(base64, req.file.mimetype)
    res.json({ item: tagged })
  }),
)

const suggestSchema = z.object({
  contextLabel: z.string().trim().min(1).max(300),
})

aiRouter.post(
  '/suggest',
  asyncHandler(async (req, res) => {
    if (!isClaudeConfigured()) {
      throw new ApiError(
        503,
        '"Beyond your closet" suggestions need an Anthropic API key — set ANTHROPIC_API_KEY on the server.',
      )
    }
    const { contextLabel } = suggestSchema.parse(req.body)

    const [prefsRecord, items] = await Promise.all([
      prisma.clothingPreferences.findUnique({ where: { userId: req.userId } }),
      prisma.clothingItem.findMany({ where: { userId: req.userId } }),
    ])
    const prefs = (prefsRecord?.data as Record<string, unknown> | undefined) ?? DEFAULT_PREFERENCES_FALLBACK

    const suggestions = await suggestBeyondCloset({
      contextLabel,
      modestyStyle: String(prefs.modestyStyle ?? 'no-preference'),
      coveragePreference: String(prefs.coveragePreference ?? 'modest'),
      sleevePreference: String(prefs.sleevePreference ?? 'three-quarter'),
      preferredLength: String(prefs.preferredLength ?? 'knee'),
      wardrobeFocus: String(prefs.wardrobeFocus ?? 'unisex'),
      closetSummary: items.map((i) => `${i.name} (${i.category}, ${i.formality})`),
    })

    res.json({ suggestions })
  }),
)
