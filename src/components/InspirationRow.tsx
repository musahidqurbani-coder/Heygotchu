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

// Clean quick-search links: one tap opens the exact preference-driven query
// on Pinterest or Google Images. (In-app thumbnails only ever come from the
// embedded Google widget — no low-quality stock fallbacks here.)
export default function InspirationRow({ label, query }: InspirationRowProps) {
  const googleUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`
  const pinterestUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">{label}</p>
      <a href={pinterestUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-coral hover:underline">
        📌 Pinterest →
      </a>
      <a href={googleUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-sky hover:underline">
        Google Images →
      </a>
    </div>
  )
}
