import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { asyncHandler, ApiError } from '../middleware/errorHandler'
import { OCCASION_TYPES } from '../lib/occasions'

export const eventsRouter = Router()
eventsRouter.use(requireAuth)

// Catalog of occasion/theme types for the "Occasion" planning mode — not
// user-specific, but grouped under this router since it's what the occasion
// planner UI needs alongside the CRUD below.
eventsRouter.get('/occasion-types', (_req, res) => {
  res.json({ occasionTypes: OCCASION_TYPES })
})

// A saved plan is stored as one denormalized Json blob (`data`) — it mirrors
// exactly what the frontend already builds client-side for a TripPlan or an
// OccasionPlan, so the server doesn't need to model destinations, weather
// days, or outfit items relationally. `mode` and `title` are pulled out as
// real columns purely so list views can query/sort without touching `data`.
const eventPlanSchema = z.object({
  mode: z.enum(['destination', 'occasion']),
  title: z.string().trim().min(1).max(200),
  data: z.record(z.string(), z.unknown()),
})

function serializePlan(row: { id: string; mode: string; title: string; data: string; createdAt: Date }) {
  return { ...row, data: JSON.parse(row.data), createdAt: row.createdAt.getTime() }
}

eventsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const plans = await prisma.eventPlan.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ plans: plans.map(serializePlan) })
  }),
)

eventsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = eventPlanSchema.parse(req.body)
    const row = await prisma.eventPlan.create({
      data: { ...body, data: JSON.stringify(body.data), userId: req.userId! },
    })
    res.status(201).json({ plan: serializePlan(row) })
  }),
)

eventsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.eventPlan.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.userId !== req.userId) {
      throw new ApiError(404, 'Saved plan not found.')
    }
    await prisma.eventPlan.delete({ where: { id: req.params.id } })
    res.status(204).end()
  }),
)
