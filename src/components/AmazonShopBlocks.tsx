import AmazonImageBlock from './AmazonImageBlock'
import { buildInspirationQuery } from './InspirationRow'
import type { ClothingPreferences } from '../types'

interface AmazonShopBlocksProps {
  preferences: ClothingPreferences
  context: string // occasion label or destination
}

// Three category blocks — Top, Bottom, Accessories — each 5 real Amazon
// product images built from the same color palette, right after the "Your
// colors" section per the requested placement. Each block's Google CSE
// widget serializes itself through the shared runExclusive queue (see
// AmazonImageBlock), so mounting all three together here is safe.
export default function AmazonShopBlocks({ preferences, context }: AmazonShopBlocksProps) {
  const top = buildInspirationQuery(preferences, context, 'top')
  const bottom = buildInspirationQuery(preferences, context, 'bottom')
  const accessory = buildInspirationQuery(preferences, context, 'accessory')

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h3 className="font-display text-lg font-semibold">Shop the palette 🛍️</h3>
      <div className="mt-3 space-y-4">
        <AmazonImageBlock label="Top" query={top.query} />
        <AmazonImageBlock label="Bottom" query={bottom.query} />
        <AmazonImageBlock label="Accessories" query={accessory.query} />
      </div>
    </div>
  )
}
