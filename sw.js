// plico - service worker. Memoria "plico-{versione}": l'app parte anche senza rete dalla seconda apertura.
const VERSIONE = '2.2.0';
const MEMORIA = 'plico-' + VERSIONE;
const ARRIVI = 'plico-arrivi';
const SUBITO = ['./', 'index.html', 'manifest.webmanifest', 'icone/plico.svg', 'icone/icona-192.png', 'icone/icona-512.png', 'icone/icona-maschera-512.png',
  'lib/pdfjs/pdf.min.mjs', 'lib/pdfjs/pdf.worker.min.mjs', 'lib/pdfjs/pdf_viewer.mjs', 'lib/pdfjs/pdf_viewer.css', 'esempi/prova.pdf'];
const A_RICHIESTA = /\/lib\/pdfjs\/(wasm|standard_fonts|cmaps|images)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(MEMORIA).then(c => c.addAll(SUBITO.map(u => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('plico-') && k !== MEMORIA && k !== ARRIVI) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => { if (e.data === 'aggiorna') self.skipWaiting(); });

async function ricevi(richiesta) {   // Condividi > plico: i file arrivano qui e l'app li importa all'avvio
  try {
    const dati = await richiesta.formData();
    const c = await caches.open(ARRIVI);
    let i = 0;
    for (const f of dati.getAll('pdf')) {
      if (!(f instanceof File)) continue;
      await c.put(new Request('./arrivi/' + Date.now() + '-' + (i++)), new Response(f, { headers: { 'Content-Type': f.type || 'application/pdf', 'X-Nome': encodeURIComponent(f.name || 'Documento.pdf') } }));
    }
  } catch (e) { /* l'app dirà che non è arrivato nulla */ }
  return Response.redirect('./#libreria', 303);
}

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (u.origin !== location.origin) return;                       // Dropbox e altro: rete diretta
  if (r.method === 'POST' && u.pathname.endsWith('/ricevi')) { e.respondWith(ricevi(r)); return; }
  if (r.method !== 'GET') return;
  if (r.mode === 'navigate') {
    e.respondWith(caches.match('index.html', { cacheName: MEMORIA }).then(m => m || fetch(r)).catch(() => fetch(r)));
    return;
  }
  e.respondWith((async () => {
    const m = await caches.match(r, { cacheName: MEMORIA, ignoreSearch: true });
    if (m) return m;
    const risposta = await fetch(r);
    if (risposta.ok && A_RICHIESTA.test(u.pathname)) (await caches.open(MEMORIA)).put(r, risposta.clone());
    return risposta;
  })());
});
