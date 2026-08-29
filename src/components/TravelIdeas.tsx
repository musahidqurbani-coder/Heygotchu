import { useEffect, useState } from 'react'
import { aiApi, ApiClientError, type ItineraryDayIdea } from '../lib/apiClient'

interface TravelIdeasProps {
  tripId: string
  destination: string
  dayCount: number
  vibes: string[]
  startDate?: string
}

interface PlanResult {
  overview: string
  days: ItineraryDayIdea[]
}

// Session cache keyed by trip id so revisiting the same trip's results (or
// regenerating outfits for it) doesn't burn another AI run.
const planCache = new Map<string, PlanResult>()

// The mini travel planner: AI day-by-day activity ideas sized to the
// vacation length, shown on every generated trip.
export default function TravelIdeas({ tripId, destination, dayCount, vibes, startDate }: TravelIdeasProps) {
  const [plan, setPlan] = useState<PlanResult | null>(planCache.get(tripId) ?? null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (planCache.has(tripId)) {
      setPlan(planCache.get(tripId)!)
      return
    }
    let cancelled = false
    setPlan(null)
    setError(null)
    aiApi
      .itinerary({ destination, days: Math.min(dayCount, 30), vibes, startDate })
      .then((res) => {
        planCache.set(tripId, res)
        if (!cancelled) setPlan(res)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiClientError ? err.message : 'Trip ideas are unavailable right now.')
      })
    return () => {
      cancelled = true
    }
  }, [tripId, destination, dayCount, vibes, startDate])

  return (
    <section className="mt-10">
      <h2 className="mb-4 font-display text-xl font-semibold">Trip plan ideas 🗺️</h2>
      {error ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-ink/50 shadow-sm ring-1 ring-black/5">{error}</p>
      ) : plan === null ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-ink/50 shadow-sm ring-1 ring-black/5">
          ✨ Planning your {dayCount}-day adventure…
        </p>
      ) : (
        <div className="space-y-3">
          <p className="rounded-2xl bg-white px-4 py-3 text-sm text-ink/70 shadow-sm ring-1 ring-black/5">
            {plan.overview}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {plan.days.map((day) => (
              <div key={day.day} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <p className="text-xs font-semibold uppercase tracking-widest text-coral">Day {day.day}</p>
                <h3 className="mt-0.5 font-display text-base font-semibold">{day.title}</h3>
                <ul className="mt-2 space-y-1">
                  {day.activities.map((a, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink/70">
                      <span aria-hidden="true">•</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
                {day.tip && <p className="mt-2 rounded-lg bg-cloud px-2.5 py-1.5 text-xs text-ink/55">💡 {day.tip}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
