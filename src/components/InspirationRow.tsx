import type { ClothingPreferences } from '../types'

// Builds an image-search query from the user's saved preferences — palette
// color, modesty, style — and falls back to just gender + context when no
// preferences are set. Used for both occasion and trip inspiration.
export function buildInspirationQuery(
  preferences: ClothingPreferences,
  context: string, // occasion label or destination
  garment: 'top' | 'bottom' | 'accessory',
): { query: string; fallback: string } {
  const color = preferences.colorAnalysis?.bestColors?.[0]?.name ?? ''
  const modest = preferences.modestyStyle === 'hijabi' ? 'modest' : ''
  const style = preferences.stylePreferences[0] ? preferences.stylePreferences[0].split(' ')[0].toLowerCase() : ''
  const gender = preferences.wardrobeFocus === 'unisex' ? '' : preferences.wardrobeFocus
  const garmentWords =
    garment === 'top' ? 'outfit top' : garment === 'bottom' ? 'outfit bottom trousers skirt' : 'jewellery accessories'
  const query = [color, modest, style, gender, context, garmentWords].filter(Boolean).join(' ')
  const fallbackWord = garment === 'top' ? 'kurta' : garment === 'bottom' ? 'trousers' : 'jewellery'
  const fallback = [color, gender, fallbackWord].filter(Boolean).join(' ')
  return { query, fallback }
}

interface InspirationRowProps {
  label: string
  query: string
  fallbackQuery?: string
}

// The Amazon Associates tag — safe to expose client-side, this is exactly
// how affiliate tags always work (they ride along in the URL). Using a
// direct tagged search link needs no API approval, unlike the Creators API
// (pending Amazon eligibility review) — swap in live product-card results
// here once that clears.
const AMAZON_PARTNER_TAG = 'mujahidisla04-21'

// Clean quick-search links: one tap opens the exact preference-driven query
// on Pinterest, Google Images, or Amazon Fashion (tagged for commission).
// (In-app thumbnails only ever come from the embedded Google widget — no
// low-quality stock fallbacks here.)
export default function InspirationRow({ label, query }: InspirationRowProps) {
  const googleUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`
  const pinterestUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`
  const amazonUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}&i=fashion&tag=${AMAZON_PARTNER_TAG}`

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">{label}</p>
      <a href={amazonUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-tangerine hover:underline">
        🛍️ Shop on Amazon →
      </a>
      <a href={pinterestUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-coral hover:underline">
        📌 Pinterest →
      </a>
      <a href={googleUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-sky hover:underline">
        Google Images →
      </a>
    </div>
  )
}
