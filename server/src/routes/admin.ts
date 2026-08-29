import { Router, type NextFunction, type Request, type Response } from 'express'
import { prisma } from '../db'
import { asyncHandler, ApiError } from '../middleware/errorHandler'
import { requireAuth } from '../middleware/auth'

// Family-admin routes. Everything here is double-gated: requireAuth resolves
// the caller's userId from their JWT, then requireAdmin checks the *current*
// role in the database (not a token claim), so demoting an admin takes
// effect immediately without waiting for their token to expire.
export const adminRouter = Router()

async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const caller = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!caller || caller.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required.'))
  }
  next()
}

adminRouter.use(requireAuth, requireAdmin)

adminRouter.get(
  '/users',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        verified: true,
        role: true,
        createdAt: true,
        preferences: { select: { updatedAt: true } },
        _count: { select: { closetItems: true, eventPlans: true } },
      },
    })
    res.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        verified: u.verified,
        role: u.role,
        createdAt: u.createdAt,
        closetCount: u._count.closetItems,
        planCount: u._count.eventPlans,
        hasPreferences: Boolean(u.preferences),
      })),
    })
  }),
)

adminRouter.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        verified: true,
        role: true,
        createdAt: true,
        closetItems: true,
        preferences: { select: { data: true, updatedAt: true } },
        eventPlans: { select: { id: true, mode: true, title: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!user) throw new ApiError(404, 'User not found.')

    res.json({
      user: {
        id: user.id,
        email: user.email,
        verified: user.verified,
        role: user.role,
        createdAt: user.createdAt,
        closet: user.closetItems.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          color: item.color,
          photo: item.photo ?? undefined,
          source: item.source,
          createdAt: item.createdAt,
        })),
        preferences: user.preferences ? JSON.parse(user.preferences.data) : null,
        plans: user.eventPlans,
      },
    })
  }),
)

adminRouter.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    if (req.params.id === req.userId) {
      throw new ApiError(400, 'You cannot delete your own admin account.')
    }
    const target = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!target) throw new ApiError(404, 'User not found.')
    if (target.role === 'admin') {
      throw new ApiError(400, 'Another admin account cannot be deleted from the panel.')
    }
    // onDelete: Cascade wipes their closet, preferences, plans, and OTP codes.
    await prisma.user.delete({ where: { id: target.id } })
    res.json({ deleted: true })
  }),
)
