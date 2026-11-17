const CACHE = 'invest-account-v32-delivery';
const FILES = ['./', './index.html', './styles.css?v=32-delivery', './app.js?v=32-delivery', './manifest.webmanifest', './data/historical-snapshot.js?v=32-delivery', './data/historical-snapshot.json', './icons/icon-192.png', './icons/icon-512.png', './data/authorized-market-data-template.csv', './data/README.md', './data/rule-versions.json', './data/source-manifest.json', './data/trading-calendar-2020.json', './data/venture-scenarios.json'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))));
