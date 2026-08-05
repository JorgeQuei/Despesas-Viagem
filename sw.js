// Service worker v3 — corrige atualização travada:
// HTML: rede primeiro (atualiza na hora; cache só como reserva offline)
// Demais arquivos: cache imediato + revalidação em segundo plano
const CACHE = 'despesas-viagem-v3';
const NUCLEO = ['.', 'index.html', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      await c.addAll(NUCLEO);
      try { await c.add('planejamento.pdf'); } catch (err) {}
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const mesmaOrigem = new URL(e.request.url).origin === self.location.origin;

  // Navegação / HTML: rede primeiro
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(resp => {
        const copia = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
        return resp;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
    );
    return;
  }

  // Demais: cache imediato + atualização silenciosa por trás
  e.respondWith(
    caches.match(e.request).then(emCache => {
      const daRede = fetch(e.request).then(resp => {
        if (resp.ok && mesmaOrigem) {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return resp;
      }).catch(() => emCache);
      return emCache || daRede;
    })
  );
});
