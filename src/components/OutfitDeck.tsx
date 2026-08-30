import { useMemo, useState } from 'react'
import type { ClothingItem, ClothingPreferences, DayOutfit } from '../types'
import { meetsHardCoverageRules } from '../lib/outfitGenerator'
import { formatDateLabel } from '../lib/dateUtils'
import AvatarFigure from './AvatarFigure'
import PhotoLightbox from './PhotoLightbox'

interface OutfitDeckProps {
  days: DayOutfit[]
  closet: ClothingItem[]
  preferences: ClothingPreferences
  onToast: (message: string) => void
}

type DayState = 'open' | 'packed' | 'nah'

// The fit deck: pick a day, see its clothes in a horizontal strip, see them
// worn by your avatar below, then Nah / Remix / Pack it. Remix swaps pieces
// for other closet items of the same category (respecting coverage rules)
// and the avatar changes clothes live.
export default function OutfitDeck({ days, closet, preferences, onToast }: OutfitDeckProps) {
  const [active, setActive] = useState(0)
  const [overrides, setOverrides] = useState<Record<number, ClothingItem[]>>({})
  const [dayState, setDayState] = useState<Record<number, DayState>>({})
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  const avatarLook = preferences.colorAnalysis?.avatar

  const dayItems = useMemo(() => overrides[active] ?? days[active]?.items ?? [], [overrides, active, days])

  const packedCount = Object.values(dayState).filter((s) => s === 'packed').length
  const pct = days.length ? Math.round((packedCount / days.length) * 100) : 0

  function remix() {
    const current = overrides[active] ?? days[active]?.items ?? []
    if (current.length === 0) return
    const usedIds = new Set(current.map((i) => i.id))
    let changed = 0
    const next = current.map((item) => {
      const alternatives = closet.filter(
        (c) =>
          c.category === item.category &&
          !usedIds.has(c.id) &&
          meetsHardCoverageRules(c, preferences),
      )
      if (alternatives.length === 0) return item
      const pick = alternatives[Math.floor(Math.random() * alternatives.length)]
      usedIds.add(pick.id)
      changed += 1
      return pick
    })
    if (changed === 0) {
      onToast('No alternatives left in your closet for this day')
      return
    }
    setOverrides((prev) => ({ ...prev, [active]: next }))
    setDayState((prev) => ({ ...prev, [active]: 'open' }))
    onToast(`Remixed · ${changed} piece${changed === 1 ? '' : 's'} swapped`)
  }

  function mark(state: DayState) {
    setDayState((prev) => ({ ...prev, [active]: state }))
    onToast(state === 'packed' ? `Packed · day ${active + 1} ✓` : `Skipped day ${active + 1}`)
    // Auto-advance to the next unresolved day, like flicking through a deck.
    const nextOpen = days.findIndex((_, i) => i !== active && (dayState[i] ?? 'open') === 'open')
    if (nextOpen >= 0) setActive(nextOpen)
  }

  if (days.length === 0) return null

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
      {/* bag meter */}
      <div className="mb-4 overflow-hidden rounded-2xl ring-1 ring-black/10">
        <div className="h-6 bg-mint/70 transition-all duration-500" style={{ width: `${pct}%` }} />
        <div className="flex justify-between bg-cloud px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink/50">
          <span>{packedCount} of {days.length} fits packed</span>
          <span>{pct}%</span>
        </div>
      </div>

      {/* day chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((d, i) => {
          const s = dayState[i] ?? 'open'
          return (
            <button
              key={d.date}
              onClick={() => setActive(i)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                i === active
                  ? 'bg-ink text-white'
                  : s === 'packed'
                    ? 'bg-mint/25 text-ink/70 ring-1 ring-mint'
                    : s === 'nah'
                      ? 'bg-cloud text-ink/35 line-through ring-1 ring-black/10'
                      : 'bg-cloud text-ink/60 ring-1 ring-black/10 hover:text-ink'
              }`}
            >
              Day {i + 1}{s === 'packed' ? ' ✓' : ''}
            </button>
          )
        })}
      </div>

      <p className="mt-1 text-xs text-ink/45">
        {formatDateLabel(days[active].date)}
        {days[active].vibe ? ` · ${days[active].vibe} day` : ''}
        {days[active].weather ? ` · ${days[active].weather!.tempMaxC}°/${days[active].weather!.tempMinC}°C` : ''}
      </p>

      {/* horizontal clothes strip */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {dayItems.map((item) => (
          <button
            key={item.id}
            onClick={() => item.photo && setLightbox({ src: item.photo, alt: item.name })}
            className={`shrink-0 ${item.photo ? 'cursor-zoom-in' : 'cursor-default'}`}
            title={item.name}
          >
            {item.photo ? (
              <img src={item.photo} alt={item.name} className="h-20 w-20 rounded-2xl object-cover ring-1 ring-black/10" />
            ) : (
              <span
                className="flex h-20 w-20 items-end justify-center rounded-2xl pb-1 text-[10px] font-semibold text-white ring-1 ring-black/10"
                style={{ backgroundColor: item.color }}
              >
                {item.category}
              </span>
            )}
          </button>
        ))}
        {dayItems.length === 0 && <p className="py-6 text-sm text-ink/45">No items for this day — add more clothes to your closet.</p>}
      </div>

      {/* the avatar wearing it */}
      <div className="mt-2 rounded-2xl bg-cloud/60 py-3">
        <AvatarFigure
          look={avatarLook}
          items={dayItems.map((i) => ({ id: i.id, name: i.name, category: i.category, color: i.color, photo: i.photo }))}
          height={400}
        />
        {!avatarLook && (
          <p className="mt-1 text-center text-[11px] text-ink/40">
            Add a selfie in Preferences to make the avatar look like you ✨
          </p>
        )}
      </div>

      {/* actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => mark('nah')}
          className="flex-1 rounded-full bg-white px-4 py-3 text-sm font-bold uppercase tracking-wide text-ink/70 ring-2 ring-ink/80 transition active:translate-y-0.5"
        >
          ✕ Nah
        </button>
        <button
          onClick={remix}
          className="flex-1 rounded-full bg-sun px-4 py-3 text-sm font-bold uppercase tracking-wide text-ink ring-2 ring-ink/80 transition active:translate-y-0.5"
        >
          ↻ Remix
        </button>
        <button
          onClick={() => mark('packed')}
          className="flex-1 rounded-full bg-ink px-4 py-3 text-sm font-bold uppercase tracking-wide text-white ring-2 ring-ink transition active:translate-y-0.5"
        >
          ✓ Pack it
        </button>
      </div>

      {lightbox && <PhotoLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  )
}
