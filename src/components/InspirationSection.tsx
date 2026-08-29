import { useEffect, useRef, useState } from 'react'
import InspirationRow from './InspirationRow'

// The user's Google Programmable Search Engine (created in the Google CSE
// console, image search enabled, searches the entire web). The embedded
// Element is free and needs no API key — it renders real Google image
// results inside the page; clicking a result opens its source.
const CSE_ID = '567c8d7ce251c40c9'

declare global {
  interface Window {
    __gcse?: Record<string, unknown>
    google?: {
      search?: {
        cse?: {
          element: {
            render: (config: { div: HTMLElement | string; tag: string; gname: string }, opts?: Record<string, unknown>) => void
            getElement: (gname: string) => { execute: (query: string) => void } | null
          }
        }
      }
    }
  }
}

let csePromise: Promise<void> | null = null
function loadCse(): Promise<void> {
  if (!csePromise) {
    csePromise = new Promise<void>((resolve, reject) => {
      window.__gcse = {
        parsetags: 'explicit',
        initializationCallback: () => resolve(),
      }
      const s = document.createElement('script')
      s.src = `https://cse.google.com/cse.js?cx=${CSE_ID}`
      s.async = true
      s.onerror = () => reject(new Error('Google search widget failed to load'))
      document.head.appendChild(s)
      // Belt and braces: some blockers let the script load but never init.
      setTimeout(() => reject(new Error('Google search widget timed out')), 12000)
    })
  }
  return csePromise
}

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
    loadCse()
      .then(async () => {
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
        for (let i = 0; i < 20; i++) {
          const el = window.google.search.cse.element.getElement(gnameRef.current)
          if (el) {
            el.execute(tabs[0].query)
            if (!cancelled) setMode('google')
            return
          }
          await new Promise((r) => setTimeout(r, 200))
        }
        throw new Error('cse element never registered')
      })
      .catch(() => {
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
          href={pinterestUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-xs font-semibold text-coral hover:underline"
        >
          📌 On Pinterest →
        </a>
      </div>
      {mode === 'loading' && <p className="text-xs text-ink/40">Loading Google results…</p>}
      {/* Google renders its results into this container. */}
      <div ref={containerRef} className="overflow-hidden rounded-2xl [&_.gsc-control-cse]:!p-0 [&_.gsc-control-cse]:!border-0" />
    </div>
  )
}
