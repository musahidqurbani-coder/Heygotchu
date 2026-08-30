// Picks up photos that arrived via the Web Share Target (see sw.js): the
// service worker parks shared images in a dedicated cache; the app consumes
// them exactly once and hands them to the bulk uploader.
const INTAKE_CACHE = 'heygotchu-shared-intake'

export async function consumeSharedFiles(): Promise<File[]> {
  if (!('caches' in window)) return []
  try {
    const cache = await caches.open(INTAKE_CACHE)
    const keys = await cache.keys()
    if (keys.length === 0) return []
    const files = await Promise.all(
      keys.map(async (req) => {
        const res = await cache.match(req)
        if (!res) return null
        const blob = await res.blob()
        const name = res.headers.get('X-Name') ?? 'shared.jpg'
        return new File([blob], name, { type: blob.type || 'image/jpeg' })
      }),
    )
    await caches.delete(INTAKE_CACHE)
    return files.filter((f): f is File => Boolean(f))
  } catch {
    return []
  }
}

export function hasShareFlag(): boolean {
  return new URLSearchParams(window.location.search).get('shared') === '1'
}

export function clearShareFlag(): void {
  try {
    window.history.replaceState(null, '', '/')
  } catch { /* ignore */ }
}
