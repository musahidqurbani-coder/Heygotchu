import { useEffect, useMemo, useState } from 'react'
import PhotoLightbox from './PhotoLightbox'
import AmazonShopBlocks from './AmazonShopBlocks'
import type { ClothingItem, ClothingPreferences } from '../types'
import {
  aiApi,
  eventsApi,
  ApiClientError,
  type OccasionType,
  type OutfitsResponse,
} from '../lib/apiClient'

interface OccasionPlannerProps {
  closet: ClothingItem[]
  preferences: ClothingPreferences
  onToast: (message: string) => void
}

const CATEGORY_LABEL: Record<string, string> = {
  celebration: 'Celebrations & weddings',
  formal: 'Formal',
  work: 'Work',
  school: 'School & college',
  travel: 'Travel days',
  'casual-social': 'Casual & social',
}

// The "Occasion" planning mode: pick an occasion (Sangeet, Haldi, Mehndi,
// Eid, interviews, …), optionally a city and date, and get complete
// AI-composed outfits from your own closet — plus what's worth adding.
export default function OccasionPlanner({ closet, preferences, onToast }: OccasionPlannerProps) {
  const [occasionTypes, setOccasionTypes] = useState<OccasionType[]>([])
  const [occasionId, setOccasionId] = useState('')
  const [location, setLocation] = useState('')
  const [dateISO, setDateISO] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OutfitsResponse | null>(null)
  const [saved, setSaved] = useState(false)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  useEffect(() => {
    eventsApi
      .occasionTypes()
      .then(setOccasionTypes)
      .catch(() => onToast('Could not load the occasion list.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grouped = useMemo(() => {
    const groups: Record<string, OccasionType[]> = {}
    for (const o of occasionTypes) (groups[o.category] ??= []).push(o)
    return groups
  }, [occasionTypes])

  const itemById = useMemo(() => new Map(closet.map((i) => [i.id, i])), [closet])

  async function handleGenerate() {
    if (!occasionId) {
      setError('Pick an occasion first.')
      return
    }
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const res = await aiApi.outfits({
        occasionId,
        location: location.trim() || undefined,
        dateISO: dateISO || undefined,
      })
      setResult(res)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSave() {
    if (!result) return
    try {
      await eventsApi.create('occasion', result.occasionLabel, {
        occasionId,
        location: location.trim() || null,
        dateISO: dateISO || null,
        ...result,
      } as unknown as Record<string, unknown>)
      setSaved(true)
      onToast('Occasion plan saved')
    } catch (err) {
      onToast(err instanceof ApiClientError ? err.message : 'Could not save this plan.')
    }
  }

  if (result) {
    return (
      <div className="mx-auto mt-10 max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">
            Outfits for {result.occasionLabel}
            {location.trim() ? ` · ${location.trim()}` : ''}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setResult(null)}
              className="rounded-full px-4 py-2 text-sm font-medium text-ink/60 hover:bg-black/5"
            >
              ← Change occasion
            </button>
            <button
              onClick={handleSave}
              disabled={saved}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {saved ? 'Saved ✓' : 'Save plan'}
            </button>
          </div>
        </div>

        {/* The personal color palette always leads — it's the first
            recommendation, before any outfit or photo examples. */}
        {(preferences.colorAnalysis?.bestColors?.length ?? 0) > 0 && (
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h3 className="font-display text-lg font-semibold">
              Your colors for this occasion 🎨
              {preferences.colorAnalysis?.seasonalType && (
                <span className="ml-2 align-middle text-xs font-sans font-semibold uppercase tracking-widest text-ink/40">
                  {preferences.colorAnalysis.seasonalType}
                </span>
              )}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {preferences.colorAnalysis!.bestColors!.map((c) => (
                <span key={c.hex} className="flex items-center gap-1.5 rounded-full bg-cloud px-2.5 py-1 text-xs font-medium ring-1 ring-black/5">
                  <span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c.hex }} />
                  {c.name}
                </span>
              ))}
            </div>
            {(preferences.colorAnalysis?.avoidColors?.length ?? 0) > 0 && (
              <p className="mt-2.5 text-xs text-ink/50">
                Better skipped: {preferences.colorAnalysis!.avoidColors!.map((c) => c.name).join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Shoppable palette-matched picks, right after the colors section
            and before the AI-composed outfits. */}
        <AmazonShopBlocks preferences={preferences} context={result.occasionLabel} closet={closet} />

        {result.generalAdvice && (
          <p className="rounded-2xl bg-white px-4 py-3 text-sm text-ink/70 shadow-sm ring-1 ring-black/5">
            💡 {result.generalAdvice}
          </p>
        )}

        {result.outfits.length === 0 && (
          <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-ink/50 shadow-sm ring-1 ring-black/5">
            Logic is not logicing 💀 — your closet needs a few more pieces for this one. Add some fits first.
          </p>
        )}

        {result.outfits.map((outfit, idx) => {
          // Prefer the server-resolved item snapshots; fall back to matching
          // ids against the locally loaded closet for older saved results.
          const items =
            outfit.items && outfit.items.length > 0
              ? outfit.items
              : outfit.itemIds.map((id) => itemById.get(id)).filter((i): i is ClothingItem => Boolean(i))
          return (
            <div key={idx} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <h3 className="font-display text-lg font-semibold">{outfit.title}</h3>
              {items.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {items.map((item) => (
                    <div key={item.id} className="w-24">
                      {item.photo ? (
                        <button
                          type="button"
                          onClick={() => setLightbox({ src: item.photo!, alt: item.name })}
                          aria-label={`View ${item.name} full size`}
                          className="cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                        >
                          <img src={item.photo} alt={item.name} className="h-24 w-24 rounded-2xl object-cover ring-1 ring-black/5" />
                        </button>
                      ) : (
                        <div
                          className="grid h-24 w-24 place-items-center rounded-2xl text-[10px] font-medium text-[#fff] ring-1 ring-[#000]/10"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.category}
                        </div>
                      )}
                      <p className="mt-1 truncate text-xs font-medium">{item.name}</p>
                    </div>
                  ))}
                </div>
              )}
              {outfit.missing && outfit.missing.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Worth adding</p>
                  {outfit.missing.map((m, i) => (
                    <p key={i} className="flex items-center gap-2 text-sm text-ink/70">
                      {m.color && <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: m.color }} />}
                      <span>
                        <strong>{m.name}</strong> ({m.category}) — {m.reason}
                      </span>
                    </p>
                  ))}
                </div>
              )}
              <p className="mt-3 rounded-xl bg-cloud px-3.5 py-2.5 text-sm text-ink/60">✨ {outfit.stylingTip}</p>
            </div>
          )
        })}

        {lightbox && <PhotoLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
      </div>
    )
  }

  return (
    <div className="mx-auto mt-10 max-w-xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
      <div className="space-y-4">
        <div>
          <label htmlFor="occasion-type" className="mb-1 block text-sm font-semibold text-ink/70">
            What's the occasion?
          </label>
          <select
            id="occasion-type"
            value={occasionId}
            onChange={(e) => { setOccasionId(e.target.value); setError(null) }}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-coral"
          >
            <option value="">Select an occasion…</option>
            {Object.entries(grouped).map(([category, list]) => (
              <optgroup key={category} label={CATEGORY_LABEL[category] ?? category}>
                {list.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="occasion-location" className="mb-1 block text-sm font-semibold text-ink/70">
              City <span className="font-normal text-ink/40">(optional)</span>
            </label>
            <input
              id="occasion-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Mumbai, Dubai…"
              className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
          <div>
            <label htmlFor="occasion-date" className="mb-1 block text-sm font-semibold text-ink/70">
              Date <span className="font-normal text-ink/40">(optional)</span>
            </label>
            <input
              id="occasion-date"
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm font-medium text-coral">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={busy}
          className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? 'Styling your outfits…' : '✨ Glow Up'}
        </button>
        <p className="text-center text-xs text-ink/40">
          Uses one AI run — outfits come from your own closet ({closet.length} items), styled for the occasion.
        </p>
      </div>
    </div>
  )
}
