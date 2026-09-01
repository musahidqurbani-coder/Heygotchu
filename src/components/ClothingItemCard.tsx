import { useState } from 'react'
import type { ClothingItem, ClothingPreferences } from '../types'
import { meetsHardCoverageRules } from '../lib/outfitGenerator'
import PhotoLightbox from './PhotoLightbox'

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
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

export default function ClothingItemCard({
  item,
  preferences,
  onDelete,
  selectMode,
  selected,
  onToggleSelect,
}: ClothingItemCardProps) {
  const recommended = meetsHardCoverageRules(item, preferences)
  const [showPhoto, setShowPhoto] = useState(false)

  // In selection mode the whole card is one big toggle target.
  if (selectMode) {
    return (
      <button
        type="button"
        onClick={() => onToggleSelect?.(item.id)}
        aria-pressed={selected}
        aria-label={`${selected ? 'Deselect' : 'Select'} ${item.name}`}
        className={`relative aspect-square overflow-hidden rounded-2xl bg-cloud text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-coral ${
          selected ? 'ring-2 ring-coral' : 'ring-1 ring-black/5 opacity-80'
        }`}
      >
        <span
          className={`absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full text-xs font-bold shadow ${
            selected ? 'bg-coral text-white' : 'bg-white/90 text-ink/30 ring-1 ring-black/15'
          }`}
          aria-hidden="true"
        >
          {selected ? '✓' : ''}
        </span>
        {item.photo ? (
          <img src={item.photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-4xl" aria-hidden="true">
            {CATEGORY_ICON[item.category]}
          </span>
        )}
        <span className="absolute bottom-2.5 left-2.5 max-w-[calc(100%-1.25rem)] truncate rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm">
          {item.name}
        </span>
      </button>
    )
  }

  return (
    <div className="group relative aspect-square overflow-hidden rounded-2xl bg-cloud shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-md">
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
          title="Outside your saved preferences — turn Preference mode off to include it"
        >
          Outside your preferences
        </span>
      )}

      {item.photo ? (
        <button
          type="button"
          onClick={() => setShowPhoto(true)}
          aria-label={`View ${item.name} photo full size`}
          className="h-full w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          <img src={item.photo} alt={item.name} className="h-full w-full object-cover" />
        </button>
      ) : (
        <span className="grid h-full w-full place-items-center text-4xl" aria-hidden="true">
          {CATEGORY_ICON[item.category]}
        </span>
      )}

      {showPhoto && item.photo && <PhotoLightbox src={item.photo} alt={item.name} onClose={() => setShowPhoto(false)} />}

      <span className="absolute bottom-2.5 left-2.5 flex max-w-[calc(100%-1.25rem)] items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 shadow-sm">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: item.color }}
          aria-hidden="true"
        />
        <span className="truncate text-xs font-semibold text-ink">{item.name}</span>
      </span>
    </div>
  )
}
