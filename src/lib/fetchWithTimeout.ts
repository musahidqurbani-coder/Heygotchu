// Wraps fetch with a hard timeout so a slow or unreachable network never
// leaves the UI stuck in a loading state — every external call in this app
// (geocoding, weather, images, AI copy) has a graceful mock/fallback path,
// but that fallback only helps if we actually give up on the network call
// in a reasonable amount of time.
export async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
