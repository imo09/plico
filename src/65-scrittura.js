// Scrittura: tele sopra le pagine, ingressi (penna, dito, mouse), strumenti, annulla, salvataggio dei segni.
import { el, limita, stretta, rimanda, id as nuovoId, scarica, nomePulito } from './20-base.js';
import { icona, bottoneIcona, avviso, striscia, interruttore, livelliAperti } from './25-interfaccia.js';
import { insieme } from './30-archivio.js';
import { getStroke } from './35-freehand.js';
import { poligonoDi, tocca, toccaTratto, linea, arrotonda, pulito } from './36-segni.js';
import { disegnaSegni, fileDi } from './40-pdf.js';
import { L, salvaScheda, impostaL } from './50-libreria.js';
import { D, impostaStato, mostraSalvataggio, vistaPagina } from './60-documento.js';

export const COLORI_PENNA = [['#0E1D2A', 'Inchiostro'], ['#2E5E9E', 'Blu'], ['#B4544A', 'Ruggine'], ['#2F9184', 'Verderame'], ['#71879A', 'Acciaio'], ['#C99A4E', 'Ottone']];
export const COLORI_EVID = [['#F5DE8C', 'Giallo'], ['#BFE3CF', 'Verde'], ['#F3C4BE', 'Rosa'], ['#BFDCEB', 'Azzurro']];
export const SPESSORI = { penna: [1.2, 1.8, 2.6, 3.6, 4.8], evidenziatore: [8, 11, 14, 19, 24] };
const NOMI = { penna: 'Penna', evidenziatore: 'Evidenziatore', gomma: 'Gomma' }, TASTI = { penna: 'P', evidenziatore: 'E', gomma: 'G' };
const SPIEGA = { penna: 'Il tratto segue la pressione della penna.', evidenziatore: 'Il colore resta sotto il testo.', gomma: 'Cancella il segno intero che tocca. Con la S Pen basta tenere premuto il tasto laterale.' };
const nomeColore = h => [...COLORI_PENNA, ...COLORI_EVID].find(c => c[0] === h)?.[1] || h;

const S = { attivo: false, tele: new Map(), viva: null, cv: null, zona: null, barra: null, opzioni: null, tratto: null, puntatori: new Map(),
  ultimaPenna: -1e9, pennaGiu: false, fatti: [], rifatti: [], daSalvare: new Map(), gesto: null, mano: null, inerzia: 0, errore: null };

// ---------- impostazioni degli strumenti ----------
const strumento = () => L.imp.strumento || 'penna';
const chiaveColore = () => (strumento() === 'evidenziatore' ? 'evidenziatore' : 'penna');
const colori = () => ({ penna: '#2E5E9E', evidenziatore: '#F5DE8C', ...(L.imp.colori || {}) });
const recenti = () => ({ penna: ['#2E5E9E', '#B4544A', '#0E1D2A'], evidenziatore: ['#F5DE8C', '#BFE3CF', '#F3C4BE'], ...(L.imp.coloriRecenti || {}) });
const spessori = () => ({ penna: 1.8, evidenziatore: 14, ...(L.imp.spessori || {}) });
async function scegliStrumento(n) { await impostaL('strumento', n); disegnaBarra(); if (S.opzioni) chiudiOpzioni(); }
async function scegliColore(hex) {
  if (strumento() === 'gomma') await impostaL('strumento', 'penna');
  const k = chiaveColore(), c = colori(), r = recenti();
  c[k] = hex; r[k] = [hex, ...r[k].filter(x => x !== hex)].slice(0, 3);
  await impostaL('colori', c); await impostaL('coloriRecenti', r);
  disegnaBarra(); if (S.opzioni) apriOpzioni();
}
async function scegliSpessore(v) { const k = chiaveColore(), s = spessori(); s[k] = v; await impostaL('spessori', s); disegnaBarra(); if (S.opzioni) apriOpzioni(); }

// ---------- tele (punti 135-137, 135b) ----------
const MAX_PIXEL = 16777216;
function crea(classe) { return el('canvas.tela.' + classe, { 'aria-hidden': 'true', style: { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'none' } }); }
function libera(t) { for (const c of [t.penna, t.ev]) if (c) { c.width = c.height = 0; c.remove(); } }
function liberaStaccate() { for (const [i, t] of S.tele) if (!t.penna.isConnected) { libera(t); S.tele.delete(i); } }
const segniPagina = i => D.segni.filter(s => s.pagina === i && !s.eliminato);
function telaDi(i) {
  const pv = vistaPagina(i); if (!pv?.div) return null;
  const wrap = pv.div.querySelector('.canvasWrapper'); if (!wrap) return null;
  let t = S.tele.get(i);
  if (!t || t.penna.parentNode !== wrap) { if (t) libera(t); t = { penna: crea('tela-penna'), ev: null, w: 0, h: 0 }; wrap.append(t.penna); S.tele.set(i, t); }
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
function ridisegnaPagina(i) {
  const t = telaDi(i); if (!t) return;
  const lista = segniPagina(i), conEv = lista.some(s => s.strumento === 'evidenziatore');
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
  if (t.sporca) { ridisegnaPagina(s.pagina); return; }
  const ev = s.strumento === 'evidenziatore';
  disegnaSegni((ev ? evDi(t) : t.penna).getContext('2d'), [s], t.vp, t.w / t.vp.width, t.h / t.vp.height, { evidenziatori: ev, penne: !ev });
}
function paginaPronta({ pageNumber }) { liberaStaccate(); ridisegnaPagina(pageNumber - 1); }

// ---------- tela viva: il tratto in corso (punto 138) ----------
function misuraViva() {
  if (!S.viva || !S.zona) return;
  const d = devicePixelRatio || 1, w = S.zona.clientWidth, h = S.zona.clientHeight;
  S.viva.style.width = w + 'px'; S.viva.style.height = h + 'px';
  S.viva.width = Math.round(w * d); S.viva.height = Math.round(h * d);
}
function pulisciViva() { if (S.cv) { S.cv.setTransform(1, 0, 0, 1, 0, 0); S.cv.clearRect(0, 0, S.viva.width, S.viva.height); } }
let rafViva = 0;
function disegnaViva() {
  if (rafViva) return;
  rafViva = requestAnimationFrame(() => {
    rafViva = 0; pulisciViva();
    const t = S.tratto; if (!t || t.gomma || t.punti.length < 3) return;
    const r = t.wrap.getBoundingClientRect(), z = S.zona.getBoundingClientRect(), d = devicePixelRatio || 1;
    const s = { strumento: t.strumento, spessore: t.spessore, scala: t.scala, punti: new Float32Array(t.punti) };
    const p = poligonoDi(s, getStroke); if (p.length < 6) return;
    const c = S.cv;
    c.save();
    c.setTransform(d, 0, 0, d, 0, 0);
    c.beginPath(); c.rect(r.left - z.left, r.top - z.top, r.width, r.height); c.clip();
    c.translate(r.left - z.left, r.top - z.top); c.scale(r.width / t.vp.width, r.height / t.vp.height); c.transform(...t.vp.transform);
    c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath();
    c.globalAlpha = t.strumento === 'evidenziatore' ? 0.6 : 1; c.fillStyle = t.colore; c.fill();
    c.restore();
  });
}

// ---------- ingressi (punti 61-66, 140-142) ----------
const pennaVicina = () => S.pennaGiu || performance.now() - S.ultimaPenna < 700;
const scriveIlDito = () => !L.imp.haPenna || !!L.imp.dito;
function gommaPremuta(e) { return (e.buttons & 32) === 32 || e.button === 5 || (e.pointerType === 'pen' && (e.buttons & 2) === 2); }
function paginaSotto(x, y) {
  const n = document.elementFromPoint(x, y)?.closest?.('.page');
  if (!n || !D.contenitore.contains(n)) return null;
  const i = Number(n.dataset.pageNumber) - 1, pv = vistaPagina(i);
  const wrap = n.querySelector('.canvasWrapper');
  return pv && wrap ? { i, pv, wrap } : null;
}
function inPdf(t, x, y) {   // punto dello schermo -> punti PDF della pagina del tratto
  const r = t.wrap.getBoundingClientRect();
  return t.vp.convertToPdfPoint((x - r.left) * t.vp.width / r.width, (y - r.top) * t.vp.height / r.height);
}
const pxPerPunto = t => t.wrap.getBoundingClientRect().width / (t.vp.width / t.vp.scale);

function iniziaTratto(e) {
  const p = paginaSotto(e.clientX, e.clientY); if (!p) return;
  const st = gommaPremuta(e) ? 'gomma' : strumento();
  telaDi(p.i);
  const t = { id: e.pointerId, tipo: e.pointerType, pagina: p.i, wrap: p.wrap, vp: p.pv.viewport, scala: p.pv.viewport.scale, gomma: st === 'gomma', strumento: st,
    colore: colori()[st === 'evidenziatore' ? 'evidenziatore' : 'penna'], spessore: spessori()[st === 'evidenziatore' ? 'evidenziatore' : 'penna'],
    punti: [], ultimo: null, tolti: [], fermo: null, timer: 0, dritto: false };
  S.tratto = t;
  try { D.contenitore.setPointerCapture(e.pointerId); } catch {}
  if (t.gomma) cancellaVerso(t, e.clientX, e.clientY);
  else aggiungiPunto(t, e, true);
}
function pressione(t, e, primo, distanza) {
  if (t.tipo === 'pen') return Math.max(0.05, Math.min(1, e.pressure || 0.5));
  return primo ? 0.55 : limita(0.8 - distanza / 40, 0.3, 0.8);
}
function aggiungiPunto(t, e, primo = false) {
  const x = e.clientX, y = e.clientY;
  const dist = t.ultimo ? Math.hypot(x - t.ultimo[0], y - t.ultimo[1]) : 0;
  if (!primo && dist < 0.8) return;
  if (t.dritto) {   // raddrizzato: la retta segue la punta
    const [px, py] = inPdf(t, x, y);
    t.punti = Array.from(linea([t.punti[0], t.punti[1]], [px, py], t.pDritta));
    t.ultimo = [x, y]; return;
  }
  const [px, py] = inPdf(t, x, y);
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
function chiudiTratto(annullato = false) {
  const t = S.tratto; if (!t) return;
  S.tratto = null; clearTimeout(t.timer);
  pulisciViva();
  if (t.gomma) { if (t.tolti.length) { registra({ aggiunti: [], tolti: t.tolti }); daSalvare(t.tolti); } return; }
  if (annullato || !t.punti.length) return;
  let punti = t.punti;
  if (t.strumento === 'evidenziatore' && L.imp.lineaDritta !== false && punti.length >= 6) {   // punto 74
    const k = pxPerPunto(t); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, sy = 0; const n = punti.length / 3;
    for (let i = 0; i < n; i++) { const x = punti[3 * i], y = punti[3 * i + 1]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); sy += y; }
    if ((y1 - y0) * k < 18 && (x1 - x0) * k > 30) punti = Array.from(linea([x0, sy / n], [x1, sy / n], 0.5));
  }
  const ora = Date.now(), idd = nuovoId(), doc = D.scheda.id;
  const s = { id: idd, doc, chiave: doc + ':' + idd, tipo: 'tratto', pagina: t.pagina, modificato: ora, eliminato: false,
    strumento: t.strumento, colore: t.colore, spessore: t.spessore, scala: Math.round(t.scala * 10000) / 10000, punti: arrotonda(new Float32Array(punti)) };
  D.segni.push(s);
  aggiungiSuPagina(s);
  if (t.pagina === 0) D.miniDaRifare = true;
  registra({ aggiunti: [s], tolti: [] });
  daSalvare([s]);
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
      S.mano = null; iniziaGesto(); return;
    }
    if (!scriveIlDito()) { iniziaMano(e); return; }
  }
  if (e.pointerType === 'mouse' && e.button === 1) { e.preventDefault(); iniziaMano(e); return; }
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (S.tratto) return;
  e.preventDefault();
  iniziaTratto(e);
}
function muovi(e) {
  if (e.pointerType === 'pen') S.ultimaPenna = performance.now();
  if (!S.attivo) return;
  if (S.puntatori.has(e.pointerId)) { S.puntatori.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (S.gesto) { muoviGesto(); return; } }
  if (S.mano && S.mano.id === e.pointerId) { muoviMano(e); return; }
  const t = S.tratto; if (!t || t.id !== e.pointerId) return;
  const lista = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
  if (!t.gomma && gommaPremuta(e)) {   // tasto premuto a metà tratto: da qui si cancella
    chiudiTratto(); iniziaTratto(e); return;
  }
  for (const c of (lista.length ? lista : [e])) { if (t.gomma) cancellaVerso(t, c.clientX, c.clientY); else aggiungiPunto(t, c); }
  if (!t.gomma) disegnaViva();
}
function su(e) {
  if (e.pointerType === 'pen') { S.ultimaPenna = performance.now(); S.pennaGiu = false; }
  if (S.puntatori.delete(e.pointerId)) { if (S.puntatori.size < 2) S.gesto = null; }
  if (S.mano && S.mano.id === e.pointerId) { lasciaMano(e); return; }
  if (S.tratto && S.tratto.id === e.pointerId) chiudiTratto(e.type === 'pointercancel' && S.tratto.punti.length < 6);
}
// dito che scorre in Scrittura, con inerzia (punto 141); tasto centrale del mouse
function iniziaMano(e) { S.mano = { id: e.pointerId, x: e.clientX, y: e.clientY, campioni: [[performance.now(), e.clientX, e.clientY]] }; D.contenitore.classList.add('trascina-mano'); try { D.contenitore.setPointerCapture(e.pointerId); } catch {} }
function muoviMano(e) {
  const m = S.mano; D.contenitore.scrollBy(m.x - e.clientX, m.y - e.clientY); m.x = e.clientX; m.y = e.clientY;
  const ora = performance.now(); m.campioni.push([ora, e.clientX, e.clientY]); while (m.campioni.length > 2 && ora - m.campioni[0][0] > 100) m.campioni.shift();
}
function lasciaMano() {
  const m = S.mano; S.mano = null; D.contenitore.classList.remove('trascina-mano');
  if (!m || m.campioni.length < 2) return;
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
  S.gesto = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: D.v.currentScale, c: [(a.x + b.x) / 2, (a.y + b.y) / 2] };
}
function muoviGesto() {
  const g = S.gesto, [a, b] = [...S.puntatori.values()]; if (!g || !b) return;
  const c = [(a.x + b.x) / 2, (a.y + b.y) / 2], pan = [c[0] - g.c[0], c[1] - g.c[1]]; g.c = c;
  const obiettivo = limita(g.s0 * Math.hypot(a.x - b.x, a.y - b.y) / g.d0, 0.5, 5);
  if (Math.abs(obiettivo - D.v.currentScale) >= 0.01) D.v.updateScale({ scaleFactor: obiettivo / D.v.currentScale, origin: c, drawingDelay: 400, pan });
  else D.contenitore.scrollBy(-pan[0], -pan[1]);
}
function sopra(e) { if (e.pointerType === 'pen') S.ultimaPenna = performance.now(); }

// ---------- annulla e ripeti (punto 145) ----------
function registra(op) { S.fatti.push(op); if (S.fatti.length > 200) S.fatti.shift(); S.rifatti = []; disegnaBarra(); }
function applica(op, verso) {
  const ora = Date.now(), pagine = new Set(), cambiati = [];
  for (const s of op.aggiunti) { s.eliminato = verso < 0; s.modificato = ora; pagine.add(s.pagina); cambiati.push(s); }
  for (const s of op.tolti) { s.eliminato = verso > 0; s.modificato = ora; pagine.add(s.pagina); cambiati.push(s); }
  for (const p of pagine) { ridisegnaPagina(p); if (p === 0) D.miniDaRifare = true; }
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
function daSalvare(lista) { for (const s of lista) S.daSalvare.set(s.chiave, s); mostraSalvataggio(true); salvaDopo(); }
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
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') salvaDopo.subito() || salvaOra(); });
addEventListener('pagehide', () => { salvaOra(); });

// ---------- barra degli strumenti (punto 68) e opzioni (punti 69-72) ----------
function disegnaBarra() {
  const b = S.barra; if (!b) return;
  const stretto = stretta(), st = strumento(), k = chiaveColore(), attuale = colori()[k];
  b.classList.toggle('sinistra', L.imp.latoBarra === 'sinistra');
  const strum = n => el('button.strumento', { type: 'button', 'aria-label': NOMI[n], title: NOMI[n] + ' (' + TASTI[n] + ')', 'aria-pressed': String(st === n),
    onclick: () => (st === n ? (S.opzioni ? chiudiOpzioni() : apriOpzioni()) : scegliStrumento(n)) }, icona(n));
  const rapidi = stretto ? [attuale] : (recenti()[k].includes(attuale) ? recenti()[k] : [attuale, ...recenti()[k]].slice(0, 3));
  const sep = () => el('span.sep', { 'aria-hidden': 'true' });
  const figli = [];
  if (L.imp.haPenna) figli.push(el('button.strumento.dito', { type: 'button', 'aria-label': 'Scrivi con il dito', title: 'Scrivi con il dito', 'aria-pressed': String(!!L.imp.dito),
    onclick: async () => { await impostaL('dito', !L.imp.dito); disegnaBarra(); avviso(L.imp.dito ? 'Ora il dito scrive, due dita scorrono' : 'Ora il dito scorre'); } }, icona('dito')), sep());
  figli.push(strum('penna'), strum('evidenziatore'), strum('gomma'), sep());
  for (const h of rapidi) figli.push(el('button.strumento.colore', { type: 'button', 'aria-label': 'Colore ' + nomeColore(h), 'aria-pressed': String(h === attuale && st !== 'gomma'),
    onclick: () => (stretto ? (S.opzioni ? chiudiOpzioni() : apriOpzioni()) : scegliColore(h)) }, el('span.punto-colore' + (h === attuale && st !== 'gomma' ? '.on' : ''), { style: { background: h } })));
  if (!stretto) {
    const sp = spessori()[k], alto = k === 'evidenziatore' ? sp / 3 : sp * 1.3;
    figli.push(el('button.strumento.colore', { type: 'button', 'aria-label': 'Spessore e altri colori', title: 'Spessore e altri colori', onclick: () => (S.opzioni ? chiudiOpzioni() : apriOpzioni()) },
      el('span.barra-spessore', { style: { height: Math.max(2, Math.round(alto)) + 'px', background: st === 'gomma' ? 'var(--testo)' : attuale } })));
  }
  figli.push(sep());
  const a = bottoneIcona('annulla', 'Annulla (Ctrl+Z)', annulla, 'strumento'), r = bottoneIcona('ripeti', 'Ripeti (Ctrl+Maiusc+Z)', ripeti, 'strumento');
  a.disabled = !S.fatti.length; r.disabled = !S.rifatti.length;
  figli.push(a, r, sep(), el('button.strumento', { type: 'button', 'aria-label': 'Leggi', title: 'Leggi (Esc)', onclick: () => impostaStato('lettura', { daUtente: true }) }, icona('libro')));
  b.replaceChildren(...figli);
}
function apriOpzioni() {
  chiudiOpzioni(true);
  const st = strumento(), k = chiaveColore(), sp = spessori()[k], attuale = colori()[k];
  const o = el('div.opzioni', { role: 'dialog', 'aria-label': 'Opzioni: ' + NOMI[st] }, el('h3', { testo: NOMI[st] }), el('p', { testo: SPIEGA[st] }));
  if (st !== 'gomma') {
    const taglie = SPESSORI[k];
    o.append(el('div.fila', { role: 'group', 'aria-label': 'Spessore' }, taglie.map((v, i) => {
      const d = k === 'evidenziatore' ? 8 + i * 4 : 4 + i * 3;
      return el('button.taglia', { type: 'button', 'aria-label': 'Spessore ' + (i + 1) + ' di 5', 'aria-pressed': String(Math.abs(v - sp) < 0.01), onclick: () => scegliSpessore(v) },
        el('span', { style: { width: d + 'px', height: d + 'px', background: attuale } }));
    })));
    o.append(el('div.fila', { role: 'group', 'aria-label': 'Colore' }, (k === 'evidenziatore' ? COLORI_EVID : COLORI_PENNA).map(([h, n]) =>
      el('button.tinta', { type: 'button', 'aria-label': n, title: n, 'aria-pressed': String(h === attuale), onclick: () => scegliColore(h) }, el('span.punto-colore' + (h === attuale ? '.on' : ''), { style: { background: h } })))));
    const chiave = k === 'evidenziatore' ? 'lineaDritta' : 'raddrizza', testo = k === 'evidenziatore' ? 'Linea dritta automatica' : 'Raddrizza tenendo premuto';
    o.append(el('div.riga-opz', null, el('span', { testo }), interruttore(L.imp[chiave] !== false, testo, v => impostaL(chiave, v))));
  } else {
    o.append(el('button.btn', { type: 'button', onclick: cancellaPagina }, icona('cestino'), 'Cancella i segni di questa pagina'));
  }
  if (!stretta()) {   // accanto allo strumento attivo
    const btn = S.barra.querySelector('[aria-pressed="true"]');
    o.style.top = Math.max(16, Math.min((btn ? btn.offsetTop + S.barra.offsetTop - 8 : 16), S.zona.clientHeight - 360)) + 'px';
    o.classList.toggle('sinistra', L.imp.latoBarra === 'sinistra');
  }
  S.zona.append(o); S.opzioni = o;
  setTimeout(() => document.addEventListener('pointerdown', fuori, true), 0);
}
function fuori(e) { if (S.opzioni && !S.opzioni.contains(e.target) && !S.barra.contains(e.target)) chiudiOpzioni(); }
function chiudiOpzioni(subito) { document.removeEventListener('pointerdown', fuori, true); S.opzioni?.remove(); S.opzioni = null; }

// ---------- tasti in Scrittura (punto 63) ----------
function tasto(e) {
  if (!S.attivo || livelliAperti()) return false;
  const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (ctrl && k === 'z') { e.preventDefault(); e.shiftKey ? ripeti() : annulla(); return true; }
  if (ctrl && k === 'y') { e.preventDefault(); ripeti(); return true; }
  if (ctrl || e.altKey) return false;
  if (k === 'p') { scegliStrumento('penna'); return true; }
  if (k === 'e') { scegliStrumento('evidenziatore'); return true; }
  if (k === 'g') { scegliStrumento('gomma'); return true; }
  if (e.key === 'Escape') { e.preventDefault(); if (S.opzioni) chiudiOpzioni(); else impostaStato('lettura', { daUtente: true }); return true; }
  return false;
}

// ---------- collegamento con il documento ----------
let osservaZona = null;
D.strumenti = {
  prepara(zona) {
    S.zona = zona; S.tele.clear(); S.fatti = []; S.rifatti = []; S.tratto = null; S.puntatori.clear(); S.mano = null; S.gesto = null;
    S.viva = el('canvas.tela-viva', { 'aria-hidden': 'true' });
    S.cv = S.viva.getContext('2d', { desynchronized: true });
    S.barra = el('div.barra-strumenti', { role: 'toolbar', 'aria-label': 'Strumenti di scrittura', hidden: true });
    zona.append(S.viva, S.barra);
    misuraViva();
    osservaZona?.disconnect(); osservaZona = new ResizeObserver(() => { misuraViva(); disegnaBarra(); }); osservaZona.observe(zona);
    const c = D.contenitore;
    c.addEventListener('pointerdown', giu); c.addEventListener('pointermove', muovi);
    c.addEventListener('pointerup', su); c.addEventListener('pointercancel', su);
    c.addEventListener('pointerover', sopra); c.addEventListener('pointerleave', sopra);
    c.addEventListener('contextmenu', e => { if (S.attivo) e.preventDefault(); });
  },
  attiva() { S.attivo = true; S.barra.hidden = false; disegnaBarra(); },
  disattiva() { if (S.tratto) chiudiTratto(); S.attivo = false; if (S.barra) S.barra.hidden = true; chiudiOpzioni(); fermaInerzia(); },
  iniziaDa(e) { if (S.attivo && !S.tratto && e.pointerType === 'pen') iniziaTratto(e); },
  paginaPronta, tasto, salvaOra,
  aggiornaSegni(lista) {   // segni arrivati dalla sincronizzazione mentre il documento è aperto
    const per = new Map(D.segni.map(s => [s.chiave, s]));
    for (const s of lista) per.set(s.chiave, s);
    D.segni = [...per.values()];
    for (const i of new Set(lista.map(s => s.pagina))) ridisegnaPagina(i);
  },
  scalaCambiata() { if (S.tratto && !S.tratto.gomma) chiudiTratto(); },
  async chiudi() {
    if (S.tratto) chiudiTratto();
    salvaDopo.subito(); await salvaOra();
    chiudiOpzioni(); fermaInerzia(); osservaZona?.disconnect(); osservaZona = null;
    for (const t of S.tele.values()) libera(t);
    S.tele.clear(); S.attivo = false; S.barra = null; S.viva = null; S.cv = null; S.zona = null; S.fatti = []; S.rifatti = [];
    if (S.errore) { S.errore(); S.errore = null; }
  }
};
