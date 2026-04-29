// DealSpot — Service Worker v2
// À déployer dans le MÊME dossier que index.html
// Compatible GitHub Pages, Netlify, Vercel, hébergement classique

const CACHE = 'dealspot-v2';

// Ressources à mettre en cache au premier chargement
const ASSETS = [
  './',
  './index.html'
];

// ─── Installation : mise en cache des assets statiques
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activation : suppression des anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch : cache-first pour les assets, network-first pour les données
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // Ne pas intercepter : Supabase, Overpass, OpenStreetMap, AdSense
  if (
    url.includes('supabase.co') ||
    url.includes('overpass') ||
    url.includes('openstreetmap.org/export') ||
    url.includes('pagead2.google') ||
    url.includes('googlesyndication')
  ) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Mettre en cache si réponse valide
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Hors-ligne → servir depuis le cache
        return caches.match(e.request)
          .then(cached => cached || caches.match('./index.html'));
      })
  );
});

// ─── Notifications push
self.addEventListener('push', e => {
  const data = e.data?.json() || {
    title: 'DealSpot 🎯',
    body: 'Nouveau bon plan près de toi !'
  };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'dealspot-deal',
      data: { url: data.url || './' }
    })
  );
});

// ─── Clic sur notification → ouvrir l'app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Si l'app est déjà ouverte → focus dessus
        for (const client of windowClients) {
          if ('focus' in client) return client.focus();
        }
        // Sinon → ouvrir un nouvel onglet
        return clients.openWindow(e.notification.data?.url || './');
      })
  );
});
