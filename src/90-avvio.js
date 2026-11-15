// Avvio: percorsi, service worker e aggiornamento, Condividi > plico, Apri con, trascinamento, pulizia.
import { el, ascolta, emetti } from './20-base.js';
import { avviso, gestisciPop, segnaRotta, chiudiTuttiLivelli, vai, striscia } from './25-interfaccia.js';
import { apri as apriArchivio, impostazione, imposta, proteggi } from './30-archivio.js';
import { L, caricaLibreria, mostraVista, importa, puliziaAvvio, ridisegna } from './50-libreria.js';
import { D, apri, chiudi } from './60-documento.js';
import { mostraImpostazioni, applicaTema } from './70-impostazioni.js';
import { avviaSync } from './80-sync.js';

// ---------- percorsi: #libreria, #preferiti, #cartelle, #cartella-{id}, #cestino, #doc-{id}, #impostazioni, #guida ----------
let rottaInCorso = Promise.resolve();
function rotta() {
  rottaInCorso = rottaInCorso.then(async () => {
    const h = location.hash || '#libreria';
    segnaRotta(h);
    let m;
    if ((m = /^#doc-([a-z0-9]{8})$/.exec(h))) { await apri(m[1]); return; }
    if (D.aperto) await chiudi();
    if (h === '#impostazioni' || h === '#guida') { await mostraImpostazioni(h === '#guida' ? 'guida' : undefined); return; }
    if ((m = /^#cartella-([a-z0-9]{8})$/.exec(h))) { await mostraVista('cartella', m[1]); return; }
    if (h === '#preferiti') return mostraVista('preferiti');
    if (h === '#cartelle') return mostraVista('cartelle');
    if (h === '#cestino') return mostraVista('cestino');
    return mostraVista('tutti');
  }).catch(e => { console.error(e); avviso('Qualcosa non è andato. Riprova.'); });
  return rottaInCorso;
}
addEventListener('popstate', () => { gestisciPop(); });
addEventListener('hashchange', () => { chiudiTuttiLivelli(); rotta(); });
ascolta('rotta', () => rotta());
ascolta('libreria:ridisegna', () => { if (!D.aperto) rotta(); });

// ---------- file in arrivo: Condividi > plico, Apri con, trascinamento ----------
async function arrivi() {
  if (!('caches' in window)) return;
  try {
    const c = await caches.open('plico-arrivi'), chiavi = await c.keys();
    if (!chiavi.length) return;
    const file = [];
    for (const k of chiavi) {
      const r = await c.match(k);
      if (r) file.push(new File([await r.blob()], decodeURIComponent(r.headers.get('X-Nome') || 'Documento.pdf'), { type: 'application/pdf' }));
      await c.delete(k);
    }
    const fatti = await importa(file, { cartella: null });
    if (fatti.length === 1) vai('#doc-' + fatti[0].id);
  } catch (e) { console.error(e); avviso('I file condivisi non sono arrivati. Riprova da Condividi.', { durata: 6000 }); }
}
function apriCon() {
  if (!('launchQueue' in window)) return;
  window.launchQueue.setConsumer(async p => {
    if (!p.files?.length) return;
    const file = await Promise.all(p.files.map(h => h.getFile()));
    const fatti = await importa(file, { cartella: null });
    if (fatti.length === 1) vai('#doc-' + fatti[0].id);
  });
}
function trascinamento() {
  let velo = null, conta = 0;
  const togli = () => { velo?.remove(); velo = null; conta = 0; };
  addEventListener('dragenter', e => {
    if (D.aperto || !e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault(); conta++;
    if (!velo) { velo = el('div.trascina', { testo: 'Lascia qui i PDF' }); document.body.append(velo); }
  });
  addEventListener('dragover', e => { if (velo) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
  addEventListener('dragleave', () => { if (velo && --conta <= 0) togli(); });
  addEventListener('drop', e => {
    if (!velo) return;
    e.preventDefault(); togli();
    const f = Array.from(e.dataTransfer.files || []);
    if (f.length) importa(f);
  });
}

// ---------- service worker e aggiornamento (punti 93-94, 148) ----------
function servizio() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  let ricaricando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!ricaricando && sessionStorage.getItem('plico-aggiorna') === '1') { ricaricando = true; sessionStorage.removeItem('plico-aggiorna'); location.reload(); } });
  navigator.serviceWorker.register('sw.js').then(reg => {
    const pronta = w => {
      if (!w || !navigator.serviceWorker.controller) return;
      avviso('Nuova versione pronta', { durata: 24 * 3600 * 1000, azione: { testo: 'Aggiorna', fai: async () => {
        if (D.aperto) await D.strumenti?.salvaOra();
        sessionStorage.setItem('plico-aggiorna', '1'); w.postMessage('aggiorna');
      } } });
    };
    if (reg.waiting) pronta(reg.waiting);
    reg.addEventListener('updatefound', () => { const w = reg.installing; w?.addEventListener('statechange', () => { if (w.state === 'installed') pronta(w); }); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(e => console.error('Service worker', e));
}

// ---------- avvio ----------
async function avvia() {
  try { await apriArchivio(); }
  catch (e) {
    console.error(e);
    striscia('plico non riesce ad aprire il suo archivio su questo dispositivo. Può succedere in una finestra anonima o se lo spazio è finito.', [{ testo: 'Riprova', fai: () => location.reload() }]);
    return;
  }
  await caricaLibreria();
  applicaTema();
  try { localStorage.setItem('plico-splash', L.imp.splash === false ? 'no' : 'si'); } catch {}
  await puliziaAvvio().catch(e => console.error(e));
  if (!(await impostazione('protezioneChiesta'))) { await proteggi(); await imposta('protezioneChiesta', true); }
  matchMedia('(min-width: 720px)').addEventListener('change', () => { if (!D.aperto) rotta(); });
  trascinamento(); apriCon(); servizio();
  await rotta();
  await arrivi();
  avviaSync().catch(e => console.error(e));
  emetti('avvio');
}
avvia();
