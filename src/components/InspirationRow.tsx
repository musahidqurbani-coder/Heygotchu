import { useEffect, useState } from 'react'
import { imagesApi, type ExampleImage } from '../lib/apiClient'
import type { ClothingPreferences } from '../types'

// Builds an image-search query from the user's saved preferences — palette
// color, modesty, style — and falls back to just gender + context when no
// preferences are set. Used for both occasion and trip inspiration.
export function buildInspirationQuery(
  preferences: ClothingPreferences,
  context: string, // occasion label or destination
  garment: 'top' | 'bottom',
): { query: string; fallback: string } {
  const color = preferences.colorAnalysis?.bestColors?.[0]?.name ?? ''
  const modest = preferences.modestyStyle === 'hijabi' ? 'modest' : ''
  const style = preferences.stylePreferences[0] ? preferences.stylePreferences[0].split(' ')[0].toLowerCase() : ''
  const gender = preferences.wardrobeFocus === 'unisex' ? '' : preferences.wardrobeFocus
  const garmentWords = garment === 'top' ? 'outfit top' : 'outfit bottom trousers skirt'
  const query = [color, modest, style, gender, context, garmentWords].filter(Boolean).join(' ')
  const fallback = [color, gender, garment === 'top' ? 'kurta' : 'trousers'].filter(Boolean).join(' ')
  return { query, fallback }
}

interface InspirationRowProps {
  label: string
  query: string
  fallbackQuery?: string
}

// Up to 5 example photos for a query, each clicking through to the page the
// image appears on. Pinterest and Google Images quick-search links always
// accompany the row (and carry it entirely if no image provider responds).
export default function InspirationRow({ label, query, fallbackQuery }: InspirationRowProps) {
  const [images, setImages] = useState<ExampleImage[] | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let cancelled = false
    setImages(null)
    setUnavailable(false)
    imagesApi
      .examples(query, fallbackQuery)
      .then((ex) => { if (!cancelled) setImages(ex) })
      .catch(() => { if (!cancelled) setUnavailable(true) })
    return () => { cancelled = true }
  }, [query, fallbackQuery])

  const googleUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`
  const pinterestUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-ink/40">{label}</p>
      {!unavailable && images === null ? (
        <p className="text-xs text-ink/40">Finding examples…</p>
      ) : !unavailable && images && images.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <a key={i} href={img.pageUrl ?? img.url} target="_blank" rel="noreferrer" className="shrink-0" title={img.alt}>
              <img
                src={img.thumb}
                alt={img.alt ?? label}
                onError={(e) => {
                  // Some sources block hotlinking — hide the broken tile
                  // rather than showing alt text in a frame.
                  ;(e.currentTarget.parentElement as HTMLElement).style.display = 'none'
                }}
                className="h-28 w-20 rounded-xl object-cover ring-1 ring-black/10 transition hover:ring-coral"
              />
            </a>
          ))}
        </div>
      ) : null}
      <p className="mt-1.5 flex gap-4 text-xs">
        <a href={pinterestUrl} target="_blank" rel="noreferrer" className="font-semibold text-coral hover:underline">
          📌 More on Pinterest →
        </a>
        <a href={googleUrl} target="_blank" rel="noreferrer" className="font-semibold text-sky hover:underline">
          More on Google Images →
        </a>
      </p>
    </div>
  )
}
