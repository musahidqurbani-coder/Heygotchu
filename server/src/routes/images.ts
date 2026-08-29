import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler, ApiError } from '../middleware/errorHandler'

// Public (no auth) — same-origin proxy for Unsplash image search, migrated
// from the old /api/unsplash.js Vercel-style function. Keeps
// UNSPLASH_ACCESS_KEY server-side only. Not configuring a key isn't an
// error: the frontend's imageApi.ts already falls back to curated/stock
// photos when this returns 404.
export const imagesRouter = Router()

const querySchema = z.object({ query: z.string().trim().min(1) })

imagesRouter.get(
  '/destination',
  asyncHandler(async (req, res) => {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY
    if (!accessKey) throw new ApiError(404, 'Image search is not configured on this server.')

    const { query } = querySchema.parse(req.query)
    const upstream = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${accessKey}` } },
    )
    if (!upstream.ok) throw new ApiError(502, 'Unsplash returned an error.')

    const data = (await upstream.json()) as { results?: { urls?: { regular?: string } }[] }
    const url = data.results?.[0]?.urls?.regular
    if (!url) throw new ApiError(404, 'No matching photo found.')

    res.json({ url })
  }),
)
