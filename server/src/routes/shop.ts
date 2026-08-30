import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { asyncHandler, ApiError } from '../middleware/errorHandler'
import { searchFashionProducts, type AmazonProduct } from '../lib/amazonCreatorsApi'

export const shopRouter = Router()
shopRouter.use(requireAuth)

// Short-lived in-memory cache: many users searching the same
// color+occasion combo (e.g. "terracotta women Diwali outfit top") shouldn't
// each trigger a fresh Amazon call, and it keeps us comfortably under
// Amazon's rate limits.
const CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map<string, { items: AmazonProduct[]; expiresAt: number }>()

const querySchema = z.object({
  query: z.string().trim().min(1).max(200),
})

shopRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { query } = querySchema.parse(req.query)
    const key = query.toLowerCase()

    const hit = cache.get(key)
    if (hit && hit.expiresAt > Date.now()) {
      return res.json({ items: hit.items })
    }

    let items: AmazonProduct[]
    try {
      items = await searchFashionProducts(query, 5)
    } catch (err) {
      console.error('[shop] Amazon search failed:', err)
      throw new ApiError(502, 'Could not load shopping results right now.')
    }

    cache.set(key, { items, expiresAt: Date.now() + CACHE_TTL_MS })
    res.json({ items })
  }),
)
