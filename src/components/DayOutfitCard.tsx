import { useState } from 'react'
import type { ClothingItem, DayOutfit } from '../types'
import { WEATHER_ICON } from '../lib/weatherApi'
import { formatDateLabel } from '../lib/dateUtils'
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

function ItemChip({ item, onPhotoClick }: { item: ClothingItem; onPhotoClick: (item: ClothingItem) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-cloud px-2.5 py-2">
      {item.photo ? (
        <button
          type="button"
          onClick={() => onPhotoClick(item)}
          aria-label={`View ${item.name} full size`}
          className="shrink-0 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          <img src={item.photo} alt={item.name} className="h-12 w-12 rounded-lg object-cover ring-1 ring-black/10" />
        </button>
      ) : (
        <>
          <span
            className="h-6 w-6 shrink-0 rounded-full ring-1 ring-black/10"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="text-base leading-none" aria-hidden="true">
            {CATEGORY_ICON[item.category]}
          </span>
        </>
      )}
      <span className="text-sm text-ink/80">{item.name}</span>
    </div>
  )
}

interface DayOutfitCardProps {
  outfit: DayOutfit
}

export default function DayOutfitCard({ outfit }: DayOutfitCardProps) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  return (
    <div className="animate-pop-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:shadow-md sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-coral">Day {outfit.dayIndex + 1}</p>
          <h4 className="font-display text-lg font-semibold">{formatDateLabel(outfit.date)}</h4>
        </div>
        {outfit.weather && (
          <div className="flex items-center gap-2 rounded-full bg-cloud px-3 py-1.5 text-sm">
            <span aria-hidden="true">{WEATHER_ICON[outfit.weather.condition]}</span>
            <span className="font-medium text-ink/70">
              {outfit.weather.tempMaxC}° / {outfit.weather.tempMinC}°C
            </span>
            {outfit.weather.precipitationChance > 35 && (
              <span className="text-ink/50">· {outfit.weather.precipitationChance}% rain</span>
            )}
          </div>
        )}
      </div>

      {outfit.vibe && (
        <span className="mt-3 inline-block rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium text-ink/60">
          {outfit.vibe} day
        </span>
      )}

      {outfit.items.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {outfit.items.map((item) => (
            <ItemChip
              key={item.id}
              item={item}
              onPhotoClick={(i) => i.photo && setLightbox({ src: i.photo, alt: i.name })}
            />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink/50">No items available — add clothes to your closet.</p>
      )}

      {outfit.notes.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-ink/45">
          {outfit.notes.map((n) => (
            <li key={n}>· {n}</li>
          ))}
        </ul>
      )}

      {lightbox && <PhotoLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  )
}
