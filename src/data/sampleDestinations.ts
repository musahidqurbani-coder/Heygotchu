// Curated data for well-known destinations so the app is rich and accurate
// in demo mode, without requiring any API keys. Keyed by lowercase city name.
// This is the first place the app checks before falling back to generic
// procedural generation for destinations that aren't in this list.

export interface DestinationProfile {
  label: string
  country: string
  latitude: number
  longitude: number
  heroImage: string
  palette: { hex: string; name: string }[]
  vibeSummary: string
  places: string[]
  climateNote: string
  // rough monthly average high/low in Celsius, used for the weather estimator
  // when a trip falls outside the live forecast window
  monthlyHighsC: number[]
  monthlyLowsC: number[]
  monthlyRainChance: number[] // 0-100
}

export const SAMPLE_DESTINATIONS: Record<string, DestinationProfile> = {
  bali: {
    label: 'Bali',
    country: 'Indonesia',
    latitude: -8.4095,
    longitude: 115.1889,
    heroImage: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1800&q=80',
    palette: [
      { hex: '#2E7D6B', name: 'Rice Terrace' },
      { hex: '#F4A340', name: 'Temple Gold' },
      { hex: '#F2E7D5', name: 'Sand Wash' },
      { hex: '#1C6E8C', name: 'Lagoon Blue' },
      { hex: '#E8603C', name: 'Sunset Clay' },
    ],
    vibeSummary:
      'Warm, unhurried, and lush — think open-air cafes, incense drifting past temple gates, and golden light over rice paddies.',
    places: ['Ubud Rice Terraces', 'Uluwatu Temple', 'Seminyak Beach Clubs', 'Sekumpul Waterfall'],
    climateNote: 'Tropical and humid year-round with a wetter season Nov–Mar.',
    monthlyHighsC: [31, 31, 31, 32, 31, 30, 30, 30, 31, 31, 31, 31],
    monthlyLowsC: [24, 24, 24, 24, 23, 22, 22, 22, 22, 23, 24, 24],
    monthlyRainChance: [70, 65, 60, 45, 30, 20, 15, 12, 18, 30, 50, 65],
  },
  tokyo: {
    label: 'Tokyo',
    country: 'Japan',
    latitude: 35.6762,
    longitude: 139.6503,
    heroImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1800&q=80',
    palette: [
      { hex: '#E63950', name: 'Torii Red' },
      { hex: '#1A1A2E', name: 'Neon Night' },
      { hex: '#F5D1DB', name: 'Sakura Blush' },
      { hex: '#3E8E7E', name: 'Matcha' },
      { hex: '#F2F2F2', name: 'Paper White' },
    ],
    vibeSummary:
      'A city of contrasts — quiet shrine gardens minutes from neon-drenched crossings, precise design, and effortless layering.',
    places: ['Shibuya Crossing', 'Senso-ji Temple', 'Shinjuku Gyoen', 'Tsukiji Outer Market'],
    climateNote: 'Four distinct seasons; hot humid summers, mild winters, spectacular spring and autumn.',
    monthlyHighsC: [10, 11, 14, 19, 23, 26, 29, 31, 27, 22, 17, 12],
    monthlyLowsC: [2, 2, 5, 10, 15, 19, 23, 24, 21, 15, 9, 4],
    monthlyRainChance: [35, 35, 45, 50, 55, 65, 60, 50, 55, 45, 35, 30],
  },
  paris: {
    label: 'Paris',
    country: 'France',
    latitude: 48.8566,
    longitude: 2.3522,
    heroImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1800&q=80',
    palette: [
      { hex: '#26374B', name: 'Zinc Roof' },
      { hex: '#C9A66B', name: 'Sandstone' },
      { hex: '#7A1F2B', name: 'Bordeaux' },
      { hex: '#E7E2D8', name: 'Limestone' },
      { hex: '#4C6E5D', name: 'Boulevard Green' },
    ],
    vibeSummary:
      'Effortlessly elegant — tailored coats, café terraces, and golden-hour walks along the Seine call for polish over flash.',
    places: ['Le Marais', 'Musée d’Orsay', 'Canal Saint-Martin', 'Montmartre'],
    climateNote: 'Mild oceanic climate; cool damp winters, pleasant summers.',
    monthlyHighsC: [7, 8, 12, 15, 19, 22, 25, 25, 21, 16, 10, 7],
    monthlyLowsC: [3, 3, 5, 7, 11, 13, 15, 15, 12, 9, 5, 3],
    monthlyRainChance: [55, 50, 48, 45, 48, 42, 38, 38, 42, 50, 55, 58],
  },
  switzerland: {
    label: 'Switzerland',
    country: 'Switzerland',
    latitude: 46.8182,
    longitude: 8.2275,
    heroImage: 'https://images.unsplash.com/photo-1531210483974-4f8c1f33fd35?auto=format&fit=crop&w=1800&q=80',
    palette: [
      { hex: '#1D3557', name: 'Glacier Blue' },
      { hex: '#F1FAEE', name: 'Snowcap' },
      { hex: '#457B9D', name: 'Alpine Lake' },
      { hex: '#6B8F71', name: 'Pine' },
      { hex: '#D6CFC7', name: 'Granite' },
    ],
    vibeSummary:
      'Crisp mountain air and postcard views — practical, technical layers that still look sharp on a village café terrace.',
    places: ['Lauterbrunnen Valley', 'Lake Geneva', 'Matterhorn Glacier Paradise', 'Old Town Bern'],
    climateNote: 'Alpine climate — cold snowy winters, mild summers, big day/night temperature swings.',
    monthlyHighsC: [2, 4, 9, 13, 17, 21, 23, 22, 18, 13, 7, 3],
    monthlyLowsC: [-4, -3, 0, 3, 7, 10, 12, 12, 9, 5, 0, -3],
    monthlyRainChance: [40, 38, 40, 45, 50, 48, 45, 45, 40, 38, 42, 42],
  },
  'new york': {
    label: 'New York',
    country: 'United States',
    latitude: 40.7128,
    longitude: -74.006,
    heroImage: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1800&q=80',
    palette: [
      { hex: '#111214', name: 'Asphalt' },
      { hex: '#F2A93B', name: 'Taxi Yellow' },
      { hex: '#C1272D', name: 'Brick' },
      { hex: '#8E9AAF', name: 'Skyline Grey' },
      { hex: '#F5F1E7', name: 'Bodega Light' },
    ],
    vibeSummary:
      'Fast, layered, and a little dressed-up — built for subway-to-street transitions and unpredictable skies.',
    places: ['High Line', 'Brooklyn Bridge', 'Chelsea Market', 'Central Park'],
    climateNote: 'Four seasons with cold winters, hot humid summers, and frequent weather swings.',
    monthlyHighsC: [3, 5, 9, 16, 21, 26, 29, 28, 24, 18, 12, 6],
    monthlyLowsC: [-3, -2, 1, 7, 12, 18, 21, 20, 16, 10, 5, 0],
    monthlyRainChance: [40, 38, 42, 42, 42, 38, 38, 38, 38, 38, 40, 42],
  },
  dubai: {
    label: 'Dubai',
    country: 'United Arab Emirates',
    latitude: 25.2048,
    longitude: 55.2708,
    heroImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1800&q=80',
    palette: [
      { hex: '#C9A227', name: 'Desert Gold' },
      { hex: '#0B3D91', name: 'Marina Blue' },
      { hex: '#E8D9C5', name: 'Dune' },
      { hex: '#1A1A1A', name: 'Skyscraper Black' },
      { hex: '#E86A33', name: 'Sunset Amber' },
    ],
    vibeSummary:
      'Glossy and sun-drenched — breathable fabrics for scorching days, with a sharper layer ready for icy malls and skyline dinners.',
    places: ['Burj Khalifa', 'Dubai Marina', 'Al Fahidi Historic District', 'Jumeirah Beach'],
    climateNote: 'Desert climate — extremely hot summers, warm and pleasant winters, almost no rain.',
    monthlyHighsC: [24, 25, 29, 34, 39, 40, 41, 41, 39, 35, 30, 25],
    monthlyLowsC: [14, 15, 18, 22, 26, 28, 30, 30, 27, 24, 19, 15],
    monthlyRainChance: [10, 8, 8, 4, 1, 0, 0, 0, 0, 2, 5, 8],
  },
}

export function findSampleDestination(query: string): DestinationProfile | null {
  const key = query.trim().toLowerCase()
  if (SAMPLE_DESTINATIONS[key]) return SAMPLE_DESTINATIONS[key]
  const match = Object.values(SAMPLE_DESTINATIONS).find(
    (d) => d.label.toLowerCase() === key || key.includes(d.label.toLowerCase()),
  )
  return match ?? null
}
