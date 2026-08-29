// Heygotchu service worker — makes the app installable and keeps the shell,
// hashed assets, and the login video available offline. API calls always go
// to the network (data must be live); static assets are cached as they're
// fetched, and navigations fall back to the cached shell when offline.
const CACHE = 'heygotchu-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Same-origin static files only — the API and third-party hosts (fonts,
  // image providers) manage their own caching.
  if (url.origin !== location.origin) return

  const isHashedAsset = url.pathname.startsWith('/assets/') || url.pathname.startsWith('/videos/') || url.pathname.startsWith('/icons/')

  if (isHashedAsset) {
    // Cache-first: hashed filenames never change content.
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(request)
        if (hit) return hit
        const res = await fetch(request)
        if (res.ok) cache.put(request, res.clone())
        return res
      }),
    )
    return
  }

  // Network-first for the shell (and anything else), with cache fallback so
  // the app still opens offline.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && (request.mode === 'navigate' || url.pathname === '/manifest.webmanifest')) {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return res
      })
      .catch(async () => {
        const hit = await caches.match(request)
        if (hit) return hit
        if (request.mode === 'navigate') {
          const shell = await caches.match('/')
          if (shell) return shell
        }
        return Response.error()
      }),
  )
})
