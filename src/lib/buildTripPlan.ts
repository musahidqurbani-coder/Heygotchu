import type { ClothingItem, ClothingPreferences, GeocodedPlace, TripPlan, TripVibe, WeatherCondition } from '../types'
import { geocodeDestination, getTripWeather } from './weatherApi'
import { generatePalette } from './colorPalette'
import { getDestinationImage, fallbackImage } from './imageApi'
import { getTripVibeDescription } from './vibeCopy'
import { generateOutfitPlan } from './outfitGenerator'
import { makeId } from './id'

export interface BuildTripInput {
  destination: string
  place: GeocodedPlace | null
  startDate: string
  endDate: string
  vibes: TripVibe[]
}

interface BuildOptions {
  existingId?: string
  seed?: number
  avoidItemIds?: string[]
  preferences?: ClothingPreferences
}

function dominantCondition(conditions: WeatherCondition[]): WeatherCondition {
  const counts = new Map<WeatherCondition, number>()
  conditions.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1))
  let best: WeatherCondition = 'sunny'
  let bestCount = -1
  counts.forEach((count, condition) => {
    if (count > bestCount) {
      best = condition
      bestCount = count
    }
  })
  return best
}

export async function buildTripPlan(
  input: BuildTripInput,
  closet: ClothingItem[],
  options: BuildOptions = {},
): Promise<TripPlan> {
  let place = input.place
  if (!place) {
    const results = await geocodeDestination(input.destination)
    place = results[0] ?? null
  }

  const [weatherResult, heroImage] = await Promise.all([
    getTripWeather(place, input.destination, input.startDate, input.endDate),
    getDestinationImage(input.destination).catch(() => fallbackImage(input.destination)),
  ])

  const palette = generatePalette(input.destination, dominantCondition(weatherResult.days.map((d) => d.condition)))
  const summary = await getTripVibeDescription(input.destination, input.vibes, weatherResult.days)

  const { days, packingList, gaps } = generateOutfitPlan(closet, weatherResult.days, input.vibes, {
    seed: options.seed,
    avoidItemIds: options.avoidItemIds,
    preferences: options.preferences,
  })

  return {
    id: options.existingId ?? makeId('trip'),
    destination: input.destination,
    place,
    startDate: input.startDate,
    endDate: input.endDate,
    vibes: input.vibes,
    palette,
    vibeSummary: summary,
    days,
    packingList,
    gaps,
    weatherSource: weatherResult.source,
    heroImage,
    createdAt: Date.now(),
  }
}
