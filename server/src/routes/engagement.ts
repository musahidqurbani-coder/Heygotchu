import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { asyncHandler, ApiError } from '../middleware/errorHandler'

// Streak + Save-the-date: the daily-engagement layer. Both live behind auth.
export const engagementRouter = Router()
engagementRouter.use(requireAuth)

// --- Streak -----------------------------------------------------------------
// A day counts when the app is opened (frontend calls GET /engagement/streak
// on load). Days are reckoned in Asia/Kolkata — the family's timezone — so
// "today" flips at local midnight, not UTC. Consecutive days grow the
// streak; a gap resets it to 1. Tiers and their photo-storage allowances:
//   Silver    from day 1     · 100 photos
//   Gold      from day 90    · 250 photos
//   Platinum  from day 181   · 500 photos
//   Diamond   from day 365   · 500 photos + Amazon voucher (up to ₹1000)

const TIERS = [
  { name: 'diamond', minDays: 365, photoLimit: 500, perk: 'Amazon voucher up to ₹1000' },
  { name: 'platinum', minDays: 181, photoLimit: 500 },
  { name: 'gold', minDays: 90, photoLimit: 250 },
  { name: 'silver', minDays: 0, photoLimit: 100 },
] as const

function kolkataDay(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) // YYYY-MM-DD
}

export function tierFor(streakCount: number) {
  return TIERS.find((t) => streakCount >= t.minDays) ?? TIERS[TIERS.length - 1]
}

engagementRouter.get(
  '/streak',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) throw new ApiError(404, 'Account not found.')

    const today = kolkataDay()
    const yesterday = kolkataDay(-1)

    let { streakCount, bestStreak, lastActiveDay } = user
    if (lastActiveDay !== today) {
      streakCount = lastActiveDay === yesterday ? streakCount + 1 : 1
      bestStreak = Math.max(bestStreak, streakCount)
      await prisma.user.update({
        where: { id: user.id },
        data: { streakCount, bestStreak, lastActiveDay: today },
      })
    }

    const tier = tierFor(streakCount)
    const next = TIERS.filter((t) => t.minDays > streakCount).pop() // closest tier above
    res.json({
      streak: streakCount,
      bestStreak,
      tier: tier.name,
      photoLimit: tier.photoLimit,
      perk: 'perk' in tier ? tier.perk : undefined,
      nextTier: next ? { name: next.name, atDays: next.minDays, daysToGo: next.minDays - streakCount } : undefined,
    })
  }),
)

// --- Save the date ----------------------------------------------------------

const DEFAULT_REMINDERS = [5, 2, 1, 0]

const dateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  kind: z.enum(['occasion', 'trip']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reminders: z.array(z.number().int().min(0).max(60)).max(8).default(DEFAULT_REMINDERS),
  eventPlanId: z.string().optional(),
})

function serializeDate(row: {
  id: string
  title: string
  kind: string
  date: string
  reminders: string
  eventPlanId: string | null
  createdAt: Date
}) {
  const daysToGo = Math.round(
    (new Date(`${row.date}T00:00:00+05:30`).getTime() - new Date(`${kolkataDay()}T00:00:00+05:30`).getTime()) / 86_400_000,
  )
  const reminders = JSON.parse(row.reminders) as number[]
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    date: row.date,
    reminders,
    eventPlanId: row.eventPlanId ?? undefined,
    daysToGo,
    // True when today lands exactly on a reminder rung — the frontend
    // surfaces these as "coming up" notices on open.
    remindToday: daysToGo >= 0 && reminders.includes(daysToGo),
    createdAt: row.createdAt.getTime(),
  }
}

engagementRouter.get(
  '/dates',
  asyncHandler(async (req, res) => {
    const rows = await prisma.savedDate.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'asc' },
    })
    res.json({ dates: rows.map(serializeDate) })
  }),
)

engagementRouter.post(
  '/dates',
  asyncHandler(async (req, res) => {
    const data = dateSchema.parse(req.body)
    const row = await prisma.savedDate.create({
      data: {
        title: data.title,
        kind: data.kind,
        date: data.date,
        reminders: JSON.stringify(data.reminders),
        eventPlanId: data.eventPlanId ?? null,
        userId: req.userId!,
      },
    })
    res.status(201).json({ date: serializeDate(row) })
  }),
)

engagementRouter.delete(
  '/dates/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.savedDate.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.userId !== req.userId) throw new ApiError(404, 'Date not found.')
    await prisma.savedDate.delete({ where: { id: req.params.id } })
    res.status(204).end()
  }),
)
