// Heygotchu service worker — makes the app installable and keeps the shell,
// hashed assets, and the login video available offline. API calls always go
// to the network (data must be live); static assets are cached as they're
// fetched, and navigations fall back to the cached shell when offline.
const CACHE = 'heygotchu-v3'

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
  const url = new URL(request.url)

  // Web Share Target: photos shared into Heygotchu from the phone's share
  // sheet (gallery, screenshots, saved Instagram images). The files are
  // parked in a cache; the app picks them up and opens Bulk upload.
  if (request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(
      (async () => {
        try {
          const form = await request.formData()
          const files = form.getAll('photos').filter((f) => f && typeof f === 'object' && 'arrayBuffer' in f)
          const cache = await caches.open('heygotchu-shared-intake')
          await Promise.all(
            files.slice(0, 20).map(async (file, i) => {
              await cache.put(
                new Request(`/shared-intake/${i}`),
                new Response(await file.arrayBuffer(), {
                  headers: { 'Content-Type': file.type || 'image/jpeg', 'X-Name': file.name || `shared-${i}.jpg` },
                }),
              )
            }),
          )
        } catch (e) {
          // fall through to the app either way
        }
        return Response.redirect('/?shared=1', 303)
      })(),
    )
    return
  }

  if (request.method !== 'GET') return
  // Same-origin static files only — the API and third-party hosts (fonts,
  // image providers) manage their own caching.
  if (url.origin !== location.origin) return

  // /icons/ used to be treated as "hashed" too, but those filenames are
  // fixed (icon-512.png etc.) and DO change content on a rebrand — cache-
  // first meant a device that had ever cached the old logo would never see
  // the new one. Network-first (below) so a fixed launcher-icon swap shows
  // up immediately instead of needing a cache-version bump.
  const isHashedAsset = url.pathname.startsWith('/assets/') || url.pathname.startsWith('/videos/')

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
