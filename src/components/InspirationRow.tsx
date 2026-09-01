import type { ClothingPreferences } from '../types'

// Builds an image-search query from the user's saved preferences — palette
// color, modesty, style — and falls back to just gender + context when no
// preferences are set. Used for both occasion and trip inspiration.
export function buildInspirationQuery(
  preferences: ClothingPreferences,
  context: string, // occasion label or destination
  garment: 'top' | 'bottom' | 'accessory' | 'footwear' | 'dress',
  // Which palette color to search with — lets Top/Bottom/Accessories each
  // take a different color from the palette instead of all using the first.
  colorName?: string,
): { query: string; fallback: string } {
  const color = colorName ?? preferences.colorAnalysis?.bestColors?.[0]?.name ?? ''
  const modest = preferences.modestyStyle === 'hijabi' ? 'modest' : ''
  const style = preferences.stylePreferences[0] ? preferences.stylePreferences[0].split(' ')[0].toLowerCase() : ''
  const gender = preferences.wardrobeFocus === 'unisex' ? '' : preferences.wardrobeFocus
  const garmentWords =
    garment === 'top'
      ? 'outfit top'
      : garment === 'bottom'
        ? 'outfit bottom trousers skirt'
        : garment === 'footwear'
          ? 'shoes footwear'
          : garment === 'dress'
            ? 'dress ethnic wear'
            : // Accessories differ sharply by gender — "jewellery" for a men's
              // search mostly surfaces necklaces/bracelets, not what a man
              // would actually reach for.
              preferences.wardrobeFocus === 'men'
              ? 'sunglasses belt watch accessories'
              : 'jewellery accessories'
  // Occasion labels can carry UI punctuation ("Haldi / Turmeric ceremony")
  // that hurts search relevance — flatten to plain words.
  const cleanContext = context.replace(/[/·]+/g, ' ').replace(/\s+/g, ' ').trim()
  const query = [color, modest, style, gender, cleanContext, garmentWords].filter(Boolean).join(' ')
  const fallbackWord =
    garment === 'top'
      ? 'kurta'
      : garment === 'bottom'
        ? 'trousers'
        : garment === 'footwear'
          ? 'shoes'
          : garment === 'dress'
            ? 'dress'
            : preferences.wardrobeFocus === 'men'
              ? 'watch'
              : 'jewellery'
  // The fallback keeps the occasion's leading word (Haldi, Diwali, Bali) so
  // simplified retries still return event-relevant products.
  const fallback = [color, gender, cleanContext.split(' ')[0], fallbackWord].filter(Boolean).join(' ')
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

// Clean quick-search link: one tap opens the exact preference-driven query
// on Amazon Fashion (tagged for commission).
export default function InspirationRow({ label, query }: InspirationRowProps) {
  const amazonUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}&i=fashion&tag=${AMAZON_PARTNER_TAG}`

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">{label}</p>
      <a href={amazonUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-tangerine hover:underline">
        🛍️ Shop on Amazon →
      </a>
    </div>
  )
}
