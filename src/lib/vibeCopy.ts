import type { DayWeather, TripVibe } from '../types'
import { findSampleDestination } from '../data/sampleDestinations'
import { fetchWithTimeout } from './fetchWithTimeout'
import { API_BASE_URL } from './apiConfig'

// --- AI copy abstraction -------------------------------------------------
// Calls the Heygotchu backend's Claude-powered description endpoint (see
// /server/src/routes/vibe.ts), which keeps ANTHROPIC_API_KEY on the server.
// Whenever the backend isn't running, or no key is configured there, we
// fall back to a solid templated description so the app is never empty.

function averageHigh(days: DayWeather[]): number {
  if (days.length === 0) return 20
  return Math.round(days.reduce((sum, d) => sum + d.tempMaxC, 0) / days.length)
}

const VIBE_PHRASES: Record<TripVibe, string> = {
  Beach: 'salt air, bare feet, and golden light',
  Mountains: 'thin crisp air and big open views',
  Hiking: 'trail dust and the good kind of tired',
  City: 'fast sidewalks and a skyline that never sits still',
  Nature: 'quiet trails and green in every direction',
  Food: 'market stalls, long lunches, and second helpings',
  Culture: 'old streets, museums, and stories in the walls',
  Adventure: 'the pull of the next unplanned thing',
  Snow: 'powder days and steam rising off hot drinks',
  Relaxation: 'slow mornings and nowhere you have to be',
}

function templatedDescription(destination: string, vibes: TripVibe[], days: DayWeather[]): string {
  const curated = findSampleDestination(destination)
  const avgHigh = averageHigh(days)
  const tempWord = avgHigh >= 28 ? 'sun-warmed' : avgHigh >= 18 ? 'mild' : avgHigh >= 8 ? 'crisp' : 'cold'
  const vibeText = vibes.length
    ? vibes
        .slice(0, 3)
        .map((v) => VIBE_PHRASES[v])
        .join(', ')
    : 'a little bit of everything'

  if (curated) {
    return `${curated.vibeSummary} Expect ${tempWord} days built around ${vibeText}.`
  }

  return `${destination} is shaping up ${tempWord} and full of possibility — pack for ${vibeText}, and let the itinerary breathe.`
}

export async function getTripVibeDescription(
  destination: string,
  vibes: TripVibe[],
  days: DayWeather[],
): Promise<string> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/vibe/describe`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, vibes, days }),
      },
      4000,
    )
    if (res.ok) {
      const data = await res.json()
      if (data?.description) return data.description as string
    }
  } catch {
    // no serverless function deployed / offline — fall through to template
  }

  return templatedDescription(destination, vibes, days)
}
