import AmazonImageBlock from './AmazonImageBlock'
import { buildInspirationQuery } from './InspirationRow'
import type { ClothingItem, ClothingPreferences } from '../types'

interface AmazonShopBlocksProps {
  preferences: ClothingPreferences
  context: string // occasion label or destination
  // When provided, each section checks the closet and leads with an honest
  // "you don't have this for <occasion>" callout when the category is empty.
  closet?: ClothingItem[]
}

// The shopping section: Top / Bottom / Accessories (plus Shoes when the
// closet has none), each a row of 5 real Amazon.in product photos. Palette
// colors rotate across the sections — with a 4-color palette the top,
// bottom, and accessories each search a different color instead of all
// hammering the first one.
export default function AmazonShopBlocks({ preferences, context, closet }: AmazonShopBlocksProps) {
  const palette = preferences.colorAnalysis?.bestColors ?? []
  const colorAt = (i: number) => (palette.length > 0 ? palette[i % palette.length].name : undefined)

  const hasTop = !closet || closet.some((c) => c.category === 'top' || c.category === 'dress')
  const hasBottom = !closet || closet.some((c) => c.category === 'bottom' || c.category === 'dress')
  const hasAccessory = !closet || closet.some((c) => c.category === 'accessory')
  const hasShoes = !closet || closet.some((c) => c.category === 'footwear')

  const sections: { label: string; garment: 'top' | 'bottom' | 'accessory' | 'footwear'; missing: boolean }[] = [
    { label: 'Top', garment: 'top', missing: !hasTop },
    { label: 'Bottom', garment: 'bottom', missing: !hasBottom },
    { label: 'Accessories', garment: 'accessory', missing: !hasAccessory },
  ]
  if (!hasShoes) sections.push({ label: 'Shoes', garment: 'footwear', missing: true })

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h3 className="font-display text-lg font-semibold">Shop the palette 🛍️</h3>
      <div className="mt-3 space-y-5">
        {sections.map((s, i) => {
          const q = buildInspirationQuery(preferences, context, s.garment, colorAt(i))
          return (
            <div key={s.label}>
              {s.missing && (
                <p className="mb-2 rounded-xl bg-sun/20 px-3.5 py-2.5 text-sm text-ink/70">
                  You don't have a <strong>{context}</strong> {s.label.toLowerCase()} in your closet — add one
                  from photos 📸 or shop below:
                </p>
              )}
              <AmazonImageBlock label={s.label} query={q.query} fallbackQuery={q.fallback} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
