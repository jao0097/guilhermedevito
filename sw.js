/**
 * SuperLista - Service Worker
 * Mantém o app funcionando offline dentro do mercado (onde o sinal costuma ser fraco).
 * Estratégia: arquivos do app = network-first (sempre atualizados quando há rede);
 * CDNs (Tailwind, Font Awesome, fontes) = cache-first.
 */
const CACHE = 'superlista-v3';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './icon.svg',
  './js/app.mjs',
  './js/store.mjs',
  './js/parser.mjs',
  './js/audio.mjs',
  './js/format.mjs'
];
const CDN_HOSTS = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
        return res;
      }))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
    );
  }
});
