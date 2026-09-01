import { useEffect, useState } from 'react'
import { imagesApi, type ExampleImage } from '../lib/apiClient'

const AMAZON_PARTNER_TAG = 'mujahidisla04-21'

interface AmazonImageBlockProps {
  label: string
  query: string // color + garment + occasion, e.g. "Warm Teal women top Diwali"
  fallbackQuery?: string
}

// Appends the affiliate tag to a real Amazon.in product/page URL from search
// results so a click on any of the 5 thumbnails still earns commission, not
// just the "Shop on Amazon" link.
function taggedAmazonUrl(pageUrl: string | undefined, searchFallback: string): string {
  if (!pageUrl || !/amazon\.[a-z.]+\//.test(pageUrl)) return searchFallback
  return pageUrl + (pageUrl.includes('?') ? '&' : '?') + `tag=${AMAZON_PARTNER_TAG}`
}

// One category's row of up to 5 real Amazon.in product photos, sourced from
// the /images/examples endpoint (Google Custom Search JSON API restricted to
// amazon.in, falling back to Unsplash/Openverse if that's not configured).
// Every thumbnail links to the real product page it came from (tagged), or
// the tagged category search if that URL isn't an Amazon page.
export default function AmazonImageBlock({ label, query, fallbackQuery }: AmazonImageBlockProps) {
  const [images, setImages] = useState<ExampleImage[] | null>(null)

  const amazonSearchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}&i=fashion&tag=${AMAZON_PARTNER_TAG}`

  useEffect(() => {
    let cancelled = false
    imagesApi
      .examples(query, fallbackQuery)
      .then((examples) => {
        if (!cancelled) setImages(examples)
      })
      .catch(() => {
        if (!cancelled) setImages([])
      })
    return () => {
      cancelled = true
    }
  }, [query, fallbackQuery])

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">{label}</p>
        <a href={amazonSearchUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-tangerine hover:underline">
          Shop on Amazon →
        </a>
      </div>
      {images === null ? (
        <p className="text-xs text-ink/40">Finding ideas…</p>
      ) : images.length === 0 ? (
        <a
          href={amazonSearchUrl}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl bg-cloud px-3.5 py-6 text-center text-sm font-medium text-tangerine hover:underline"
        >
          🛍️ See {label.toLowerCase()} ideas on Amazon →
        </a>
      ) : (
        <div className="grid grid-cols-5 gap-1.5">
          {images.map((img, i) => (
            <a
              key={img.thumb + i}
              href={taggedAmazonUrl(img.pageUrl, amazonSearchUrl)}
              target="_blank"
              rel="noreferrer"
              className="block aspect-square overflow-hidden rounded-lg bg-cloud ring-1 ring-black/5 transition hover:opacity-85"
            >
              {/* Prefer the full-size image (Amazon's media host is far more
                  reliable to hotlink than Google's thumbnail cache); fall
                  back to the thumbnail, then hide a doubly-broken tile. */}
              <img
                src={img.url ?? img.thumb}
                alt={img.alt ?? label}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const el = e.currentTarget
                  if (img.thumb && el.src !== img.thumb) el.src = img.thumb
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
