const CACHE = 'zhanggui-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const res = await fetch(e.request)
        if (res && res.ok) cache.put(e.request, res.clone())
        return res
      } catch {
        const hit = await cache.match(e.request)
        if (hit) return hit
        if (e.request.mode === 'navigate') {
          const shell = await cache.match('./index.html')
          if (shell) return shell
        }
        return new Response('离线且无缓存', { status: 503 })
      }
    }),
  )
})
