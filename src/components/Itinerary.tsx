import type { DayOutfit } from '../types'
import type { ItineraryDayIdea } from '../lib/apiClient'
import DayOutfitCard from './DayOutfitCard'
import { formatDateLabel } from '../lib/dateUtils'

interface ItineraryProps {
  days: DayOutfit[]
  // AI activity ideas matched by day number — supplies each row's headline
  // ("Day 1 · Arrival & Coast Sunset") and the expanded activity list.
  ideas?: ItineraryDayIdea[]
}

// Day-by-Day as an accordion: every day is a collapsed heading; tapping it
// expands to that day's activities and the outfit planned for it. Uses
// native <details> so it's keyboard/screen-reader accessible for free.
export default function Itinerary({ days, ideas }: ItineraryProps) {
  if (days.length === 0) return null
  return (
    <div className="space-y-3">
      {days.map((day, i) => {
        const idea = ideas?.find((d) => d.day === i + 1)
        return (
          <details
            key={day.date}
            className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5"
            open={i === 0}
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 transition hover:bg-cloud/50 [&::-webkit-details-marker]:hidden">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-base font-semibold">
                  Day {i + 1}{idea?.title ? ` · ${idea.title}` : ''}
                </span>
                <span className="block text-xs text-ink/50">{formatDateLabel(day.date)}</span>
              </span>
              {day.weather && (
                <span className="hidden shrink-0 rounded-full bg-cloud px-2.5 py-1 text-xs font-medium text-ink/60 sm:block">
                  {day.weather.tempMaxC}° / {day.weather.tempMinC}°
                </span>
              )}
              <span className="shrink-0 text-ink/40 transition-transform group-open:rotate-180" aria-hidden="true">
                ▾
              </span>
            </summary>
            <div className="space-y-3 border-t border-black/5 px-5 pb-5 pt-4">
              {idea && idea.activities.length > 0 && (
                <ul className="space-y-1">
                  {idea.activities.map((a, j) => (
                    <li key={j} className="flex gap-2 text-sm text-ink/70">
                      <span aria-hidden="true">📍</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              )}
              {idea?.tip && <p className="rounded-lg bg-cloud px-2.5 py-1.5 text-xs text-ink/55">💡 {idea.tip}</p>}
              <DayOutfitCard outfit={day} />
            </div>
          </details>
        )
      })}
    </div>
  )
}
