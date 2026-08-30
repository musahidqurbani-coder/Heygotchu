import { useEffect, useRef, useState } from 'react'
import { loadCse, runExclusive } from '../lib/googleCse'

const AMAZON_PARTNER_TAG = 'mujahidisla04-21'

interface AmazonImageBlockProps {
  label: string
  query: string // color + garment + occasion, e.g. "Warm Teal women top Diwali"
}

let blockCounter = 0

// One category's row of up to 5 real product images sourced from Amazon.in
// via the embedded Google Search widget (Google's own index — no scraping,
// no API key). Every image and the header link both point to a tagged
// Amazon search so a click always carries the affiliate tag; this is a
// stand-in for live Creators API product cards until Amazon approves API
// access for this account. The render+execute sequence runs through the
// shared runExclusive queue since Google's widget silently fails when
// multiple instances initialize at once, anywhere on the page.
export default function AmazonImageBlock({ label, query }: AmazonImageBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gnameRef = useRef(`heygotchu-amz-${++blockCounter}`)
  const [mode, setMode] = useState<'loading' | 'ready' | 'fallback'>('loading')

  const amazonSearchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}&i=fashion&tag=${AMAZON_PARTNER_TAG}`

  useEffect(() => {
    let cancelled = false
    runExclusive(() =>
      loadCse().then(async () => {
        if (cancelled || !containerRef.current || !window.google?.search?.cse) throw new Error('cse unavailable')
        window.google.search.cse.element.render(
          { div: containerRef.current, tag: 'searchresults-only', gname: gnameRef.current },
          {
            enableImageSearch: true,
            defaultToImageSearch: true,
            imageSearchLayout: 'column',
            imageSearchResultSetSize: 5,
          },
        )
        for (let i = 0; i < 25; i++) {
          const el = window.google.search.cse.element.getElement(gnameRef.current)
          if (el) {
            el.execute(`${query} site:amazon.in`)
            if (!cancelled) setMode('ready')
            return
          }
          await new Promise((r) => setTimeout(r, 200))
        }
        throw new Error('cse element never registered')
      }),
    ).catch(() => {
      if (!cancelled) setMode('fallback')
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">{label}</p>
        <a href={amazonSearchUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-tangerine hover:underline">
          Shop on Amazon →
        </a>
      </div>
      {mode === 'fallback' ? (
        <a
          href={amazonSearchUrl}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl bg-cloud px-3.5 py-6 text-center text-sm font-medium text-tangerine hover:underline"
        >
          🛍️ See {label.toLowerCase()} ideas on Amazon →
        </a>
      ) : (
        <>
          {mode === 'loading' && <p className="text-xs text-ink/40">Finding ideas…</p>}
          <div ref={containerRef} className="overflow-hidden rounded-xl [&_.gsc-control-cse]:!p-0 [&_.gsc-control-cse]:!border-0" />
        </>
      )}
    </div>
  )
}
