import { Router, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { asyncHandler, ApiError } from '../middleware/errorHandler'
import { env, isClaudeConfigured } from '../env'
import { tagClothingPhoto, suggestBeyondCloset, analyzeSelfieColors, suggestOutfitCombos } from '../lib/claude'
import { findOccasion } from '../lib/occasions'
import { DEFAULT_PREFERENCES_FALLBACK } from '../lib/defaultPreferences'

export const aiRouter = Router()
aiRouter.use(requireAuth)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes },
})

// --- Daily AI limit ---------------------------------------------------------
// Non-admin accounts get AI_DAILY_LIMIT runs per rolling 24 hours across all
// AI endpoints; admins are unlimited. The check runs before the (expensive)
// Claude call; a run is only recorded after a successful one.

const AI_DAILY_LIMIT = 3

async function aiRateLimit(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (user?.role === 'admin') return next()

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const used = await prisma.aiRun.count({ where: { userId: req.userId, createdAt: { gt: since } } })
    if (used >= AI_DAILY_LIMIT) {
      return next(
        new ApiError(429, `You've used all ${AI_DAILY_LIMIT} AI runs for today — they refresh over the next 24 hours.`),
      )
    }
    next()
  } catch (err) {
    next(err)
  }
}

async function recordRun(userId: string, kind: string): Promise<void> {
  await prisma.aiRun.create({ data: { userId, kind } })
}

function requireClaude() {
  if (!isClaudeConfigured()) {
    throw new ApiError(503, 'AI features need an Anthropic API key — set ANTHROPIC_API_KEY on the server.')
  }
}

// --- Photo auto-tagging -----------------------------------------------------

aiRouter.post(
  '/tag-photo',
  aiRateLimit,
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    requireClaude()
    if (!req.file) throw new ApiError(400, 'No photo uploaded — send it as multipart form field "photo".')
    if (!req.file.mimetype.startsWith('image/')) throw new ApiError(400, 'File must be an image.')

    const base64 = req.file.buffer.toString('base64')
    const tagged = await tagClothingPhoto(base64, req.file.mimetype)
    await recordRun(req.userId!, 'tag-photo')
    res.json({ item: tagged })
  }),
)

// --- Beyond-your-closet suggestions ----------------------------------------

const suggestSchema = z.object({
  contextLabel: z.string().trim().min(1).max(300),
})

aiRouter.post(
  '/suggest',
  aiRateLimit,
  asyncHandler(async (req, res) => {
    requireClaude()
    const { contextLabel } = suggestSchema.parse(req.body)

    const [prefsRecord, items] = await Promise.all([
      prisma.clothingPreferences.findUnique({ where: { userId: req.userId } }),
      prisma.clothingItem.findMany({ where: { userId: req.userId } }),
    ])
    const prefs = (prefsRecord ? (JSON.parse(prefsRecord.data) as Record<string, unknown>) : undefined) ?? DEFAULT_PREFERENCES_FALLBACK

    const suggestions = await suggestBeyondCloset({
      contextLabel,
      modestyStyle: String(prefs.modestyStyle ?? 'no-preference'),
      coveragePreference: String(prefs.coveragePreference ?? 'modest'),
      sleevePreference: String(prefs.sleevePreference ?? 'three-quarter'),
      preferredLength: String(prefs.preferredLength ?? 'knee'),
      wardrobeFocus: String(prefs.wardrobeFocus ?? 'unisex'),
      closetSummary: items.map((i) => `${i.name} (${i.category}, ${i.formality})`),
    })
    await recordRun(req.userId!, 'suggest')
    res.json({ suggestions })
  }),
)

// --- Selfie color-palette analysis ------------------------------------------
// The selfie is analyzed in memory and never stored; only the derived color
// palette is merged into the user's preferences blob (as `colorAnalysis`).

aiRouter.post(
  '/analyze-selfie',
  aiRateLimit,
  upload.single('selfie'),
  asyncHandler(async (req, res) => {
    requireClaude()
    if (!req.file) throw new ApiError(400, 'No selfie uploaded — send it as multipart form field "selfie".')
    if (!req.file.mimetype.startsWith('image/')) throw new ApiError(400, 'File must be an image.')

    const base64 = req.file.buffer.toString('base64')
    const analysis = await analyzeSelfieColors(base64, req.file.mimetype)
    if (!analysis.ok) {
      throw new ApiError(422, "We couldn't see you clearly in that photo — try a brighter, front-facing one.")
    }

    const record = await prisma.clothingPreferences.findUnique({ where: { userId: req.userId } })
    const prefs = record ? (JSON.parse(record.data) as Record<string, unknown>) : {}
    prefs.colorAnalysis = analysis
    const data = JSON.stringify(prefs)
    await prisma.clothingPreferences.upsert({
      where: { userId: req.userId },
      create: { userId: req.userId!, data },
      update: { data },
    })

    await recordRun(req.userId!, 'analyze-selfie')
    res.json({ analysis })
  }),
)

// --- Occasion / location outfit ideas ---------------------------------------

const outfitsSchema = z.object({
  occasionId: z.string().trim().max(80).optional(),
  occasionLabel: z.string().trim().max(160).optional(),
  location: z.string().trim().max(160).optional(),
  dateISO: z.string().trim().max(20).optional(),
})

aiRouter.post(
  '/outfits',
  aiRateLimit,
  asyncHandler(async (req, res) => {
    requireClaude()
    const body = outfitsSchema.parse(req.body)
    const occasion = body.occasionId ? findOccasion(body.occasionId) : undefined
    const occasionLabel = occasion?.label ?? body.occasionLabel
    if (!occasionLabel) throw new ApiError(400, 'Pick an occasion first.')

    const [prefsRecord, items] = await Promise.all([
      prisma.clothingPreferences.findUnique({ where: { userId: req.userId } }),
      prisma.clothingItem.findMany({ where: { userId: req.userId } }),
    ])
    const prefs = (prefsRecord ? (JSON.parse(prefsRecord.data) as Record<string, unknown>) : undefined) ?? DEFAULT_PREFERENCES_FALLBACK
    const colorAnalysis = prefs.colorAnalysis as
      | { seasonalType?: string; bestColors?: { hex: string; name: string }[]; avoidColors?: { hex: string; name: string }[] }
      | undefined

    const closetLines = items.map((i) => {
      const coverage = i.coverage ? (JSON.parse(i.coverage) as { sleeveLength?: string }) : undefined
      return `${i.id} | ${i.name} | ${i.category} | ${i.color} | ${i.formality} | ${i.warmth} | ${coverage?.sleeveLength ?? '-'}`
    })

    const result = await suggestOutfitCombos({
      occasionLabel,
      location: body.location || undefined,
      dateISO: body.dateISO || undefined,
      modestyStyle: String(prefs.modestyStyle ?? 'no-preference'),
      coveragePreference: String(prefs.coveragePreference ?? 'modest'),
      wardrobeFocus: String(prefs.wardrobeFocus ?? 'unisex'),
      colorAnalysis,
      closetLines,
    })

    await recordRun(req.userId!, 'outfits')
    res.json({ ...result, occasionLabel })
  }),
)
