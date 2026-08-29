import type { ClothingItem, ClothingPreferences } from '../types'
import { meetsHardCoverageRules } from '../lib/outfitGenerator'

const CATEGORY_ICON: Record<ClothingItem['category'], string> = {
  top: '👕',
  bottom: '👖',
  dress: '👗',
  outerwear: '🧥',
  footwear: '👟',
  swimwear: '🩱',
  accessory: '🧢',
}

interface ClothingItemCardProps {
  item: ClothingItem
  preferences?: ClothingPreferences
  onDelete: (id: string) => void
}

export default function ClothingItemCard({ item, preferences, onDelete }: ClothingItemCardProps) {
  const recommended = meetsHardCoverageRules(item, preferences)

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-md">
      <button
        onClick={() => onDelete(item.id)}
        aria-label={`Remove ${item.name}`}
        className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-ink/60 shadow transition hover:bg-coral hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-coral md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
      >
        ✕
      </button>

      {!recommended && (
        <span
          className="absolute left-2 top-2 z-10 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-semibold text-white"
          title="Excluded from outfit generation by your clothing preferences"
        >
          Not recommended
        </span>
      )}

      <div className="flex h-28 items-center justify-center bg-cloud">
        {item.photo ? (
          <img src={item.photo} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl" aria-hidden="true">
            {CATEGORY_ICON[item.category]}
          </span>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
        </div>
        <p className="mt-0.5 text-xs capitalize text-ink/45">
          {item.category} · {item.warmth}
        </p>
      </div>
    </div>
  )
}
