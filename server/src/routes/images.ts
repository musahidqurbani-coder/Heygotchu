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
const examplesSchema = z.object({
  query: z.string().trim().min(1).max(160),
  // Simpler backup query (e.g. color + garment without the occasion) used
  // when the primary finds nothing — keyless providers have thinner indexes.
  fallback: z.string().trim().max(160).optional(),
})

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

// Keyless fallback: Openverse (openly licensed images, run by WordPress).
// No API key required; each result links back to the page the image comes
// from, so the click-through-to-source behavior still works.
async function openverseExamples(query: string): Promise<ExampleOut[]> {
  const upstream = await fetch(
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=5&mature=false`,
    { headers: { 'User-Agent': 'Heygotchu/1.0 (family outfit planner)' } },
  )
  if (!upstream.ok) throw new ApiError(502, 'Image search returned an error.')
  const data = (await upstream.json()) as {
    results?: { thumbnail?: string; url?: string; foreign_landing_url?: string; title?: string }[]
  }
  return (data.results ?? []).map((r) => ({
    thumb: r.thumbnail ?? r.url,
    url: r.url,
    pageUrl: r.foreign_landing_url ?? r.url,
    alt: r.title,
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
    const { query, fallback } = examplesSchema.parse(req.query)
    const googleKey = process.env.GOOGLE_CSE_KEY
    const googleCx = process.env.GOOGLE_CSE_ID
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY

    // Providers cascade fail-soft: a misconfigured or rate-limited provider
    // logs its reason and the next one takes over, ending at the keyless
    // Openverse fallback so inline examples always work.
    let results: ExampleOut[] | null = null
    if (googleKey && googleCx) {
      try {
        results = await googleImageExamples(query, googleKey, googleCx)
      } catch (err) {
        console.error('[images] Google CSE failed, falling through:', err)
      }
    }
    if (!results?.length && unsplashKey) {
      try {
        results = await unsplashExamples(query, unsplashKey)
      } catch (err) {
        console.error('[images] Unsplash failed, falling through:', err)
      }
    }
    if (!results?.length) {
      results = await openverseExamples(query)
    }
    if (!results.length && fallback && fallback !== query) {
      // Openverse ANDs every term, so progressively drop leading words
      // ("emerald green kurta" -> "green kurta" -> "kurta") until we get hits.
      let words = fallback.split(/\s+/).filter(Boolean)
      while (!results.length && words.length > 0) {
        results = await openverseExamples(words.join(' '))
        words = words.slice(1)
      }
    }

    res.json({ examples: results.filter((r) => Boolean(r.thumb)).slice(0, 5) })
  }),
)
