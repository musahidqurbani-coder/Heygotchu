import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { asyncHandler, ApiError } from '../middleware/errorHandler'

export const closetRouter = Router()
closetRouter.use(requireAuth)

// Mirrors the frontend's CoverageProfile / ClothingItem shapes (see
// src/types/index.ts) loosely — kept permissive (all-optional coverage
// fields) rather than re-declaring every enum, since this is stored as Json
// and the frontend is the source of truth for exact enum values.
const coverageSchema = z
  .object({
    sleeveLength: z.string().optional(),
    strapless: z.boolean().optional(),
    backless: z.boolean().optional(),
    neckline: z.string().optional(),
    hemLength: z.string().optional(),
    bottomStyle: z.string().optional(),
    pieceCount: z.string().optional(),
    swimStyle: z.string().optional(),
    fit: z.string().optional(),
  })
  .partial()

const itemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(['top', 'bottom', 'dress', 'outerwear', 'footwear', 'swimwear', 'accessory']),
  gender: z.enum(['women', 'men', 'unisex']),
  color: z.string().trim().min(1).max(20),
  warmth: z.enum(['light', 'medium', 'warm', 'insulated']),
  formality: z.enum(['athletic', 'casual', 'smart-casual', 'formal']),
  weatherproof: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  coverage: coverageSchema.optional(),
  photo: z.string().optional(),
  photoCleaned: z.boolean().default(false),
  source: z.enum(['manual', 'ai-tagged']).default('manual'),
})

// tags/coverage are stored as JSON-serialized text (see schema.prisma) so
// the same code runs identically against SQLite (local dev) and Postgres
// (production) — Prisma's native Json type isn't supported on SQLite at all.
function serializeItem(row: {
  id: string
  name: string
  category: string
  gender: string
  color: string
  warmth: string
  formality: string
  weatherproof: boolean
  tags: string
  coverage: string | null
  photo: string | null
  photoCleaned: boolean
  source: string
  createdAt: Date
}) {
  return {
    ...row,
    tags: JSON.parse(row.tags) as string[],
    coverage: row.coverage ? JSON.parse(row.coverage) : undefined,
    photo: row.photo ?? undefined,
    createdAt: row.createdAt.getTime(),
  }
}

closetRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await prisma.clothingItem.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ items: items.map(serializeItem) })
  }),
)

// Per-user storage quota: item photos are stored as data URLs in the
// database, so usage is just the total length of those strings. Admins are
// exempt.
const USER_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024 // 1 GB

async function assertStorageQuota(userId: string, incomingBytes: number): Promise<void> {
  if (incomingBytes === 0) return
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user?.role === 'admin') return
  const rows = await prisma.$queryRaw<{ used: bigint | number | null }[]>`
    SELECT COALESCE(SUM(LENGTH("photo")), 0) AS used FROM "ClothingItem" WHERE "userId" = ${userId}`
  const used = Number(rows[0]?.used ?? 0)
  if (used + incomingBytes > USER_STORAGE_LIMIT_BYTES) {
    throw new ApiError(413, "You've reached your 1 GB photo storage limit — delete some items with photos to free up space.")
  }
}

closetRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = itemSchema.parse(req.body)
    await assertStorageQuota(req.userId!, data.photo?.length ?? 0)
    const row = await prisma.clothingItem.create({
      data: {
        ...data,
        tags: JSON.stringify(data.tags),
        coverage: data.coverage ? JSON.stringify(data.coverage) : null,
        userId: req.userId!,
      },
    })
    res.status(201).json({ item: serializeItem(row) })
  }),
)

// Partial update — used by the retroactive photo clean-up (replacing an
// existing item's photo with its background-removed cutout) and any future
// edit-item UI. Only the provided fields change.
closetRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.clothingItem.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.userId !== req.userId) throw new ApiError(404, 'Item not found.')

    const data = itemSchema.partial().parse(req.body)
    const incomingPhotoDelta = data.photo !== undefined ? data.photo.length - (existing.photo?.length ?? 0) : 0
    if (incomingPhotoDelta > 0) await assertStorageQuota(req.userId!, incomingPhotoDelta)

    const row = await prisma.clothingItem.update({
      where: { id: req.params.id },
      data: {
        ...data,
        tags: data.tags !== undefined ? JSON.stringify(data.tags) : undefined,
        coverage: data.coverage !== undefined ? JSON.stringify(data.coverage) : undefined,
      },
    })
    res.json({ item: serializeItem(row) })
  }),
)

closetRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.clothingItem.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.userId !== req.userId) {
      throw new ApiError(404, 'Item not found.')
    }
    await prisma.clothingItem.delete({ where: { id: req.params.id } })
    res.status(204).end()
  }),
)
