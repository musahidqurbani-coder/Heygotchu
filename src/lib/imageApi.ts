import { findSampleDestination } from '../data/sampleDestinations'
import { fetchWithTimeout } from './fetchWithTimeout'
import { API_BASE_URL } from './apiConfig'

// --- Image API abstraction -------------------------------------------------
// Real key-based providers (Unsplash, Pexels, etc.) should never be called
// directly from the browser with a secret key attached — that exposes the
// key to anyone who opens devtools. Instead this function calls the Heygotchu
// backend (see /server/src/routes/images.ts), which holds the real key on
// the server. If the backend isn't running, or no key is configured there,
// the fetch fails harmlessly and we fall back to:
//   1) a curated photo for the ~6 sample destinations, or
//   2) a deterministic, always-available stock photo keyed to the
//      destination name, so the UI never breaks.

function slug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'trip'
}

export function fallbackImage(destination: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(slug(destination))}/1600/1000`
}

export async function getDestinationImage(destination: string): Promise<string> {
  const curated = findSampleDestination(destination)

  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/images/destination?query=${encodeURIComponent(destination)}`, {}, 4000)
    if (res.ok) {
      const data = await res.json()
      if (data?.url) return data.url as string
    }
  } catch {
    // no serverless function deployed / offline — fall through to fallback
  }

  return curated?.heroImage ?? fallbackImage(destination)
}
