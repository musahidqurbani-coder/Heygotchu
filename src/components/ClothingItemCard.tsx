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
        className={`relative flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-coral ${
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
        <span className="flex h-28 w-full items-center justify-center bg-cloud">
          {item.photo ? (
            <img src={item.photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl" aria-hidden="true">
              {CATEGORY_ICON[item.category]}
            </span>
          )}
        </span>
        <span className="block p-3">
          <span className="block truncate text-sm font-semibold text-ink">{item.name}</span>
          <span className="mt-0.5 block text-xs capitalize text-ink/45">
            {item.category} · {item.warmth}
          </span>
        </span>
      </button>
    )
  }

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
          <button
            type="button"
            onClick={() => setShowPhoto(true)}
            aria-label={`View ${item.name} photo full size`}
            className="h-full w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
          >
            <img src={item.photo} alt={item.name} className="h-full w-full object-cover" />
          </button>
        ) : (
          <span className="text-4xl" aria-hidden="true">
            {CATEGORY_ICON[item.category]}
          </span>
        )}
      </div>

      {showPhoto && item.photo && <PhotoLightbox src={item.photo} alt={item.name} onClose={() => setShowPhoto(false)} />}

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
