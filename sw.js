// Service worker v2: app offline + roteiro PDF em cache
const CACHE = 'despesas-viagem-v2';
const NUCLEO = ['.', 'index.html', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      await c.addAll(NUCLEO);
      // PDF do roteiro: cache tolerante (se ainda não subiu ao repositório, não quebra a instalação)
      try { await c.add('planejamento.pdf'); } catch(err) {}
    }).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(r => {
      if (r) return r;
      return fetch(e.request).then(resp => {
        // cache dinâmico do próprio site (pega o PDF na primeira abertura online)
        if (resp.ok && new URL(e.request.url).origin === self.location.origin) {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return resp;
      });
    })
  );
});
