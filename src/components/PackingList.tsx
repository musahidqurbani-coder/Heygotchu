import { useMemo, useState } from 'react'
import type { PackingListEntry } from '../types'
import PhotoLightbox from './PhotoLightbox'

const CATEGORY_LABEL: Record<string, string> = {
  top: 'Tops',
  bottom: 'Bottoms',
  dress: 'Dresses',
  outerwear: 'Outerwear',
  footwear: 'Footwear',
  swimwear: 'Swimwear',
  accessory: 'Accessories',
}

interface PackingListProps {
  entries: PackingListEntry[]
  gaps: string[]
}

export default function PackingList({ entries, gaps }: PackingListProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  const grouped = useMemo(() => {
    const groups: Record<string, PackingListEntry[]> = {}
    entries.forEach((e) => {
      const key = e.item.category
      groups[key] = groups[key] ? [...groups[key], e] : [e]
    })
    return groups
  }, [entries])

  if (entries.length === 0) {
    return <p className="text-sm text-ink/50">Add clothes to your closet to see a packing list here.</p>
  }

  const packedCount = Object.values(checked).filter(Boolean).length

  return (
    <div>
      <p className="mb-4 text-sm text-ink/50">
        {packedCount} / {entries.length} packed
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
              {CATEGORY_LABEL[category] ?? category}
            </h4>
            <ul className="space-y-1.5">
              {items.map(({ item, wearCount }) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition hover:bg-black/5">
                    <input
                      type="checkbox"
                      checked={!!checked[item.id]}
                      onChange={() => setChecked((c) => ({ ...c, [item.id]: !c[item.id] }))}
                      className="h-4 w-4 shrink-0 rounded border-black/20 text-coral focus:ring-coral"
                    />
                    {item.photo ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          setLightbox({ src: item.photo!, alt: item.name })
                        }}
                        aria-label={`View ${item.name} full size`}
                        className="shrink-0 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                      >
                        <img src={item.photo} alt="" className="h-8 w-8 rounded-lg object-cover ring-1 ring-black/10" />
                      </button>
                    ) : (
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                    )}
                    <span className={checked[item.id] ? 'text-ink/40 line-through' : 'text-ink/80'}>
                      {item.name}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-ink/35">
                      worn {wearCount}×
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {gaps.length > 0 && (
        <div className="mt-6 rounded-2xl bg-sun/20 p-4">
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/60">
            Worth packing
          </h4>
          <ul className="space-y-1 text-sm text-ink/70">
            {gaps.map((g) => (
              <li key={g} className="flex gap-2">
                <span aria-hidden="true">💡</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lightbox && <PhotoLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  )
}
