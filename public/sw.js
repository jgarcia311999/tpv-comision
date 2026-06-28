const CACHE = "tpv-matet-v1";

// Recursos que se precachean en la instalación
const PRECACHE = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Solo peticiones del mismo origen
  if (url.origin !== self.location.origin) return;

  // Estrategia: network first, fallback a cache
  // Para assets de Next.js (/_next/static/) usamos cache first porque tienen hash
  const isStaticAsset = url.pathname.startsWith("/_next/static/");

  if (isStaticAsset) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return response;
        });
      })
    );
  } else {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
