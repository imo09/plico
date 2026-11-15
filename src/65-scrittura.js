// Scrittura: tele sopra le pagine, ingressi (penna, dito, mouse), strumenti, annulla, salvataggio dei segni.
// Testo, Seleziona, evidenziatore agganciato al testo, firma e immagini stanno in 66-strumenti.js e si registrano in EXTRA.
import { el, limita, stretta, rimanda, id as nuovoId, scarica, nomePulito, ascolta } from './20-base.js';
import { icona, bottoneIcona, avviso, striscia, interruttore, livelliAperti, menu } from './25-interfaccia.js';
import { insieme } from './30-archivio.js';
import { getStroke } from './35-freehand.js';
import { poligonoDi, toccaTratto, linea, arrotonda, pulito, forma } from './36-segni.js';
import { disegnaSegni, fileDi } from './40-pdf.js';
import { L, salvaScheda, impostaL } from './50-libreria.js';
import { D, impostaStato, mostraSalvataggio, vistaPagina, toccoDoppio } from './60-documento.js';

export const COLORI_PENNA = [['#0E1D2A', 'Inchiostro'], ['#2E5E9E', 'Blu'], ['#B4544A', 'Ruggine'], ['#2F9184', 'Verderame'], ['#71879A', 'Acciaio'], ['#C99A4E', 'Ottone']];
export const COLORI_EVID = [['#F5DE8C', 'Giallo'], ['#BFE3CF', 'Verde'], ['#F3C4BE', 'Rosa'], ['#BFDCEB', 'Azzurro']];
export const SPESSORI = { penna: [1.2, 1.8, 2.6, 3.6, 4.8], evidenziatore: [8, 11, 14, 19, 24] };
export const CORPI = [8, 10, 12, 16, 24];
export const FORME = [['linea', 'Linea'], ['freccia', 'Freccia'], ['rettangolo', 'Rettangolo'], ['ellisse', 'Ellisse']];
export const NOMI = { penna: 'Penna', evidenziatore: 'Evidenziatore', gomma: 'Gomma', forma: 'Forme', testo: 'Testo', seleziona: 'Seleziona' };
const TASTI = { penna: 'P', evidenziatore: 'E', gomma: 'G', forma: 'F', testo: 'T', seleziona: 'S' };
const ICONE = { penna: 'penna', evidenziatore: 'evidenziatore', gomma: 'gomma', forma: 'forme', testo: 'testo', seleziona: 'seleziona' };
const SPIEGA = {
  penna: 'Il tratto segue la pressione della penna.',
  evidenziatore: 'Il colore resta sotto il testo. Se parti da una parola, segue il testo.',
  gomma: 'Cancella il segno intero che tocca. Con la S Pen basta tenere premuto il tasto laterale.',
  forma: 'Trascina per tracciare la forma.',
  testo: 'Tocca la pagina e scrivi. Tocca un testo per correggerlo; trascina la maniglia per spostarlo.',
  seleziona: 'Tocca un segno o trascina un riquadro intorno ai segni. Poi spostali, ridimensionali dagli angoli, cambia colore, copiali o eliminali.'
};
export const nomeColore = h => [...COLORI_PENNA, ...COLORI_EVID].find(c => c[0] === h)?.[1] || h;
export const EXTRA = {};   // strumenti registrati da 66-strumenti.js: testo, seleziona, evidenziaTesto, inserisci

export const S = { attivo: false, tele: new Map(), viva: null, cv: null, zona: null, barra: null, opzioni: null, tratto: null, puntatori: new Map(),
  ultimaPenna: -1e9, pennaGiu: false, fatti: [], rifatti: [], daSalvare: new Map(), gesto: null, mano: null, inerzia: 0, errore: null };

// ---------- impostazioni degli strumenti ----------
export const strumento = () => L.imp.strumento || 'penna';
export const chiaveColore = (st = strumento()) => (st === 'evidenziatore' ? 'evidenziatore' : st === 'testo' ? 'testo' : 'penna');
export const colori = () => ({ penna: '#2E5E9E', evidenziatore: '#F5DE8C', testo: '#0E1D2A', ...(L.imp.colori || {}) });
const recenti = () => ({ penna: ['#2E5E9E', '#B4544A', '#0E1D2A'], evidenziatore: ['#F5DE8C', '#BFE3CF', '#F3C4BE'], testo: ['#0E1D2A', '#2E5E9E', '#B4544A'], ...(L.imp.coloriRecenti || {}) });
export const spessori = () => ({ penna: 1.8, evidenziatore: 14, ...(L.imp.spessori || {}) });
export const corpo = () => L.imp.corpo || 12;
export async function scegliStrumento(n) {
  if (strumento() !== n) EXTRA[strumento()]?.lascia?.();
  await impostaL('strumento', n); disegnaBarra(); if (S.opzioni) chiudiOpzioni();
}
export async function scegliColore(hex) {
  if (strumento() === 'gomma') await impostaL('strumento', 'penna');
  if (EXTRA[strumento()]?.colore?.(hex)) { disegnaBarra(); if (S.opzioni) apriOpzioni(); return; }
  const k = chiaveColore(), c = colori(), r = recenti();
  c[k] = hex; r[k] = [hex, ...(r[k] || []).filter(x => x !== hex)].slice(0, 3);
  await impostaL('colori', c); await impostaL('coloriRecenti', r);
  EXTRA[strumento()]?.cambiato?.();
  disegnaBarra(); if (S.opzioni) apriOpzioni();
}
async function scegliSpessore(v) { const k = chiaveColore(), s = spessori(); s[k === 'evidenziatore' ? 'evidenziatore' : 'penna'] = v; await impostaL('spessori', s); disegnaBarra(); if (S.opzioni) apriOpzioni(); }

// ---------- tele (punti 135-137, 135b; revisione 3: solo le pagine in vista) ----------
// al massimo 3 pagine con le tele e 8 milioni di pixel per tela: sul tablet la memoria grafica resta sotto i 100 MB circa
const MAX_PIXEL = 8388608, MAX_PAGINE = 3;
function crea(classe) { return el('canvas.tela.' + classe, { 'aria-hidden': 'true', style: { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'none' } }); }
function libera(t) { for (const c of [t.penna, t.ev]) if (c) { c.width = c.height = 0; c.remove(); } }
const segniPagina = i => D.segni.filter(s => s.pagina === i && !s.eliminato);
export function pagineInVista() {   // indici (da 0) delle pagine visibili, le più vicine al centro per prime
  if (!D.v || !D.contenitore) return [];
  const c = D.contenitore.getBoundingClientRect(), centro = (c.top + c.bottom) / 2, n = D.doc?.numPages || 0, cur = (D.v.currentPageNumber || 1) - 1, out = [];
  for (let i = Math.max(0, cur - 3); i < Math.min(n, cur + 4); i++) {
    const r = vistaPagina(i)?.div?.getBoundingClientRect(); if (!r) continue;
    if (r.bottom > c.top && r.top < c.bottom && r.right > c.left && r.left < c.right) out.push([i, Math.abs((r.top + r.bottom) / 2 - centro)]);
  }
  return out.sort((a, b) => a[1] - b[1]).slice(0, MAX_PAGINE).map(x => x[0]);
}
export function telaDi(i, crea_ = true) {
  const pv = vistaPagina(i); if (!pv?.div) return null;
  const wrap = pv.div.querySelector('.canvasWrapper'); if (!wrap) return null;
  let t = S.tele.get(i);
  if (!t || t.penna.parentNode !== wrap) {
    if (t) libera(t);
    if (!crea_) { S.tele.delete(i); return null; }
    t = { penna: crea('tela-penna'), ev: null, w: 0, h: 0 }; wrap.append(t.penna); S.tele.set(i, t);
  }
  const vp = pv.viewport, k = Math.min(devicePixelRatio || 1, Math.sqrt(MAX_PIXEL / (vp.width * vp.height)));
  const w = Math.max(1, Math.floor(vp.width * k)), h = Math.max(1, Math.floor(vp.height * k));
  t.vp = vp;
  if (t.w !== w || t.h !== h) { t.w = w; t.h = h; t.penna.width = w; t.penna.height = h; if (t.ev) { t.ev.width = w; t.ev.height = h; } t.sporca = true; }
  return t;
}
function evDi(t) {
  if (!t.ev) { t.ev = crea('tela-ev'); t.ev.style.mixBlendMode = 'multiply'; t.ev.width = t.w; t.ev.height = t.h; t.penna.before(t.ev); }
  return t.ev;
}
export function ridisegnaPagina(i) {
  if (!S.tele.has(i) && !pagineInVista().includes(i)) return;   // pagina fuori vista: si disegnerà quando torna
  const t = telaDi(i); if (!t) return;
  const lista = segniPagina(i), conEv = lista.some(s => s.strumento === 'evidenziatore' || s.tipo === 'evidenzia');
  const cp = t.penna.getContext('2d'); cp.setTransform(1, 0, 0, 1, 0, 0); cp.clearRect(0, 0, t.w, t.h);
  disegnaSegni(cp, lista, t.vp, t.w / t.vp.width, t.h / t.vp.height, { evidenziatori: false });
  if (conEv || t.ev) {
    const ce = evDi(t).getContext('2d'); ce.setTransform(1, 0, 0, 1, 0, 0); ce.clearRect(0, 0, t.w, t.h);
    disegnaSegni(ce, lista, t.vp, t.w / t.vp.width, t.h / t.vp.height, { penne: false });
  }
  t.sporca = false;
}
function aggiungiSuPagina(s) {   // disegna un segno nuovo senza ridisegnare tutta la pagina
  const t = telaDi(s.pagina); if (!t) return;
  if (t.sporca || s.tipo !== 'tratto') { ridisegnaPagina(s.pagina); return; }
  const ev = s.strumento === 'evidenziatore';
  disegnaSegni((ev ? evDi(t) : t.penna).getContext('2d'), [s], t.vp, t.w / t.vp.width, t.h / t.vp.height, { evidenziatori: ev, penne: !ev });
}
export function aggiornaTele() {   // crea le tele delle pagine in vista, libera tutte le altre
  if (!D.aperto) return;
  const vista = new Set(pagineInVista());
  for (const [i, t] of S.tele) if (!vista.has(i) || !t.penna.isConnected) { libera(t); S.tele.delete(i); }
  for (const i of vista) { const prima = S.tele.get(i); const t = telaDi(i); if (t && (t !== prima || t.sporca)) ridisegnaPagina(i); }
  EXTRA.seleziona?.posiziona?.(); EXTRA.testo?.posiziona?.();
}
let rafTele = 0;
const aggiornaTeleDopo = () => { if (!rafTele) rafTele = requestAnimationFrame(() => { rafTele = 0; aggiornaTele(); }); };
ascolta('immagine:pronta', () => { for (const i of S.tele.keys()) ridisegnaPagina(i); });

// ---------- tela viva: il tratto in corso (punto 138; revisione 3: senza "desynchronized", che su Android può mostrare nero) ----------
function misuraViva() {
  if (!S.viva || !S.zona) return;
  const d = Math.min(2, devicePixelRatio || 1), w = S.zona.clientWidth, h = S.zona.clientHeight;
  S.viva.style.width = w + 'px'; S.viva.style.height = h + 'px';
  S.viva.width = Math.round(w * d); S.viva.height = Math.round(h * d); S.dViva = d;
}
export function pulisciViva() { if (S.cv) { S.cv.setTransform(1, 0, 0, 1, 0, 0); S.cv.clearRect(0, 0, S.viva.width, S.viva.height); } }
// prepara il contesto della tela viva per disegnare in punti PDF sulla pagina i (con ritaglio ai bordi della pagina)
export function contestoViva(wrap, vp) {
  const r = wrap.getBoundingClientRect(), z = S.zona.getBoundingClientRect(), d = S.dViva || 1, c = S.cv;
  c.save(); c.setTransform(d, 0, 0, d, 0, 0);
  c.beginPath(); c.rect(r.left - z.left, r.top - z.top, r.width, r.height); c.clip();
  c.translate(r.left - z.left, r.top - z.top); c.scale(r.width / vp.width, r.height / vp.height); c.transform(...vp.transform);
  return c;
}
export function riempiViva(c, s, alfa = 1) {
  const p = poligonoDi(s, getStroke); if (p.length < 6) return;
  c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath();
  c.globalAlpha = alfa; c.fillStyle = s.colore; c.fill(); c.globalAlpha = 1;
}
let rafViva = 0;
function disegnaViva() {
  if (rafViva) return;
  rafViva = requestAnimationFrame(() => {
    rafViva = 0; pulisciViva();
    const t = S.tratto; if (!t || t.gomma || t.punti.length < 3) return;
    const c = contestoViva(t.wrap, t.vp);
    riempiViva(c, { strumento: t.strumento, spessore: t.spessore, scala: t.scala, colore: t.colore, punti: new Float32Array(t.punti) }, t.strumento === 'evidenziatore' ? 0.6 : 1);
    c.restore();
  });
}

// ---------- ingressi (punti 61-66, 140-142) ----------
const pennaVicina = () => S.pennaGiu || performance.now() - S.ultimaPenna < 700;
const scriveIlDito = () => !L.imp.haPenna || !!L.imp.dito;
function gommaPremuta(e) { return (e.buttons & 32) === 32 || e.button === 5 || (e.pointerType === 'pen' && (e.buttons & 2) === 2); }
export function paginaSotto(x, y) {
  const n = document.elementFromPoint(x, y)?.closest?.('.page');
  if (!n || !D.contenitore.contains(n)) return null;
  const i = Number(n.dataset.pageNumber) - 1, pv = vistaPagina(i);
  const wrap = n.querySelector('.canvasWrapper');
  return pv && wrap ? { i, pv, wrap, vp: pv.viewport } : null;
}
export function inPdf(t, x, y) {   // punto dello schermo -> punti PDF della pagina (t: { wrap, vp })
  const r = t.wrap.getBoundingClientRect();
  return t.vp.convertToPdfPoint((x - r.left) * t.vp.width / r.width, (y - r.top) * t.vp.height / r.height);
}
export function suSchermo(i, x, y) {   // punti PDF della pagina i -> coordinate rispetto alla zona del documento
  const pv = vistaPagina(i), wrap = pv?.div?.querySelector('.canvasWrapper'); if (!wrap) return null;
  const r = wrap.getBoundingClientRect(), z = S.zona.getBoundingClientRect(), [vx, vy] = pv.viewport.convertToViewportPoint(x, y);
  return [r.left - z.left + vx * r.width / pv.viewport.width, r.top - z.top + vy * r.height / pv.viewport.height];
}
export const pxPerPunto = t => t.wrap.getBoundingClientRect().width / (t.vp.width / t.vp.scale);

function iniziaTratto(e) {
  const p = paginaSotto(e.clientX, e.clientY); if (!p) return;
  const st = gommaPremuta(e) ? 'gomma' : strumento();
  telaDi(p.i);
  if (st === 'evidenziatore' && L.imp.agganciaTesto !== false && EXTRA.evidenziaTesto?.prova(e, p)) { S.tratto = { id: e.pointerId, esterno: EXTRA.evidenziaTesto }; catturaPuntatore(e); return; }
  const k = st === 'evidenziatore' ? 'evidenziatore' : 'penna';
  const t = { id: e.pointerId, tipo: e.pointerType, pagina: p.i, wrap: p.wrap, vp: p.vp, scala: p.vp.scale, gomma: st === 'gomma', strumento: st,
    colore: colori()[k], spessore: spessori()[k], punti: [], ultimo: null, tolti: [], fermo: null, timer: 0, dritto: false };
  if (st === 'forma') { t.forma = L.imp.forma || 'rettangolo'; t.inizio = inPdf(t, e.clientX, e.clientY); }
  S.tratto = t;
  catturaPuntatore(e);
  if (t.gomma) cancellaVerso(t, e.clientX, e.clientY);
  else if (st === 'forma') aggiornaForma(t, e);
  else aggiungiPunto(t, e, true);
}
function catturaPuntatore(e) { try { D.contenitore.setPointerCapture(e.pointerId); } catch {} }
function aggiornaForma(t, e) {
  const fine = inPdf(t, e.clientX, e.clientY);
  t.punti = Array.from(forma(t.forma, t.inizio, fine, 2 / pxPerPunto(t) * 2));
  t.fine = fine;
}
function pressione(t, e, primo, distanza) {
  if (t.tipo === 'pen') return Math.max(0.05, Math.min(1, e.pressure || 0.5));
  return primo ? 0.55 : limita(0.8 - distanza / 40, 0.3, 0.8);
}
function aggiungiPunto(t, e, primo = false) {
  const x = e.clientX, y = e.clientY;
  const dist = t.ultimo ? Math.hypot(x - t.ultimo[0], y - t.ultimo[1]) : 0;
  if (!primo && dist < 0.8) return;
  const [px, py] = inPdf(t, x, y);
  if (t.dritto) { t.punti = Array.from(linea([t.punti[0], t.punti[1]], [px, py], t.pDritta)); t.ultimo = [x, y]; return; }   // raddrizzato: la retta segue la punta
  t.punti.push(Math.round(px * 100) / 100, Math.round(py * 100) / 100, pressione(t, e, primo, dist));
  t.ultimo = [x, y];
  if (t.strumento === 'penna' && L.imp.raddrizza !== false) {   // punto 73
    if (!t.fermo || Math.hypot(x - t.fermo[0], y - t.fermo[1]) >= 3) {
      t.fermo = [x, y]; clearTimeout(t.timer);
      t.timer = setTimeout(() => raddrizza(t), 600);
    }
  }
}
function raddrizza(t) {
  if (S.tratto !== t || t.punti.length / 3 < 7) return;
  const n = t.punti.length / 3, ps = []; for (let i = 0; i < n; i++) ps.push(t.punti[3 * i + 2]);
  ps.sort((a, b) => a - b);
  t.pDritta = ps[Math.floor(n / 2)];
  const fine = [t.punti[3 * (n - 1)], t.punti[3 * (n - 1) + 1]];
  t.punti = Array.from(linea([t.punti[0], t.punti[1]], fine, t.pDritta));
  t.dritto = true; disegnaViva();
}
function cancellaVerso(t, x, y) {
  const [px, py] = inPdf(t, x, y), da = t.ultimoPdf || [px, py];
  const raggio = 12 / pxPerPunto(t);
  let cambiato = false;
  for (const s of D.segni) if (s.pagina === t.pagina && !s.eliminato && toccaTratto(s, da[0], da[1], px, py, raggio)) {
    s.eliminato = true; s.modificato = Date.now(); t.tolti.push(s); cambiato = true;
  }
  t.ultimoPdf = [px, py];
  if (cambiato) { ridisegnaPagina(t.pagina); if (t.pagina === 0) D.miniDaRifare = true; }
}
// nuovo segno del documento aperto, con id, chiave e data
export function nuovoSegno(campi) {
  const idd = nuovoId(), doc = D.scheda.id;
  return { id: idd, doc, chiave: doc + ':' + idd, modificato: Date.now(), eliminato: false, ...campi };
}
// aggiunge segni al documento: disegno, annulla, salvataggio
export function aggiungiSegni(nuovi, tolti = []) {
  const ora = Date.now();
  for (const s of tolti) { s.eliminato = true; s.modificato = ora; }
  D.segni.push(...nuovi);
  const pagine = new Set([...nuovi, ...tolti].map(s => s.pagina));
  if (!tolti.length && nuovi.length === 1) aggiungiSuPagina(nuovi[0]); else for (const p of pagine) ridisegnaPagina(p);
  if (pagine.has(0)) D.miniDaRifare = true;
  registra({ aggiunti: nuovi, tolti });
  daSalvare([...nuovi, ...tolti]);
}
function chiudiTratto(annullato = false) {
  const t = S.tratto; if (!t) return;
  S.tratto = null; clearTimeout(t.timer);
  if (t.esterno) { t.esterno.su(annullato); return; }
  pulisciViva();
  if (t.gomma) { if (t.tolti.length) { registra({ aggiunti: [], tolti: t.tolti }); daSalvare(t.tolti); } return; }
  if (annullato || !t.punti.length) return;
  let punti = t.punti;
  if (t.strumento === 'forma') {
    if (!t.fine || Math.hypot(t.fine[0] - t.inizio[0], t.fine[1] - t.inizio[1]) * pxPerPunto(t) < 6) return;   // tocco senza trascinare: nessuna forma
  }
  if (t.strumento === 'evidenziatore' && L.imp.lineaDritta !== false && punti.length >= 6) {   // punto 74
    const k = pxPerPunto(t); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, sy = 0; const n = punti.length / 3;
    for (let i = 0; i < n; i++) { const x = punti[3 * i], y = punti[3 * i + 1]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); sy += y; }
    if ((y1 - y0) * k < 18 && (x1 - x0) * k > 30) punti = Array.from(linea([x0, sy / n], [x1, sy / n], 0.5));
  }
  const s = nuovoSegno({ tipo: 'tratto', pagina: t.pagina, strumento: t.strumento, colore: t.colore, spessore: t.spessore, scala: Math.round(t.scala * 10000) / 10000, punti: arrotonda(new Float32Array(punti)) });
  if (t.strumento === 'forma') s.forma = t.forma;
  aggiungiSegni([s]);
}

function giu(e) {
  if (!S.attivo || !D.aperto) return;
  if (e.pointerType === 'pen') {
    S.ultimaPenna = performance.now(); S.pennaGiu = true;
    if (!L.imp.haPenna) impostaL('haPenna', true).then(disegnaBarra);   // plico ha visto una penna (punto 58)
  }
  if (S.opzioni) chiudiOpzioni();
  if (e.pointerType === 'touch') {
    if (pennaVicina()) { e.preventDefault(); return; }                         // palmo (punto 64)
    S.puntatori.set(e.pointerId, { x: e.clientX, y: e.clientY });
    fermaInerzia();
    if (S.puntatori.size >= 2) {                                               // due dita: ingrandiscono e spostano
      if (S.tratto && S.tratto.tipo === 'touch') chiudiTratto(true);
      if (S.tratto?.esterno) chiudiTratto(true);
      EXTRA[strumento()]?.annullaGesto?.();
      S.mano = null; iniziaGesto(); return;
    }
    if (!scriveIlDito()) { iniziaMano(e); return; }
  }
  if (e.pointerType === 'mouse' && e.button === 1) { e.preventDefault(); iniziaMano(e); return; }
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (S.tratto) return;
  const ex = EXTRA[strumento()];
  if (ex?.giu && !gommaPremuta(e)) { e.preventDefault(); if (ex.giu(e) !== false) catturaPuntatore(e); return; }
  e.preventDefault();
  iniziaTratto(e);
}
function muovi(e) {
  if (e.pointerType === 'pen') S.ultimaPenna = performance.now();
  if (!S.attivo) return;
  if (S.puntatori.has(e.pointerId)) { S.puntatori.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (S.gesto) { muoviGesto(); return; } }
  if (S.mano && S.mano.id === e.pointerId) { muoviMano(e); return; }
  const ex = EXTRA[strumento()];
  if (ex?.inCorso?.(e.pointerId)) { ex.muovi(e); return; }
  const t = S.tratto; if (!t || t.id !== e.pointerId) return;
  if (t.esterno) { t.esterno.muovi(e); return; }
  const lista = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
  if (!t.gomma && gommaPremuta(e)) { chiudiTratto(); iniziaTratto(e); return; }   // tasto premuto a metà tratto: da qui si cancella
  if (t.strumento === 'forma') { aggiornaForma(t, e); disegnaViva(); return; }
  for (const c of (lista.length ? lista : [e])) { if (t.gomma) cancellaVerso(t, c.clientX, c.clientY); else aggiungiPunto(t, c); }
  if (!t.gomma) disegnaViva();
}
function su(e) {
  if (e.pointerType === 'pen') { S.ultimaPenna = performance.now(); S.pennaGiu = false; }
  if (S.puntatori.delete(e.pointerId)) { if (S.puntatori.size < 2 && S.gesto) fineGesto(); }
  if (S.mano && S.mano.id === e.pointerId) { lasciaMano(e); return; }
  const ex = EXTRA[strumento()];
  if (ex?.inCorso?.(e.pointerId)) { ex.su(e); return; }
  if (S.tratto && S.tratto.id === e.pointerId) chiudiTratto(e.type === 'pointercancel' && (S.tratto.punti?.length || 0) < 6);
}
// dito che scorre in Scrittura, con inerzia (punto 141); tasto centrale del mouse; doppio tocco per ingrandire
export function iniziaMano(e) { S.mano = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), tipo: e.pointerType, campioni: [[performance.now(), e.clientX, e.clientY]] }; D.contenitore.classList.add('trascina-mano'); catturaPuntatore(e); }
function muoviMano(e) {
  const m = S.mano; D.contenitore.scrollBy(m.x - e.clientX, m.y - e.clientY); m.x = e.clientX; m.y = e.clientY;
  const ora = performance.now(); m.campioni.push([ora, e.clientX, e.clientY]); while (m.campioni.length > 2 && ora - m.campioni[0][0] > 100) m.campioni.shift();
}
function lasciaMano() {
  const m = S.mano; S.mano = null; D.contenitore.classList.remove('trascina-mano');
  if (!m) return;
  if (m.tipo === 'touch' && performance.now() - m.t0 < 250 && Math.hypot(m.x - m.x0, m.y - m.y0) < 10) { toccoDoppio(m.x0, m.y0); return; }
  if (m.campioni.length < 2) return;
  const a = m.campioni[0], b = m.campioni[m.campioni.length - 1], dt = b[0] - a[0]; if (dt <= 0) return;
  let vx = (a[1] - b[1]) / dt, vy = (a[2] - b[2]) / dt;
  if (Math.hypot(vx, vy) < 0.3) return;
  let prima = performance.now();
  const passo = ora => {
    const d = ora - prima; prima = ora;
    D.contenitore?.scrollBy(vx * d, vy * d); vx *= 0.95; vy *= 0.95;
    S.inerzia = Math.hypot(vx, vy) > 0.02 && D.contenitore ? requestAnimationFrame(passo) : 0;
  };
  S.inerzia = requestAnimationFrame(passo);
}
function fermaInerzia() { if (S.inerzia) cancelAnimationFrame(S.inerzia); S.inerzia = 0; }
function iniziaGesto() {
  const [a, b] = [...S.puntatori.values()];
  S.gesto = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: D.v.currentScale, c: [(a.x + b.x) / 2, (a.y + b.y) / 2], c0: [(a.x + b.x) / 2, (a.y + b.y) / 2], t0: performance.now(), mosso: 0, zoom: false };
}
function muoviGesto() {
  const g = S.gesto, [a, b] = [...S.puntatori.values()]; if (!g || !b) return;
  const c = [(a.x + b.x) / 2, (a.y + b.y) / 2], pan = [c[0] - g.c[0], c[1] - g.c[1]]; g.c = c;
  g.mosso = Math.max(g.mosso, Math.hypot(c[0] - g.c0[0], c[1] - g.c0[1]));
  const rapporto = Math.hypot(a.x - b.x, a.y - b.y) / g.d0, obiettivo = limita(g.s0 * rapporto, 0.5, 5);
  if (Math.abs(rapporto - 1) > 0.04) g.zoom = true;
  if (g.zoom && Math.abs(obiettivo - D.v.currentScale) >= 0.01) D.v.updateScale({ scaleFactor: obiettivo / D.v.currentScale, origin: c, drawingDelay: 400, pan });
  else if (g.mosso > 6) D.contenitore.scrollBy(-pan[0], -pan[1]);
}
function fineGesto() {   // tocco con due dita: annulla (2.2)
  const g = S.gesto; S.gesto = null;
  if (g && !g.zoom && g.mosso < 12 && performance.now() - g.t0 < 300 && S.fatti.length) { annulla(); avviso('Annullato'); }
}
function sopra(e) { if (e.pointerType === 'pen') S.ultimaPenna = performance.now(); }

// ---------- annulla e ripeti (punto 145) ----------
export function registra(op) { S.fatti.push(op); if (S.fatti.length > 200) S.fatti.shift(); S.rifatti = []; disegnaBarra(); }
function applica(op, verso) {
  const ora = Date.now(), pagine = new Set(), cambiati = [];
  for (const s of op.aggiunti) { s.eliminato = verso < 0; s.modificato = ora; pagine.add(s.pagina); cambiati.push(s); }
  for (const s of op.tolti) { s.eliminato = verso > 0; s.modificato = ora; pagine.add(s.pagina); cambiati.push(s); }
  for (const p of pagine) { ridisegnaPagina(p); if (p === 0) D.miniDaRifare = true; }
  EXTRA.seleziona?.svuota?.();
  daSalvare(cambiati); disegnaBarra();
}
export function annulla() { const op = S.fatti.pop(); if (!op) return; S.rifatti.push(op); applica(op, -1); }
export function ripeti() { const op = S.rifatti.pop(); if (!op) return; S.fatti.push(op); applica(op, 1); }
function cancellaPagina() {
  const i = (D.v?.currentPageNumber || 1) - 1, lista = segniPagina(i);
  chiudiOpzioni();
  if (!lista.length) { avviso('Questa pagina non ha segni.'); return; }
  const ora = Date.now(); for (const s of lista) { s.eliminato = true; s.modificato = ora; }
  ridisegnaPagina(i); if (i === 0) D.miniDaRifare = true;
  registra({ aggiunti: [], tolti: lista }); daSalvare(lista);
  avviso('Segni della pagina cancellati', { azione: { testo: 'Annulla', fai: annulla } });
}

// ---------- salvataggio (punto 146) ----------
export function daSalvare(lista) { for (const s of lista) S.daSalvare.set(s.chiave, s); mostraSalvataggio(true); salvaDopo(); }
const salvaDopo = rimanda(() => salvaOra(), 300);
let inCorso = null;
export async function salvaOra() {
  if (inCorso) await inCorso;
  if (!S.daSalvare.size || !D.scheda) return;
  const lista = [...S.daSalvare.values()], scheda = D.scheda; S.daSalvare.clear();
  inCorso = (async () => {
    try {
      await insieme(lista.map(s => ({ archivio: 'segni', valore: pulito(s) })));
      scheda.segniModificato = Date.now();
      scheda.conSegni = D.segni.some(s => !s.eliminato);
      await salvaScheda(scheda, { metadati: false });
      if (S.errore) { S.errore(); S.errore = null; }
      if (!S.daSalvare.size) mostraSalvataggio(false);
    } catch (e) {
      console.error(e);
      for (const s of lista) if (!S.daSalvare.has(s.chiave)) S.daSalvare.set(s.chiave, s);
      if (!S.errore) S.errore = striscia('plico non riesce a salvare su questo dispositivo. I segni restano finché tieni aperta questa pagina.', [
        { testo: 'Salva una copia', fai: async () => { try { const b = await fileDi(scheda, { password: D.password, segni: D.segni }); scarica(b, nomePulito(scheda.nome) + '.pdf'); avviso('Copia salvata'); } catch (x) { avviso('Non è stato possibile preparare la copia.'); } } },
        { testo: 'Riprova', fai: () => salvaOra() }]);
    }
  })();
  await inCorso; inCorso = null;
}
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { EXTRA.testo?.conferma?.(); salvaDopo.subito() || salvaOra(); } });
addEventListener('pagehide', () => { salvaOra(); });

// ---------- barra degli strumenti (punto 68) e opzioni (punti 69-72) ----------
const PRINCIPALI = ['penna', 'evidenziatore', 'gomma'], ALTRI = ['forma', 'testo', 'seleziona'];
function menuAltri(ancora) {
  menu(ancora, [
    ...ALTRI.map(n => ({ testo: NOMI[n], icona: ICONE[n], valore: TASTI[n], fai: () => scegliStrumento(n) })),
    { separatore: true },
    { testo: 'Immagine', icona: 'immagine', fai: () => EXTRA.inserisci?.immagine() },
    { testo: 'Firma', icona: 'firma', fai: () => EXTRA.inserisci?.firma() }
  ], { titolo: 'Altri strumenti' });
}
export function disegnaBarra() {
  const b = S.barra; if (!b) return;
  const stretto = stretta(), st = strumento(), k = chiaveColore(), attuale = colori()[k];
  b.classList.toggle('sinistra', L.imp.latoBarra === 'sinistra');
  const strum = n => el('button.strumento', { type: 'button', 'aria-label': NOMI[n], title: NOMI[n] + ' (' + TASTI[n] + ')', 'aria-pressed': String(st === n),
    onclick: () => (st === n ? (S.opzioni ? chiudiOpzioni() : apriOpzioni()) : scegliStrumento(n)) }, icona(ICONE[n]));
  const sep = () => el('span.sep', { 'aria-hidden': 'true' });
  const figli = [];
  if (L.imp.haPenna) figli.push(el('button.strumento.dito', { type: 'button', 'aria-label': 'Scrivi con il dito', title: 'Scrivi con il dito', 'aria-pressed': String(!!L.imp.dito),
    onclick: async () => { await impostaL('dito', !L.imp.dito); disegnaBarra(); avviso(L.imp.dito ? 'Ora il dito scrive, due dita scorrono' : 'Ora il dito scorre'); } }, icona('dito')), sep());
  figli.push(...PRINCIPALI.map(strum));
  if (stretto) {   // sul telefono: uno spazio per gli altri strumenti
    const altro = ALTRI.includes(st);
    figli.push(el('button.strumento', { type: 'button', 'aria-label': altro ? NOMI[st] + ', altri strumenti' : 'Altri strumenti', 'aria-pressed': String(altro),
      onclick: e => (altro && !S.opzioni ? apriOpzioni() : menuAltri(e.currentTarget)) }, icona(altro ? ICONE[st] : 'altri')));
  } else {
    figli.push(...ALTRI.map(strum), bottoneIcona('immagine', 'Inserisci un\'immagine o la firma', e => menu(e.currentTarget, [
      { testo: 'Immagine', icona: 'immagine', fai: () => EXTRA.inserisci?.immagine() }, { testo: 'Firma', icona: 'firma', fai: () => EXTRA.inserisci?.firma() }], { titolo: 'Inserisci' }), 'strumento'));
  }
  figli.push(sep());
  const conColore = !['gomma', 'seleziona'].includes(st);
  if (conColore) {
    const lista = recenti()[k] || [attuale];
    const rapidi = stretto || innerHeight < 900 ? [attuale] : (lista.includes(attuale) ? lista : [attuale, ...lista]).slice(0, 3);   // schermi bassi: solo il colore attuale
    for (const h of rapidi) figli.push(el('button.strumento.colore', { type: 'button', 'aria-label': 'Colore ' + nomeColore(h), 'aria-pressed': String(h === attuale),
      onclick: () => (stretto ? (S.opzioni ? chiudiOpzioni() : apriOpzioni()) : scegliColore(h)) }, el('span.punto-colore' + (h === attuale ? '.on' : ''), { style: { background: h } })));
    if (!stretto) {
      const testo = st === 'testo', sp = testo ? corpo() : spessori()[k === 'evidenziatore' ? 'evidenziatore' : 'penna'];
      const alto = testo ? sp / 3 : k === 'evidenziatore' ? sp / 3 : sp * 1.3;
      figli.push(el('button.strumento.colore', { type: 'button', 'aria-label': testo ? 'Dimensione e altri colori' : 'Spessore e altri colori', title: testo ? 'Dimensione e altri colori' : 'Spessore e altri colori', onclick: () => (S.opzioni ? chiudiOpzioni() : apriOpzioni()) },
        el('span.barra-spessore', { style: { height: Math.max(2, Math.round(alto)) + 'px', background: attuale } })));
    }
    figli.push(sep());
  }
  const a = bottoneIcona('annulla', 'Annulla (Ctrl+Z)', annulla, 'strumento'), r = bottoneIcona('ripeti', 'Ripeti (Ctrl+Maiusc+Z)', ripeti, 'strumento');
  a.disabled = !S.fatti.length; r.disabled = !S.rifatti.length;
  figli.push(a, r, sep(), el('button.strumento', { type: 'button', 'aria-label': 'Leggi', title: 'Leggi (Esc)', onclick: () => impostaStato('lettura', { daUtente: true }) }, icona('libro')));
  b.replaceChildren(...figli);
}
export function apriOpzioni() {
  chiudiOpzioni();
  const st = strumento(), k = chiaveColore(), attuale = colori()[k];
  const o = el('div.opzioni', { role: 'dialog', 'aria-label': 'Opzioni: ' + NOMI[st] }, el('h3', { testo: NOMI[st] }), el('p', { testo: SPIEGA[st] }));
  const tinte = (lista, scelto) => el('div.fila', { role: 'group', 'aria-label': 'Colore' }, lista.map(([h, n]) =>
    el('button.tinta', { type: 'button', 'aria-label': n, title: n, 'aria-pressed': String(h === scelto), onclick: () => scegliColore(h) }, el('span.punto-colore' + (h === scelto ? '.on' : ''), { style: { background: h } }))));
  if (st === 'penna' || st === 'evidenziatore' || st === 'forma') {
    const ks = k === 'evidenziatore' ? 'evidenziatore' : 'penna', sp = spessori()[ks];
    if (st === 'forma') o.append(el('div.fila', { role: 'group', 'aria-label': 'Forma' }, FORME.map(([f, n]) =>
      el('button.taglia', { type: 'button', 'aria-label': n, title: n, 'aria-pressed': String((L.imp.forma || 'rettangolo') === f), onclick: async () => { await impostaL('forma', f); apriOpzioni(); } }, icona('forma-' + f)))));
    o.append(el('div.fila', { role: 'group', 'aria-label': 'Spessore' }, SPESSORI[ks].map((v, i) => {
      const d = ks === 'evidenziatore' ? 8 + i * 4 : 4 + i * 3;
      return el('button.taglia', { type: 'button', 'aria-label': 'Spessore ' + (i + 1) + ' di 5', 'aria-pressed': String(Math.abs(v - sp) < 0.01), onclick: () => scegliSpessore(v) },
        el('span', { style: { width: d + 'px', height: d + 'px', background: attuale } }));
    })));
    o.append(tinte(ks === 'evidenziatore' ? COLORI_EVID : COLORI_PENNA, attuale));
    if (st === 'penna') o.append(el('div.riga-opz', null, el('span', { testo: 'Raddrizza tenendo premuto' }), interruttore(L.imp.raddrizza !== false, 'Raddrizza tenendo premuto', v => impostaL('raddrizza', v))));
    if (st === 'evidenziatore') o.append(
      el('div.riga-opz', null, el('span', { testo: 'Agganciato al testo' }), interruttore(L.imp.agganciaTesto !== false, 'Agganciato al testo', v => impostaL('agganciaTesto', v))),
      el('div.riga-opz', null, el('span', { testo: 'Linea dritta automatica' }), interruttore(L.imp.lineaDritta !== false, 'Linea dritta automatica', v => impostaL('lineaDritta', v))));
  } else if (st === 'testo') {
    const c = EXTRA.testo?.attuale?.() || { corpo: corpo(), colore: attuale };
    o.append(el('div.fila', { role: 'group', 'aria-label': 'Dimensione' }, CORPI.map(v => el('button.taglia', { type: 'button', 'aria-label': 'Dimensione ' + v + ' punti', 'aria-pressed': String(v === c.corpo),
      onclick: async () => { if (!EXTRA.testo?.corpo?.(v)) await impostaL('corpo', v); apriOpzioni(); disegnaBarra(); } }, el('span.lettera', { style: { fontSize: Math.round(v * 0.9 + 4) + 'px' }, testo: 'A' })))));
    o.append(tinte(COLORI_PENNA, c.colore));
  } else if (st === 'gomma') {
    o.append(el('button.btn', { type: 'button', onclick: cancellaPagina }, icona('cestino'), 'Cancella i segni di questa pagina'));
  }
  if (!stretta()) {   // accanto allo strumento attivo
    const btn = S.barra.querySelector('[aria-pressed="true"]:not(.dito):not(.colore)');
    o.style.top = Math.max(16, Math.min((btn ? btn.offsetTop + S.barra.offsetTop - 8 : 16), S.zona.clientHeight - 380)) + 'px';
    o.classList.toggle('sinistra', L.imp.latoBarra === 'sinistra');
  }
  S.zona.append(o); S.opzioni = o;
  setTimeout(() => document.addEventListener('pointerdown', fuori, true), 0);
}
function fuori(e) { if (S.opzioni && !S.opzioni.contains(e.target) && !S.barra.contains(e.target) && !e.target.closest?.('.editor-testo')) chiudiOpzioni(); }
export function chiudiOpzioni() { document.removeEventListener('pointerdown', fuori, true); S.opzioni?.remove(); S.opzioni = null; }

// ---------- tasti in Scrittura (punto 63) ----------
function tasto(e) {
  if (!S.attivo || livelliAperti()) return false;
  if (e.target.closest?.('input, textarea, [contenteditable]')) return false;
  const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (ctrl && k === 'z') { e.preventDefault(); e.shiftKey ? ripeti() : annulla(); return true; }
  if (ctrl && k === 'y') { e.preventDefault(); ripeti(); return true; }
  if (EXTRA.seleziona?.tasto?.(e)) return true;
  if (ctrl || e.altKey) return false;
  const per = { p: 'penna', e: 'evidenziatore', g: 'gomma', f: 'forma', t: 'testo', s: 'seleziona' };
  if (per[k]) { scegliStrumento(per[k]); return true; }
  if (e.key === 'Escape') { e.preventDefault(); if (S.opzioni) chiudiOpzioni(); else if (EXTRA.seleziona?.svuota?.()) {} else impostaStato('lettura', { daUtente: true }); return true; }
  return false;
}

// ---------- collegamento con il documento ----------
let osservaZona = null;
D.strumenti = {
  prepara(zona) {
    S.zona = zona; S.tele.clear(); S.fatti = []; S.rifatti = []; S.tratto = null; S.puntatori.clear(); S.mano = null; S.gesto = null;
    S.viva = el('canvas.tela-viva', { 'aria-hidden': 'true' });
    S.cv = S.viva.getContext('2d');
    S.barra = el('div.barra-strumenti', { role: 'toolbar', 'aria-label': 'Strumenti di scrittura', hidden: true });
    zona.append(S.viva, S.barra);
    misuraViva();
    osservaZona?.disconnect(); osservaZona = new ResizeObserver(() => { misuraViva(); disegnaBarra(); aggiornaTeleDopo(); }); osservaZona.observe(zona);
    const c = D.contenitore;
    c.addEventListener('pointerdown', giu); c.addEventListener('pointermove', muovi);
    c.addEventListener('pointerup', su); c.addEventListener('pointercancel', su);
    c.addEventListener('pointerover', sopra); c.addEventListener('pointerleave', sopra);
    c.addEventListener('contextmenu', e => { if (S.attivo) e.preventDefault(); });
    c.addEventListener('scroll', aggiornaTeleDopo, { passive: true });
  },
  attiva() { S.attivo = true; S.barra.hidden = false; disegnaBarra(); },
  disattiva() { if (S.tratto) chiudiTratto(); EXTRA[strumento()]?.lascia?.(); S.attivo = false; if (S.barra) S.barra.hidden = true; chiudiOpzioni(); fermaInerzia(); },
  iniziaDa(e) { if (S.attivo && !S.tratto && e.pointerType === 'pen') giu(e); },
  paginaPronta() { aggiornaTeleDopo(); }, tasto, salvaOra,
  scalaCambiata() { if (S.tratto && !S.tratto.gomma) chiudiTratto(); aggiornaTeleDopo(); },
  aggiornaSegni(lista) {   // segni arrivati dalla sincronizzazione mentre il documento è aperto
    const per = new Map(D.segni.map(s => [s.chiave, s]));
    for (const s of lista) per.set(s.chiave, s);
    D.segni = [...per.values()];
    for (const i of new Set(lista.map(s => s.pagina))) ridisegnaPagina(i);
  },
  async chiudi() {
    if (S.tratto) chiudiTratto();
    EXTRA.testo?.conferma?.(); EXTRA.seleziona?.svuota?.();
    salvaDopo.subito(); await salvaOra();
    chiudiOpzioni(); fermaInerzia(); osservaZona?.disconnect(); osservaZona = null;
    for (const t of S.tele.values()) libera(t);
    S.tele.clear(); S.attivo = false; S.barra = null; S.viva = null; S.cv = null; S.zona = null; S.fatti = []; S.rifatti = [];
    if (S.errore) { S.errore(); S.errore = null; }
  }
};
