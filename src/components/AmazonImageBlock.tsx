import { useEffect, useState } from 'react'
import { imagesApi, type ExampleImage } from '../lib/apiClient'

const AMAZON_PARTNER_TAG = 'mujahidisla04-21'

interface ColorQuery {
  query: string // color + garment + occasion, e.g. "Warm Teal women top Diwali"
  fallback?: string
}

interface AmazonImageBlockProps {
  label: string
  // One search per tile — each carrying a different palette color — rather
  // than one shared search repeated 5 times, which always came back as 5
  // photos of the same color.
  queries: ColorQuery[]
}

// Appends the affiliate tag to a real Amazon.in product/page URL from search
// results so a click on any of the 5 thumbnails still earns commission, not
// just the "Shop on Amazon" link.
function taggedAmazonUrl(pageUrl: string | undefined, searchFallback: string): string {
  if (!pageUrl || !/amazon\.[a-z.]+\//.test(pageUrl)) return searchFallback
  return pageUrl + (pageUrl.includes('?') ? '&' : '?') + `tag=${AMAZON_PARTNER_TAG}`
}

interface Tile {
  image: ExampleImage | null
  searchUrl: string
}

// One category's row of up to 5 real Amazon.in product photos — one search
// PER TILE, each carrying a different palette color, sourced from the
// /images/examples endpoint (Google Custom Search JSON API restricted to
// amazon.in, falling back to Unsplash/Openverse if that's not configured).
// Every thumbnail links to the real product page it came from (tagged), or
// that tile's own color-specific search if that URL isn't an Amazon page.
export default function AmazonImageBlock({ label, queries }: AmazonImageBlockProps) {
  const [tiles, setTiles] = useState<Tile[] | null>(null)

  const searchUrlFor = (q: string) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}&i=fashion&tag=${AMAZON_PARTNER_TAG}`
  const headerSearchUrl = searchUrlFor(queries[0]?.query ?? label)

  useEffect(() => {
    let cancelled = false
    Promise.all(
      queries.map((q) =>
        imagesApi
          .examples(q.query, q.fallback)
          .then((examples) => ({ image: examples[0] ?? null, searchUrl: searchUrlFor(q.query) }))
          .catch(() => ({ image: null, searchUrl: searchUrlFor(q.query) })),
      ),
    ).then((results) => {
      if (!cancelled) setTiles(results)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.map((q) => `${q.query}|${q.fallback ?? ''}`).join(',')])

  const found = tiles?.filter((t) => t.image) ?? []

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">{label}</p>
        <a href={headerSearchUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-tangerine hover:underline">
          Shop on Amazon →
        </a>
      </div>
      {tiles === null ? (
        <p className="text-xs text-ink/40">Finding ideas…</p>
      ) : found.length === 0 ? (
        <a
          href={headerSearchUrl}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl bg-cloud px-3.5 py-6 text-center text-sm font-medium text-tangerine hover:underline"
        >
          🛍️ See {label.toLowerCase()} ideas on Amazon →
        </a>
      ) : (
        <div className="grid grid-cols-5 gap-1.5">
          {found.map(({ image: img, searchUrl }, i) => (
            <a
              key={(img!.thumb ?? '') + i}
              href={taggedAmazonUrl(img!.pageUrl, searchUrl)}
              target="_blank"
              rel="noreferrer"
              className="block aspect-square overflow-hidden rounded-lg bg-cloud ring-1 ring-black/5 transition hover:opacity-85"
            >
              {/* Prefer the full-size image (Amazon's media host is far more
                  reliable to hotlink than Google's thumbnail cache); fall
                  back to the thumbnail, then hide a doubly-broken tile. */}
              <img
                src={img!.url ?? img!.thumb}
                alt={img!.alt ?? label}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const el = e.currentTarget
                  if (img!.thumb && el.src !== img!.thumb) el.src = img!.thumb
                  else el.style.visibility = 'hidden'
                }}
              />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
