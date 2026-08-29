import type { DayWeather, GeocodedPlace, WeatherCondition } from '../types'
import { findSampleDestination } from '../data/sampleDestinations'
import { enumerateDates, parseISODate, toISODate } from './dateUtils'
import { fetchWithTimeout } from './fetchWithTimeout'

// --- Geocoding ---------------------------------------------------------
// Open-Meteo's geocoding + forecast APIs are free and keyless, so weather
// works "live" out of the box with zero configuration.

export async function geocodeDestination(query: string): Promise<GeocodedPlace[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  try {
    const res = await fetchWithTimeout(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=5&language=en&format=json`,
    )
    if (!res.ok) throw new Error('geocoding failed')
    const data = await res.json()
    if (!data?.results) return []
    return data.results.map((r: any) => ({
      name: r.name,
      country: r.country ?? '',
      admin1: r.admin1,
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone,
    }))
  } catch {
    const curated = findSampleDestination(trimmed)
    if (curated) {
      return [
        {
          name: curated.label,
          country: curated.country,
          latitude: curated.latitude,
          longitude: curated.longitude,
        },
      ]
    }
    return []
  }
}

// WMO weather codes -> our simplified condition set
function mapWeatherCode(code: number): WeatherCondition {
  if (code === 0) return 'sunny'
  if ([1, 2].includes(code)) return 'partly-cloudy'
  if (code === 3) return 'cloudy'
  if ([45, 48].includes(code)) return 'foggy'
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rainy'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snowy'
  if ([95, 96, 99].includes(code)) return 'stormy'
  return 'partly-cloudy'
}

const FORECAST_HORIZON_DAYS = 15

function withinForecastHorizon(dateISO: string): boolean {
  const today = new Date()
  const todayISO = toISODate(today)
  const target = parseISODate(dateISO)
  const start = parseISODate(todayISO)
  const diffDays = Math.round((target.getTime() - start.getTime()) / 86400000)
  return diffDays >= -1 && diffDays <= FORECAST_HORIZON_DAYS
}

async function fetchLiveForecast(
  lat: number,
  lon: number,
  startISO: string,
  endISO: string,
): Promise<DayWeather[] | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_mean,weathercode,windspeed_10m_max',
      timezone: 'auto',
      start_date: startISO,
      end_date: endISO,
    })
    const res = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)
    if (!res.ok) return null
    const data = await res.json()
    const daily = data?.daily
    if (!daily?.time) return null

    return daily.time.map((date: string, i: number) => ({
      date,
      tempMaxC: Math.round(daily.temperature_2m_max[i]),
      tempMinC: Math.round(daily.temperature_2m_min[i]),
      precipitationChance: Math.round(daily.precipitation_probability_mean?.[i] ?? 0),
      windKph: Math.round(daily.windspeed_10m_max?.[i] ?? 0),
      condition: mapWeatherCode(daily.weathercode[i]),
    }))
  } catch {
    return null
  }
}

// --- Climate-based estimate ---------------------------------------------
// Used when the trip is outside Open-Meteo's ~15 day forecast horizon, or
// when the network/API is unavailable. Blends a curated destination profile
// (if we have one) or a latitude-based heuristic, with light day-to-day
// variation so the itinerary doesn't look robotic.

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function latitudeClimateGuess(lat: number, month: number): { high: number; low: number; rain: number } {
  // month: 0-11. Southern hemisphere flips the seasonal curve.
  const isSouthern = lat < 0
  const effectiveMonth = isSouthern ? (month + 6) % 12 : month
  const absLat = Math.abs(lat)

  // Rough seasonal curve peaking in July (index 6) for the northern-style calendar
  const seasonal = Math.cos(((effectiveMonth - 6) / 12) * 2 * Math.PI)

  let baseHigh: number
  if (absLat < 15) baseHigh = 31
  else if (absLat < 30) baseHigh = 27
  else if (absLat < 45) baseHigh = 20
  else if (absLat < 60) baseHigh = 14
  else baseHigh = 5

  const swing = absLat < 15 ? 3 : absLat < 30 ? 8 : absLat < 45 ? 14 : absLat < 60 ? 18 : 20

  const high = Math.round(baseHigh + swing * seasonal * 0.5)
  const low = Math.round(high - (8 + absLat / 10))
  const rain = absLat < 15 ? 45 : 35

  return { high, low, rain }
}

export function estimateWeather(
  place: GeocodedPlace | null,
  destinationQuery: string,
  startISO: string,
  endISO: string,
): DayWeather[] {
  const dates = enumerateDates(startISO, endISO)
  const curated = findSampleDestination(destinationQuery)
  const rng = seededRandom(destinationQuery.length * 977 + dates.length)

  return dates.map((date) => {
    const month = parseISODate(date).getUTCMonth()
    let high: number
    let low: number
    let rain: number

    if (curated) {
      high = curated.monthlyHighsC[month]
      low = curated.monthlyLowsC[month]
      rain = curated.monthlyRainChance[month]
    } else if (place) {
      const guess = latitudeClimateGuess(place.latitude, month)
      high = guess.high
      low = guess.low
      rain = guess.rain
    } else {
      high = 22
      low = 14
      rain = 35
    }

    const jitter = (rng() - 0.5) * 4
    const tempMaxC = Math.round(high + jitter)
    const tempMinC = Math.round(low + jitter * 0.6)
    const precipitationChance = Math.max(0, Math.min(100, Math.round(rain + (rng() - 0.5) * 30)))

    let condition: WeatherCondition
    if (tempMaxC <= 1 && precipitationChance > 35) condition = 'snowy'
    else if (precipitationChance > 65) condition = 'stormy'
    else if (precipitationChance > 40) condition = 'rainy'
    else if (precipitationChance > 22) condition = 'partly-cloudy'
    else condition = rng() > 0.75 ? 'cloudy' : 'sunny'

    return {
      date,
      tempMaxC,
      tempMinC,
      precipitationChance,
      windKph: Math.round(10 + rng() * 20),
      condition,
    }
  })
}

export interface WeatherResult {
  days: DayWeather[]
  source: 'live' | 'estimated'
}

export async function getTripWeather(
  place: GeocodedPlace | null,
  destinationQuery: string,
  startISO: string,
  endISO: string,
): Promise<WeatherResult> {
  const allWithinHorizon = enumerateDates(startISO, endISO).every(withinForecastHorizon)

  if (place && allWithinHorizon) {
    const live = await fetchLiveForecast(place.latitude, place.longitude, startISO, endISO)
    if (live && live.length > 0) {
      return { days: live, source: 'live' }
    }
  }

  return { days: estimateWeather(place, destinationQuery, startISO, endISO), source: 'estimated' }
}

export const WEATHER_ICON: Record<WeatherCondition, string> = {
  sunny: '☀️',
  'partly-cloudy': '⛅',
  cloudy: '☁️',
  rainy: '🌧️',
  stormy: '⛈️',
  snowy: '❄️',
  foggy: '🌫️',
}

export const WEATHER_LABEL: Record<WeatherCondition, string> = {
  sunny: 'Sunny',
  'partly-cloudy': 'Partly cloudy',
  cloudy: 'Cloudy',
  rainy: 'Rainy',
  stormy: 'Stormy',
  snowy: 'Snowy',
  foggy: 'Foggy',
}
