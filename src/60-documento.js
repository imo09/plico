// Documento: visore pdf.js, Lettura, barra in alto, pagina, ricerca nel testo, menu del documento.
import { $, el, emetti, ascolta, limita, stretta, rimanda, numero } from './20-base.js';
import { icona, bottoneIcona, menu, avviso, chiedi, striscia, indietro, vai, chiudiUltimo, livelliAperti } from './25-interfaccia.js';
import { leggi, scrivi, segniDi, imposta } from './30-archivio.js';
import { carica, apriDocumento, miniatura } from './40-pdf.js';
import { pdfVuoto } from './41-vuoto.js';
import { sha16 } from './20-base.js';
import { L, salvaScheda, impostaL, rinomina, sposta, preferito, condividi, salvaCopia, dettagli, spostaNelCestino, dimenticaMiniatura } from './50-libreria.js';

// stato del documento aperto. "strumenti" lo registra 65-scrittura.js
export const D = { aperto: false, scheda: null, segni: [], compito: null, doc: null, v: null, bus: null, contenitore: null, stato: 'lettura', password: null, strumenti: null, miniDaRifare: false, radice: null };

const MIN = 0.5, MAX = 5;
export const stratoLettura = () => D.stato === 'lettura';
export function vistaPagina(n) { return D.v?.getPageView(n); }   // n da 0

export function mostraSalvataggio(salvando) {
  const n = D.radice?.querySelector('.salvataggio'); if (!n) return;
  n.replaceChildren(icona(salvando ? 'attesa' : 'fatto'), el('span', { testo: salvando ? 'Salvataggio in corso' : 'Salvato' }));
}

function aggiornaIndicatore() {
  const b = D.radice?.querySelector('.indicatore'); if (!b || !D.v) return;
  const n = D.v.currentPageNumber, t = D.doc?.numPages ?? '-';
  b.textContent = n + ' / ' + t; b.setAttribute('aria-label', 'Pagina ' + n + ' di ' + t + ', vai alla pagina');
}
const salvaPosizione = rimanda(async () => {
  const s = D.scheda; if (!s || !D.v) return;
  s.pagina = D.v.currentPageNumber; s.aperto = Date.now();
  try { await salvaScheda(s, { metadati: false }); } catch (e) { console.error(e); }
}, 800);

export async function vaiAPagina() {
  if (!D.doc) return;
  const t = D.doc.numPages;
  const v = await chiedi('Vai alla pagina', { tipo: 'number', etichetta: 'Pagina, da 1 a ' + t, valore: D.v.currentPageNumber, min: 1, max: t, ok: 'Vai',
    controlla: x => (/^\d+$/.test(x) && +x >= 1 && +x <= t ? '' : 'Scrivi un numero da 1 a ' + t + '.') });
  if (v) D.v.currentPageNumber = Number(v);
}

// ---------- ricerca nel testo ----------
let barraCerca = null;
export function cerca() {
  if (!D.doc) return;
  if (barraCerca) { barraCerca.querySelector('input').focus(); barraCerca.querySelector('input').select(); return; }
  const campo = el('input', { type: 'search', placeholder: 'Cerca nel testo', 'aria-label': 'Cerca nel testo', enterkeyhint: 'search' });
  const esito = el('span.esito', { role: 'status' });
  const manda = (tipo, indietro = false) => D.bus.dispatch('find', { source: null, type: tipo, query: campo.value, caseSensitive: false, entireWord: false, highlightAll: true, findPrevious: indietro, matchDiacritics: false });
  campo.addEventListener('input', () => manda(''));
  campo.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); manda('again', e.shiftKey); } if (e.key === 'Escape') { e.preventDefault(); chiudiCerca(); } });
  barraCerca = el('div.barra-cerca', { role: 'search' }, icona('lente'), campo, esito,
    bottoneIcona('su', 'Risultato precedente', () => manda('again', true)), bottoneIcona('giu', 'Risultato successivo', () => manda('again', false)), bottoneIcona('chiudi', 'Chiudi la ricerca', chiudiCerca));
  barraCerca._esito = esito;
  D.radice.querySelector('.zona').append(barraCerca);
  campo.focus();
}
export function chiudiCerca() {
  if (!barraCerca) return false;
  barraCerca.remove(); barraCerca = null;
  D.bus?.dispatch('findbarclose', { source: null });
  return true;
}
function esitoRicerca({ matchesCount, state }) {
  if (!barraCerca) return;
  const q = barraCerca.querySelector('input').value.trim();
  const tot = matchesCount?.total ?? 0, i = matchesCount?.current ?? 0;
  barraCerca._esito.textContent = !q ? '' : (state === 1 || !tot) ? 'Nessun risultato' : i + ' di ' + tot;
}

// ---------- stato: Lettura e Scrittura (punto 58) ----------
export async function impostaStato(nuovo, { daUtente = false } = {}) {
  if (!D.aperto) return;
  if (daUtente) {
    if (nuovo === 'lettura' && L.imp.haPenna) impostaL('letturaScelta', true);   // in memoria subito, sul disco dopo
    if (nuovo === 'scrittura') impostaL('letturaScelta', false);
  }
  D.stato = nuovo;
  D.contenitore.classList.toggle('lettura', nuovo === 'lettura');
  D.contenitore.classList.toggle('scrittura', nuovo === 'scrittura');
  D.radice.querySelector('.scrivi').hidden = nuovo !== 'lettura';
  if (nuovo === 'scrittura') D.strumenti?.attiva(); else D.strumenti?.disattiva();
}

// ---------- ingrandimento ----------
export function ingrandisci(fattore, origine) {
  if (!D.v) return;
  const nuova = limita(D.v.currentScale * fattore, MIN, MAX);
  if (Math.abs(nuova - D.v.currentScale) < 0.005) return;
  D.v.updateScale({ scaleFactor: nuova / D.v.currentScale, origin: origine, drawingDelay: 400 });
}
// due dita in Lettura (punto 143): touch non passivi; con due tocchi si ingrandisce
function gestoLettura(c) {
  let g = null;
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const centro = t => [(t[0].clientX + t[1].clientX) / 2, (t[0].clientY + t[1].clientY) / 2];
  c.addEventListener('touchstart', e => {
    if (D.stato !== 'lettura' || e.touches.length !== 2) return;
    e.preventDefault(); g = { d0: dist(e.touches), s0: D.v.currentScale, c: centro(e.touches) };
  }, { passive: false });
  c.addEventListener('touchmove', e => {
    if (!g || D.stato !== 'lettura') return;
    if (e.touches.length !== 2) { g = null; return; }
    e.preventDefault();
    const obiettivo = limita(g.s0 * dist(e.touches) / g.d0, MIN, MAX), ce = centro(e.touches);
    const pan = [ce[0] - g.c[0], ce[1] - g.c[1]]; g.c = ce;
    if (Math.abs(obiettivo - D.v.currentScale) >= 0.01) D.v.updateScale({ scaleFactor: obiettivo / D.v.currentScale, origin: ce, drawingDelay: 400, pan });
    else if (pan[0] || pan[1]) { c.scrollLeft -= pan[0]; c.scrollTop -= pan[1]; }
  }, { passive: false });
  const fine = e => { if (e.touches.length < 2) g = null; };
  c.addEventListener('touchend', fine); c.addEventListener('touchcancel', fine);
  c.addEventListener('wheel', e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    ingrandisci(Math.exp(-e.deltaY / 300), [e.clientX, e.clientY]);
  }, { passive: false });
}
// in Lettura la penna è un segnale: se plico non ha ancora scelto Leggi, passa a Scrittura
function sentePenna(c) {
  const sente = e => {
    if (e.pointerType !== 'pen' || D.stato !== 'lettura') return;
    if (L.imp.letturaScelta && L.imp.haPenna) return;
    if (!L.imp.haPenna) impostaL('haPenna', true);
    if (L.imp.letturaScelta) return;
    impostaStato('scrittura').then(() => { if (e.type === 'pointerdown') D.strumenti?.iniziaDa?.(e); });
  };
  c.addEventListener('pointermove', sente); c.addEventListener('pointerdown', sente); c.addEventListener('pointerover', sente);
}

// ---------- tasti (punto 63) ----------
function tasti(e) {
  if (!D.aperto || livelliAperti()) return;
  const inCampo = e.target.closest?.('input, textarea, [contenteditable]');
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); cerca(); return; }
  if (inCampo) return;
  if (ctrl && (e.key === '+' || e.key === '=')) { e.preventDefault(); ingrandisci(1.1); return; }
  if (ctrl && e.key === '-') { e.preventDefault(); ingrandisci(1 / 1.1); return; }
  if (D.strumenti?.tasto?.(e)) return;
  if (e.key === 'Escape') { if (chiudiCerca()) { e.preventDefault(); return; } }
  if (ctrl || e.altKey) return;
  const c = D.contenitore, h = c.clientHeight;
  const passi = { ArrowDown: 60, ArrowUp: -60, PageDown: h * 0.9, PageUp: -h * 0.9, ' ': e.shiftKey ? -h * 0.9 : h * 0.9 };
  if (e.key in passi) { e.preventDefault(); c.scrollBy({ top: passi[e.key] }); }
  if (e.key === 'ArrowRight') { e.preventDefault(); c.scrollBy({ left: 60 }); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); c.scrollBy({ left: -60 }); }
  if (e.key === 'Home' && !e.shiftKey) { e.preventDefault(); D.v.currentPageNumber = 1; }
  if (e.key === 'End' && !e.shiftKey) { e.preventDefault(); D.v.currentPageNumber = D.doc.numPages; }
}
addEventListener('keydown', tasti);

// ---------- menu del documento aperto (punto 77) ----------
function menuAperto(ancora) {
  const s = D.scheda;
  menu(ancora, [
    { testo: 'Cerca nel testo', icona: 'lente', fai: cerca },
    { testo: 'Vai alla pagina', icona: 'vai', valore: D.v ? D.v.currentPageNumber + ' di ' + D.doc.numPages : '', fai: vaiAPagina },
    s.origine === 'vuoto' ? { testo: 'Aggiungi pagina', icona: 'piu', fai: aggiungiPagina } : null,
    { separatore: true },
    { testo: 'Rinomina', icona: 'rinomina', fai: rinominaAperto },
    { testo: 'Sposta in una cartella', icona: 'cartella', fai: () => sposta(s) },
    { testo: s.preferito ? 'Togli dai preferiti' : 'Aggiungi ai preferiti', icona: 'stella', fai: () => preferito(s) },
    { separatore: true },
    { testo: 'Condividi', icona: 'condividi', fai: condividiAperto },
    { testo: 'Salva una copia', icona: 'copia', fai: async () => { await D.strumenti?.salvaOra(); salvaCopia(s, D.password); } },
    { separatore: true },
    { testo: 'Dettagli', icona: 'dettagli', fai: () => dettagli(s) },
    { separatore: true },
    { testo: 'Sposta nel cestino', icona: 'cestino', pericolo: true, fai: () => spostaNelCestino(s, { dopo: () => indietro() }) }
  ], { titolo: s.nome });
}
async function condividiAperto() { await D.strumenti?.salvaOra(); condividi(D.scheda, D.password); }
async function rinominaAperto() { if (await rinomina(D.scheda)) { D.radice.querySelector('.titolo').textContent = D.scheda.nome; document.title = D.scheda.nome + ' - plico'; } }
async function aggiungiPagina() {   // solo per i documenti vuoti: si rigenera l'originale con una pagina in più (punto 134)
  const s = D.scheda, n = (D.doc?.numPages || s.pagine || 1) + 1;
  const bytes = pdfVuoto(n, s.stile || 'bianco'), base = new Blob([bytes], { type: 'application/pdf' });
  await D.strumenti?.salvaOra();
  await scrivi('basi', base, s.id);
  s.pagine = n; s.peso = base.size; s.impronta = await sha16(bytes); s.pagina = n;
  await salvaScheda(s);
  await apri(s.id, { ricarica: true });
  avviso('Pagina aggiunta');
}

// ---------- apertura e chiusura ----------
export async function apri(idd, { ricarica = false } = {}) {
  if (D.aperto && D.scheda?.id === idd && !ricarica) return;
  await chiudi({ silenzioso: ricarica });
  const s = L.docs.get(idd) || await leggi('documenti', idd);
  if (!s || s.rimosso) { avviso('Questo documento non c\'è più.'); vai('#libreria', { sostituisci: true }); return; }
  const base = await leggi('basi', idd);
  if (!base) { avviso('Il PDF di questo documento non è ancora su questo dispositivo. Arriverà con la sincronizzazione.', { durata: 6000 }); vai('#libreria', { sostituisci: true }); return; }
  D.scheda = s; D.segni = await segniDi(idd); D.aperto = true; D.miniDaRifare = false; D.password = null;
  const stretto = stretta();

  const contenitore = el('div.visore.lettura', { tabindex: '-1' }, el('div.pdfViewer'));
  const scriviBtn = el('button.tondo.scrivi', { type: 'button', 'aria-label': 'Scrivi', title: 'Scrivi', hidden: true, onclick: () => impostaStato('scrittura', { daUtente: true }) }, icona('penna'));   // compare a documento pronto
  const zona = el('div.zona', null, contenitore, scriviBtn, el('div.copertura', { testo: 'Apro il documento' }));
  const titoli = el('button.titoli', { type: 'button', title: 'Rinomina', onclick: rinominaAperto }, el('span.titolo', { testo: s.nome }), el('span.salvataggio'));
  const puntini = bottoneIcona('puntini', 'Altre azioni', e => menuAperto(e.currentTarget));
  const testa = el('header.testa-doc', null,
    bottoneIcona('indietro', 'Torna alla libreria', () => indietro()), titoli,
    el('button.indicatore', { type: 'button', onclick: vaiAPagina, testo: '- / -' }),
    bottoneIcona('lente', 'Cerca nel testo (Ctrl+F)', cerca, 'bi solo-largo'), bottoneIcona('condividi', 'Condividi il PDF con i segni', condividiAperto, 'bi solo-largo'), puntini);
  D.radice = el('div.documento', null, testa, zona);
  D.contenitore = contenitore;
  $('#app').replaceChildren(D.radice);
  document.title = s.nome + ' - plico';
  mostraSalvataggio(false);

  let pdf;
  try {
    pdf = await carica();
    const aperto = await apriDocumento(base, { chiediPassword: sbagliata => chiedi('Questo PDF è protetto', { tipo: 'password', etichetta: 'Password', ok: 'Apri', sotto: sbagliata ? 'Password non corretta. Riprova.' : 'plico non salva la password: la chiede a ogni apertura.' }) });
    if (D.scheda?.id !== idd) { aperto.compito.destroy(); return; }
    D.compito = aperto.compito; D.doc = aperto.doc; D.password = aperto.password();
  } catch (e) {
    if (D.scheda?.id !== idd) return;
    D.aperto = false; D.scheda = null;
    if (e?.name !== 'PasswordException' && !/destroy|Worker was/i.test(String(e?.message))) { console.error(e); avviso('Questo file non è un PDF leggibile.', { durata: 5000 }); }
    vai('#libreria', { sostituisci: true });
    return;
  }
  const { pdfjs, visore } = pdf;
  D.bus = new visore.EventBus();
  const link = new visore.PDFLinkService({ eventBus: D.bus, externalLinkTarget: visore.LinkTarget.BLANK, externalLinkRel: 'noopener noreferrer nofollow' });
  const trova = new visore.PDFFindController({ eventBus: D.bus, linkService: link });
  D.v = new visore.PDFViewer({ container: contenitore, viewer: contenitore.firstChild, eventBus: D.bus, linkService: link, findController: trova,
    textLayerMode: 1, annotationMode: pdfjs.AnnotationMode.ENABLE, annotationEditorMode: pdfjs.AnnotationEditorType.DISABLE, removePageBorders: true, maxCanvasPixels: 16777216 });
  link.setViewer(D.v);
  D.link = link; D.trova = trova;
  D.bus.on('pagesinit', () => {
    D.v.currentScaleValue = stretto ? 'page-width' : 'auto';
    const p = limita(s.pagina || 1, 1, D.doc.numPages);
    if (p > 1) D.v.currentPageNumber = p;
    aggiornaIndicatore();
    zona.querySelector('.copertura')?.remove();
  });
  D.bus.on('pagechanging', () => { aggiornaIndicatore(); salvaPosizione(); });
  D.bus.on('updatefindmatchescount', esitoRicerca);
  D.bus.on('updatefindcontrolstate', esitoRicerca);
  D.bus.on('pagerendered', e => D.strumenti?.paginaPronta(e));
  D.bus.on('scalechanging', () => D.strumenti?.scalaCambiata?.());
  D.v.setDocument(D.doc); link.setDocument(D.doc); trova.setDocument(D.doc);
  gestoLettura(contenitore); sentePenna(contenitore);
  D.strumenti?.prepara(zona);

  // se il numero di pagine non era noto (PDF protetto importato), ora lo è
  if (s.pagine !== D.doc.numPages) { s.pagine = D.doc.numPages; salvaScheda(s, { metadati: false }); }
  if (s.protetto && !(await leggi('miniature', s.id))) D.miniDaRifare = true;
  s.aperto = Date.now(); salvaScheda(s, { metadati: false });
  await impostaL('ultimoAperto', s.id);

  const inScrittura = L.apriInScrittura === s.id || (L.imp.haPenna && !L.imp.letturaScelta);
  L.apriInScrittura = null;
  await impostaStato(inScrittura ? 'scrittura' : 'lettura');
  emetti('documento:aperto', { id: s.id });
}

export async function chiudi({ silenzioso = false } = {}) {
  if (!D.aperto && !D.compito) return;
  const s = D.scheda, password = D.password;
  chiudiCerca();
  try { await D.strumenti?.chiudi(); } catch (e) { console.error(e); }
  salvaPosizione.subito();
  if (s && D.v) { s.pagina = D.v.currentPageNumber || s.pagina; s.aperto = Date.now(); try { await salvaScheda(s, { metadati: false }); } catch (e) { console.error(e); } }
  if (s && D.doc && D.miniDaRifare) {
    try { const m = await miniatura(D.doc, D.segni); if (m) { await scrivi('miniature', m, s.id); dimenticaMiniatura(s.id); } } catch (e) { console.error(e); }
  }
  const compito = D.compito;
  try { D.v?.setDocument(null); D.link?.setDocument(null); D.trova?.setDocument(null); } catch {}
  D.v = null; D.doc = null; D.compito = null; D.bus = null; D.aperto = false; D.scheda = null; D.segni = []; D.password = null; D.radice = null; D.contenitore = null;
  if (compito) { try { await compito.destroy(); } catch {} }
  if (s && !silenzioso) emetti('documento:chiuso', { id: s.id, password });
}
ascolta('libreria:cambiata', ({ doc } = {}) => {   // un cambio dalla sincronizzazione o da un menu: tieni aggiornato il titolo
  if (D.aperto && doc === D.scheda?.id && D.radice) { const t = D.radice.querySelector('.titolo'); if (t) t.textContent = D.scheda.nome; }
});
