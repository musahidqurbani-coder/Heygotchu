import type { WeatherCondition } from '../types'
import { findSampleDestination } from '../data/sampleDestinations'

// Simple deterministic string hash -> used so the same destination always
// produces the same procedural palette (rather than a random one each time).
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x: number) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

const CONDITION_HUE_SHIFT: Record<WeatherCondition, number> = {
  sunny: 20,
  'partly-cloudy': 10,
  cloudy: -10,
  rainy: -40,
  stormy: -60,
  snowy: 190,
  foggy: -20,
}

const CONDITION_NAMES: Record<WeatherCondition, string> = {
  sunny: 'Sunlit',
  'partly-cloudy': 'Soft Sky',
  cloudy: 'Overcast',
  rainy: 'Rain Slate',
  stormy: 'Storm Front',
  snowy: 'Frost',
  foggy: 'Misted',
}

export function generatePalette(
  destination: string,
  dominantCondition: WeatherCondition = 'sunny',
): { hex: string; name: string }[] {
  const curated = findSampleDestination(destination)
  if (curated) return curated.palette

  const seed = hashString(destination.toLowerCase())
  const baseHue = (seed % 360) + CONDITION_HUE_SHIFT[dominantCondition]

  const swatches = [
    { h: baseHue, s: 55, l: 38 },
    { h: baseHue + 35, s: 65, l: 58 },
    { h: baseHue + 190, s: 40, l: 62 },
    { h: baseHue - 25, s: 30, l: 88 },
    { h: baseHue + 80, s: 45, l: 30 },
  ]

  return swatches.map((s, i) => ({
    hex: hslToHex(((s.h % 360) + 360) % 360, s.s, s.l),
    name: i === 0 ? `${CONDITION_NAMES[dominantCondition]} Tone` : `Palette ${i + 1}`,
  }))
}
