import { useEffect, useRef, useState } from 'react'
import type { GeocodedPlace } from '../types'
import { geocodeDestination } from '../lib/weatherApi'
import { SAMPLE_DESTINATIONS } from '../data/sampleDestinations'

interface DestinationSearchProps {
  value: string
  onChange: (value: string) => void
  onSelectPlace: (place: GeocodedPlace | null) => void
  error?: string
}

const QUICK_PICKS = Object.values(SAMPLE_DESTINATIONS).map((d) => d.label)

export default function DestinationSearch({ value, onChange, onSelectPlace, error }: DestinationSearchProps) {
  const [suggestions, setSuggestions] = useState<GeocodedPlace[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleInput(next: string) {
    onChange(next)
    onSelectPlace(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (next.trim().length < 2) {
      setSuggestions([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const results = await geocodeDestination(next)
      setSuggestions(results)
      setLoading(false)
    }, 350)
  }

  function selectPlace(place: GeocodedPlace) {
    onChange(place.name)
    onSelectPlace(place)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor="destination" className="mb-1.5 block text-sm font-semibold text-ink/70">
        Where are you headed?
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg" aria-hidden="true">
          📍
        </span>
        <input
          id="destination"
          type="text"
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Bali, Tokyo, Paris…"
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={error ? 'destination-error' : undefined}
          className={`w-full rounded-2xl border bg-white py-3.5 pl-11 pr-4 text-base shadow-sm outline-none transition focus:ring-2 focus:ring-coral ${
            error ? 'border-coral' : 'border-black/10'
          }`}
        />
      </div>
      {error && (
        <p id="destination-error" className="mt-1 text-xs font-medium text-coral">
          {error}
        </p>
      )}

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 animate-pop-in">
          {value.trim().length < 2 ? (
            <div className="p-3">
              <p className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">
                Popular picks
              </p>
              {QUICK_PICKS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    const profile = SAMPLE_DESTINATIONS[label.toLowerCase()]
                    selectPlace({
                      name: profile.label,
                      country: profile.country,
                      latitude: profile.latitude,
                      longitude: profile.longitude,
                    })
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-ink/80 transition hover:bg-cloud"
                >
                  🌍 {label}
                </button>
              ))}
            </div>
          ) : loading ? (
            <div className="p-4 text-sm text-ink/50">Searching…</div>
          ) : suggestions.length > 0 ? (
            <ul>
              {suggestions.map((place, i) => (
                <li key={`${place.name}-${i}`}>
                  <button
                    type="button"
                    onClick={() => selectPlace(place)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-cloud"
                  >
                    <span aria-hidden="true">📍</span>
                    <span>
                      {place.name}
                      {place.admin1 ? `, ${place.admin1}` : ''}
                      <span className="text-ink/40"> · {place.country}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-sm text-ink/50">No matches — you can still use this destination as typed.</div>
          )}
        </div>
      )}
    </div>
  )
}
