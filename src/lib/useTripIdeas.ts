import { useEffect, useState } from 'react'
import { aiApi, ApiClientError, type ItineraryDayIdea } from './apiClient'

export interface TripIdeasPlan {
  overview: string
  days: ItineraryDayIdea[]
}

// Session cache keyed by trip id so revisiting the same trip's results (or
// regenerating outfits for it) doesn't burn another AI run.
const planCache = new Map<string, TripIdeasPlan>()

// AI day-by-day activity ideas for a trip — fetched once per trip and shared
// by both the summary card and the Day-by-Day accordion titles.
export function useTripIdeas(
  tripId: string,
  destination: string,
  dayCount: number,
  vibes: string[],
  startDate?: string,
): { plan: TripIdeasPlan | null; error: string | null } {
  const [plan, setPlan] = useState<TripIdeasPlan | null>(planCache.get(tripId) ?? null)
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

  return { plan, error }
}
