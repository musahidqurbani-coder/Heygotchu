import { useEffect, useRef, useState } from 'react'
import InspirationRow from './InspirationRow'
import { loadCse, runExclusive } from '../lib/googleCse'

// Amazon Associates tag — safe to expose client-side, affiliate tags always
// ride along in the URL. A direct tagged search link needs no API approval,
// unlike the Creators API (pending Amazon eligibility review) — swap in
// live product-card results here once that clears.
const AMAZON_PARTNER_TAG = 'mujahidisla04-21'

export interface InspirationTab {
  label: string
  query: string
  fallback: string
}

interface InspirationSectionProps {
  tabs: InspirationTab[]
}

let gnameCounter = 0

// Real Google image results, embedded: one search element with tabs (Tops /
// Bottoms) that re-run the preference-driven query. If the Google widget
// can't load (offline, blocked), the keyless image rows take over.
export default function InspirationSection({ tabs }: InspirationSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gnameRef = useRef(`heygotchu-insp-${++gnameCounter}`)
  const [active, setActive] = useState(0)
  const [mode, setMode] = useState<'loading' | 'google' | 'fallback'>('loading')

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
            imageSearchResultSetSize: 8,
          },
        )
        // The element registers asynchronously — poll briefly for it, then
        // run the first query. If it never appears (blocked, engine broken),
        // hand over to the keyless fallback rows instead of an empty box.
        for (let i = 0; i < 25; i++) {
          const el = window.google.search.cse.element.getElement(gnameRef.current)
          if (el) {
            el.execute(tabs[0].query)
            if (!cancelled) setMode('google')
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
  }, [])

  function selectTab(index: number) {
    setActive(index)
    window.google?.search?.cse?.element.getElement(gnameRef.current)?.execute(tabs[index].query)
  }

  if (mode === 'fallback') {
    return (
      <>
        {tabs.map((tab) => (
          <InspirationRow key={tab.label} label={tab.label} query={tab.query} fallbackQuery={tab.fallback} />
        ))}
      </>
    )
  }

  const pinterestUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(tabs[active].query)}`
  const amazonUrl = `https://www.amazon.in/s?k=${encodeURIComponent(tabs[active].query)}&i=fashion&tag=${AMAZON_PARTNER_TAG}`

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => selectTab(i)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              i === active ? 'bg-ink text-white' : 'bg-cloud text-ink/60 ring-1 ring-black/10 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <a
          href={amazonUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-xs font-semibold text-tangerine hover:underline"
        >
          🛍️ Shop on Amazon →
        </a>
        <a
          href={pinterestUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-coral hover:underline"
        >
          📌 Pinterest →
        </a>
      </div>
      {mode === 'loading' && <p className="text-xs text-ink/40">Loading Google results…</p>}
      {/* Google renders its results into this container. */}
      <div ref={containerRef} className="overflow-hidden rounded-2xl [&_.gsc-control-cse]:!p-0 [&_.gsc-control-cse]:!border-0" />
    </div>
  )
}
