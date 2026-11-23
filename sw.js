/**
 * SuperLista - Service Worker
 * Mantém o app funcionando offline dentro do mercado (onde o sinal costuma ser fraco).
 * Estratégia network-first: com rede, sempre a versão mais nova; sem rede, o cache.
 */
const CACHE = 'superlista-v4';
// Tudo é local (sem CDNs): o app inteiro fica disponível offline após a primeira visita
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon.svg',
  './css/tailwind.css',
  './css/style.css',
  './js/app.mjs',
  './js/store.mjs',
  './js/parser.mjs',
  './js/audio.mjs',
  './js/format.mjs',
  './js/ui.mjs',
  './vendor/fontawesome/css/all.min.css',
  './vendor/fontawesome/webfonts/fa-solid-900.woff2',
  './vendor/fontawesome/webfonts/fa-brands-400.woff2',
  './vendor/fonts/plus-jakarta-sans-latin-400-normal.woff2',
  './vendor/fonts/plus-jakarta-sans-latin-500-normal.woff2',
  './vendor/fonts/plus-jakarta-sans-latin-600-normal.woff2',
  './vendor/fonts/plus-jakarta-sans-latin-700-normal.woff2',
  './vendor/fonts/plus-jakarta-sans-latin-800-normal.woff2'
];

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
