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

// Clothing-inspiration examples for the occasion planner: up to 5 photos
// matching a query like "emerald green kurta women top". Providers, in
// preference order:
//   1. Google Programmable Search (GOOGLE_CSE_KEY + GOOGLE_CSE_ID) — real
//      Google Images results; each thumb links back to the page the image
//      appears on (contextLink).
//   2. Unsplash (UNSPLASH_ACCESS_KEY) — stock photos.
// With neither configured this 404s and the frontend falls back to an
// external Google Images search link.
const examplesSchema = z.object({ query: z.string().trim().min(1).max(160) })

interface ExampleOut {
  thumb: string | undefined
  url?: string
  pageUrl?: string
  alt?: string
}

async function googleImageExamples(query: string, key: string, cx: string): Promise<ExampleOut[]> {
  const upstream = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&searchType=image&num=5&safe=active&q=${encodeURIComponent(query)}`,
  )
  if (!upstream.ok) throw new ApiError(502, 'Google image search returned an error.')
  const data = (await upstream.json()) as {
    items?: { link?: string; title?: string; image?: { thumbnailLink?: string; contextLink?: string } }[]
  }
  return (data.items ?? []).map((item) => ({
    thumb: item.image?.thumbnailLink ?? item.link,
    url: item.link,
    pageUrl: item.image?.contextLink ?? item.link,
    alt: item.title,
  }))
}

async function unsplashExamples(query: string, accessKey: string): Promise<ExampleOut[]> {
  const upstream = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=portrait`,
    { headers: { Authorization: `Client-ID ${accessKey}` } },
  )
  if (!upstream.ok) throw new ApiError(502, 'Unsplash returned an error.')
  const data = (await upstream.json()) as {
    results?: { urls?: { small?: string; regular?: string }; links?: { html?: string }; alt_description?: string | null }[]
  }
  return (data.results ?? []).map((r) => ({
    thumb: r.urls?.small ?? r.urls?.regular,
    url: r.urls?.regular ?? r.urls?.small,
    pageUrl: r.links?.html,
    alt: r.alt_description ?? undefined,
  }))
}

imagesRouter.get(
  '/examples',
  asyncHandler(async (req, res) => {
    const { query } = examplesSchema.parse(req.query)
    const googleKey = process.env.GOOGLE_CSE_KEY
    const googleCx = process.env.GOOGLE_CSE_ID
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY

    let results: ExampleOut[]
    if (googleKey && googleCx) {
      results = await googleImageExamples(query, googleKey, googleCx)
    } else if (unsplashKey) {
      results = await unsplashExamples(query, unsplashKey)
    } else {
      throw new ApiError(404, 'Image search is not configured on this server.')
    }

    res.json({ examples: results.filter((r) => Boolean(r.thumb)).slice(0, 5) })
  }),
)
