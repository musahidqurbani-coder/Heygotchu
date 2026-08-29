import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler, ApiError } from '../middleware/errorHandler'
import { isClaudeConfigured } from '../env'
import { generateTripVibeDescription } from '../lib/claude'

// Public (no auth) — migrated from the old /api/ai-describe.js, now backed
// by Claude instead of OpenAI so ANTHROPIC_API_KEY is the only AI key this
// server needs. Not configuring a key isn't an error: the frontend's
// vibeCopy.ts already falls back to a templated description when this
// returns a non-2xx response.
export const vibeRouter = Router()

const bodySchema = z.object({
  destination: z.string().trim().min(1),
  vibes: z.array(z.string()).default([]),
  days: z
    .array(
      z.object({
        tempMaxC: z.number(),
        tempMinC: z.number(),
        condition: z.string(),
      }),
    )
    .default([]),
})

vibeRouter.post(
  '/describe',
  asyncHandler(async (req, res) => {
    if (!isClaudeConfigured()) throw new ApiError(404, 'AI descriptions are not configured on this server.')
    const { destination, vibes, days } = bodySchema.parse(req.body)
    const description = await generateTripVibeDescription(destination, vibes, days)
    res.json({ description })
  }),
)
