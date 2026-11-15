// Pannello Pagine (2.2): miniature delle pagine e, per ogni PDF, aggiungi una pagina bianca, sposta, elimina.
// Le pagine si cambiano con doc.extractPages di pdf.js; i segni seguono le loro pagine. Annulla rimette tutto com'era.
import { el, sha16, ascolta } from './20-base.js';
import { icona, bottoneIcona, foglio, menu, avviso, conferma } from './25-interfaccia.js';
import { leggi, insieme, togliSegniDi } from './30-archivio.js';
import { pulito } from './36-segni.js';
import { disegnaSegni, precaricaImmagini } from './40-pdf.js';
import { pdfVuoto } from './41-vuoto.js';
import { salvaScheda } from './50-libreria.js';
import { D, apri } from './60-documento.js';

async function cambiaPagine(descrizione, infos, mappa, totale) {
  const s = D.scheda; if (!s || !D.doc) return false;
  await D.strumenti?.salvaOra();
  const prima = { base: await leggi('basi', s.id), segni: D.segni.map(pulito), pagine: s.pagine, peso: s.peso, impronta: s.impronta };
  let bytes;
  try { bytes = await D.doc.extractPages(infos); }
  catch (e) { console.error(e); avviso('plico non riesce a cambiare le pagine di questo PDF.', { durata: 5000 }); return false; }
  const base = new Blob([bytes], { type: 'application/pdf' }), ora = Date.now(), cambiati = [];
  for (const x of D.segni) {
    const n = mappa(x.pagina); if (n === x.pagina) continue;
    if (n < 0) { if (!x.eliminato) { x.eliminato = true; x.modificato = ora; cambiati.push(pulito(x)); } continue; }
    x.pagina = n; x.modificato = ora; cambiati.push(pulito(x));
  }
  s.pagine = totale; s.peso = base.size; s.impronta = await sha16(bytes);
  await insieme([{ archivio: 'basi', valore: base, chiave: s.id }, ...cambiati.map(v => ({ archivio: 'segni', valore: v }))]);
  await salvaScheda(s);
  const pagina = D.v?.currentPageNumber || 1;
  s.pagina = Math.min(pagina, totale);
  await apri(s.id, { ricarica: true });
  D.miniDaRifare = true;
  avviso(descrizione, { azione: { testo: 'Annulla', fai: async () => {
    s.pagine = prima.pagine; s.peso = prima.peso; s.impronta = prima.impronta;
    await togliSegniDi(s.id);
    await insieme([{ archivio: 'basi', valore: prima.base, chiave: s.id }, ...prima.segni.map(v => ({ archivio: 'segni', valore: { ...v, modificato: Date.now() } }))]);
    await salvaScheda(s); await apri(s.id, { ricarica: true }); D.miniDaRifare = true;
  } } });
  return true;
}
async function elimina(k) {
  const n = D.doc.numPages;
  if (n <= 1) { avviso('Un documento ha almeno una pagina.'); return; }
  const conSegni = D.segni.some(s => s.pagina === k && !s.eliminato);
  if (conSegni && !(await conferma('La pagina ' + (k + 1) + ' ha dei segni. Eliminarla insieme ai suoi segni?', { ok: 'Elimina' }))) return;
  await cambiaPagine('Pagina ' + (k + 1) + ' eliminata', [{ document: null, excludePages: [k] }], i => (i < k ? i : i === k ? -1 : i - 1), n - 1);
}
async function sposta(k, j) {
  const n = D.doc.numPages; if (j < 0 || j >= n || j === k) return;
  const ordine = Array.from({ length: n }, (_, i) => i); ordine.splice(k, 1); ordine.splice(j, 0, k);
  const pos = Array.from({ length: n }, (_, i) => ordine.indexOf(i));
  await cambiaPagine('Pagina spostata', [{ document: null, pageIndices: pos }], i => pos[i], n);
}
async function aggiungiDopo(k) {
  const n = D.doc.numPages, s = D.scheda, pg = await D.doc.getPage(k + 1), [x0, y0, x1, y1] = pg.view;
  const ruotata = pg.rotate % 180 !== 0, misura = ruotata ? [y1 - y0, x1 - x0] : [x1 - x0, y1 - y0];
  const bianca = pdfVuoto(1, s.origine === 'vuoto' ? (s.stile || 'bianco') : 'bianco', misura);
  await cambiaPagine('Pagina aggiunta', [{ document: null }, { document: bianca, insertAfter: k }], i => (i <= k ? i : i + 1), n + 1);
}

// miniature delle pagine, disegnate solo quando entrano in vista
async function disegnaMiniatura(cv, i) {
  try {
    const pg = await D.doc.getPage(i + 1), v1 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: 110 / v1.width });
    const d = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(vp.width * d); cv.height = Math.round(vp.height * d);
    cv.style.aspectRatio = vp.width + ' / ' + vp.height;
    const ctx = cv.getContext('2d', { alpha: false }); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, cv.width, cv.height);
    await pg.render({ canvasContext: ctx, canvas: cv, viewport: vp, transform: [d, 0, 0, d, 0, 0] }).promise;
    const segni = D.segni.filter(s => s.pagina === i && !s.eliminato);
    await precaricaImmagini(segni);
    disegnaSegni(ctx, segni, vp, d, d, { miscela: true });
  } catch (e) { /* il documento è stato chiuso */ }
}
export function apriPannello() {
  if (!D.aperto || !D.doc) return;
  const n = D.doc.numPages, attuale = (D.v?.currentPageNumber || 1) - 1;
  let f;
  const fai = azione => async () => { f.chiudi(); if (await azione()) {} if (D.aperto) setTimeout(apriPannello, 60); };
  const osserva = new IntersectionObserver(voci => { for (const v of voci) if (v.isIntersecting) { osserva.unobserve(v.target); disegnaMiniatura(v.target, Number(v.target.dataset.i)); } }, { rootMargin: '200px' });
  const griglia = el('div.griglia-pagine', { role: 'list' });
  for (let i = 0; i < n; i++) {
    const cv = el('canvas.mini-pagina', { 'data-i': String(i), 'aria-hidden': 'true' });
    const apriQui = el('button.vai-pagina', { type: 'button', 'aria-label': 'Vai alla pagina ' + (i + 1), 'aria-current': i === attuale ? 'page' : null, onclick: () => { f.chiudi(); D.v.currentPageNumber = i + 1; } }, cv);
    const azioni = el('div.azioni-pagina', null,
      bottoneIcona('indietro', 'Sposta prima', fai(() => sposta(i, i - 1)), 'bi'),
      el('span.mono', { testo: String(i + 1) }),
      bottoneIcona('avanti', 'Sposta dopo', fai(() => sposta(i, i + 1)), 'bi'),
      bottoneIcona('puntini', 'Azioni per la pagina ' + (i + 1), e => menu(e.currentTarget, [
        { testo: 'Aggiungi pagina bianca dopo', icona: 'piu', fai: fai(() => aggiungiDopo(i)) },
        { separatore: true },
        { testo: 'Elimina la pagina', icona: 'cestino', pericolo: true, fai: fai(() => elimina(i)) }], { titolo: 'Pagina ' + (i + 1) }), 'bi'));
    if (i === 0) azioni.firstChild.disabled = true;
    if (i === n - 1) azioni.children[2].disabled = true;
    griglia.append(el('div.tessera-pagina', { role: 'listitem' }, apriQui, azioni));
    osserva.observe(cv);
  }
  f = foglio({ titolo: 'Pagine', sotto: n === 1 ? '1 pagina' : n + ' pagine', contenuto: griglia, classe: 'foglio-pagine', alChiudere: () => osserva.disconnect(),
    azioni: [{ testo: 'Aggiungi pagina bianca alla fine', fai: fai(() => aggiungiDopo(n - 1)) }, { testo: 'Chiudi', primario: true, fai: c => c() }] });
  setTimeout(() => griglia.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'center' }), 50);
}
ascolta('azione:pagine', apriPannello);
