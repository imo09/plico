// Strumenti della 2.2: Testo, Seleziona (sposta, ridimensiona, colore, copia, elimina), evidenziatore agganciato al testo,
// immagini e firma. Si registrano in EXTRA di 65-scrittura.js.
import { el, id as nuovoId, limita, stretta } from './20-base.js';
import { icona, bottoneIcona, avviso, foglio, menu } from './25-interfaccia.js';
import { getStroke } from './35-freehand.js';
import { tocca, trasforma, rettDi, rettDiTutti, intersecano, pulito } from './36-segni.js';
import { misuraTesto, FONT_TESTO } from './40-pdf.js';
import { L, impostaL } from './50-libreria.js';
import { D, vistaPagina } from './60-documento.js';
import { S, EXTRA, COLORI_PENNA, COLORI_EVID, colori, corpo, paginaSotto, inPdf, suSchermo, pxPerPunto, nuovoSegno, aggiungiSegni,
  ridisegnaPagina, pulisciViva, contestoViva, riempiViva, scegliStrumento, pagineInVista, disegnaBarra, nomeColore, annulla } from './65-scrittura.js';

const conPagina = i => { const pv = vistaPagina(i), wrap = pv?.div?.querySelector('.canvasWrapper'); return wrap ? { i, pv, wrap, vp: pv.viewport } : null; };

// ======================= Testo (punti 13-17 della revisione 3) =======================
const T = { ed: null, tocco: null };
// caratteri che il FreeText in Helvetica sa scrivere (WinAnsi): gli altri non si vedrebbero negli altri lettori
const FUORI = /[^\u0000-\u00ff\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178]/g;
function apriEditor(seg, pagina, x, y) {
  const p = conPagina(pagina); if (!p) return;
  const box = el('div.editor-testo');
  const area = el('textarea', { 'aria-label': 'Testo', spellcheck: 'true', rows: '1', autocomplete: 'off' });
  const maniglia = el('button.maniglia', { type: 'button', 'aria-label': 'Sposta il testo', title: 'Trascina per spostare' }, icona('sposta'));
  box.append(maniglia, area);
  T.ed = { box, area, maniglia, seg, pagina, x, y, corpo: seg?.corpo || corpo(), colore: seg?.colore || colori().testo };
  if (seg) { seg._nascosto = true; ridisegnaPagina(pagina); area.value = seg.testo; }
  area.addEventListener('input', posiziona);
  area.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); conferma(); } });
  maniglia.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    try { maniglia.setPointerCapture(e.pointerId); } catch {}
    const p0 = conPagina(T.ed.pagina), k = pxPerPunto(p0), da = [e.clientX, e.clientY, T.ed.x, T.ed.y];
    const muovi = m => { T.ed.x = da[2] + (m.clientX - da[0]) / k; T.ed.y = da[3] - (m.clientY - da[1]) / k; posiziona(); };
    const fine = () => { maniglia.removeEventListener('pointermove', muovi); maniglia.removeEventListener('pointerup', fine); maniglia.removeEventListener('pointercancel', fine); area.focus({ preventScroll: true }); };
    maniglia.addEventListener('pointermove', muovi); maniglia.addEventListener('pointerup', fine); maniglia.addEventListener('pointercancel', fine);
  });
  S.zona.append(box);
  posiziona();
  setTimeout(() => area.focus({ preventScroll: true }), 0);
  disegnaBarra();
}
function posiziona() {
  const ed = T.ed; if (!ed) return;
  const p = conPagina(ed.pagina), pos = p && suSchermo(ed.pagina, ed.x, ed.y);
  if (!pos) { ed.box.hidden = true; return; }
  ed.box.hidden = false;
  const k = pxPerPunto(p), fs = ed.corpo * k, m = misuraTesto(ed.area.value || ' ', ed.corpo);
  Object.assign(ed.box.style, { left: pos[0] + 'px', top: pos[1] + 'px' });
  Object.assign(ed.area.style, { fontSize: fs + 'px', lineHeight: '1.35', fontFamily: FONT_TESTO, color: ed.colore, width: Math.max(40, m.w * k + fs) + 'px', height: Math.max(fs * 1.35, m.h * k) + 2 + 'px' });
}
function conferma() {
  const ed = T.ed; if (!ed) return;
  T.ed = null; ed.box.remove();
  const orig = ed.seg; if (orig) delete orig._nascosto;
  const testo = ed.area.value.replace(/\s+$/, '');
  if (!testo) { if (orig) aggiungiSegni([], [orig]); else ridisegnaPagina(ed.pagina); disegnaBarra(); return; }
  if (orig && orig.testo === testo && orig.corpo === ed.corpo && orig.colore === ed.colore && orig.rett[0] === ed.x && orig.rett[3] === ed.y) { ridisegnaPagina(ed.pagina); disegnaBarra(); return; }
  if (FUORI.test(testo)) avviso('Alcuni caratteri non si vedranno negli altri lettori PDF.', { durata: 5000 });
  FUORI.lastIndex = 0;
  const m = misuraTesto(testo, ed.corpo), x = Math.round(ed.x * 100) / 100, y = Math.round(ed.y * 100) / 100;
  const s = nuovoSegno({ tipo: 'testo', pagina: ed.pagina, testo, corpo: ed.corpo, colore: ed.colore, rett: [x, Math.round((y - m.h) * 100) / 100, Math.round((x + m.w) * 100) / 100, y] });
  aggiungiSegni([s], orig ? [orig] : []);
  disegnaBarra();
}
function toccoTesto(x, y) {
  if (T.ed) { conferma(); return; }
  const p = paginaSotto(x, y); if (!p) return;
  const [px, py] = inPdf(p, x, y), r = 6 / pxPerPunto(p);
  const tra = D.segni.filter(s => s.tipo === 'testo' && !s.eliminato && s.pagina === p.i && tocca(s, px, py, r));
  if (tra.length) { const s = tra[tra.length - 1]; apriEditor(s, p.i, s.rett[0], s.rett[3]); }
  else apriEditor(null, p.i, px, py + corpo() * 0.3);
}
EXTRA.testo = {
  giu(e) { T.tocco = { id: e.pointerId, x: e.clientX, y: e.clientY, mosso: false }; },
  inCorso: id => T.tocco?.id === id,
  muovi(e) { if (T.tocco && Math.hypot(e.clientX - T.tocco.x, e.clientY - T.tocco.y) > 10) T.tocco.mosso = true; },
  su() { const t = T.tocco; T.tocco = null; if (t && !t.mosso) toccoTesto(t.x, t.y); },
  annullaGesto() { T.tocco = null; },
  lascia: conferma, conferma, posiziona,
  attuale: () => (T.ed ? { corpo: T.ed.corpo, colore: T.ed.colore } : null),
  corpo(v) { if (!T.ed) return false; T.ed.corpo = v; impostaL('corpo', v); posiziona(); return true; },
  colore(h) { if (!T.ed) return false; T.ed.colore = h; posiziona(); impostaL('colori', { ...colori(), testo: h }); return true; }
};

// ======================= Seleziona =======================
const SE = { pagina: null, ids: [], box: null, op: null };
const selezionati = () => D.segni.filter(s => SE.ids.includes(s.id) && !s.eliminato);
function svuota() {
  const aveva = SE.ids.length > 0;
  for (const s of D.segni) if (s._nascosto && !T.ed) delete s._nascosto;
  SE.ids = []; SE.op = null; SE.box?.remove(); SE.box = null; pulisciViva();
  if (aveva && SE.pagina !== null) ridisegnaPagina(SE.pagina);
  SE.pagina = null;
  return aveva;
}
function seleziona(lista, pagina) {
  svuota();
  const ids = new Set(lista.map(s => s.id));
  for (const s of lista) if (s.gruppo) for (const g of D.segni) if (g.gruppo === s.gruppo && g.pagina === pagina && !g.eliminato) ids.add(g.id);   // la firma si muove intera
  SE.ids = [...ids]; SE.pagina = pagina;
  if (SE.ids.length) disegnaBox();
}
function disegnaBox() {
  SE.box?.remove(); SE.box = null;
  const lista = selezionati(); if (!lista.length) return;
  const box = el('div.sel-box', { role: 'group', 'aria-label': lista.length === 1 ? '1 segno selezionato' : lista.length + ' segni selezionati' });
  for (const angolo of ['no', 'ne', 'so', 'se']) {
    const m = el('span.sel-maniglia.' + angolo, { 'aria-hidden': 'true' });
    m.addEventListener('pointerdown', e => iniziaScala(e, angolo));
    box.append(m);
  }
  const tuttiEv = lista.every(s => s.strumento === 'evidenziatore' || s.tipo === 'evidenzia'), conColore = lista.some(s => s.tipo !== 'immagine');
  const az = el('div.sel-azioni', null,
    conColore ? bottoneIcona('colore', 'Cambia colore', e => menu(e.currentTarget, (tuttiEv ? COLORI_EVID : COLORI_PENNA).map(([h, n]) => ({ testo: n, icona: 'colore', fai: () => cambiaColore(h, tuttiEv) })), { titolo: 'Colore' })) : null,
    bottoneIcona('duplica', 'Copia', copia), bottoneIcona('cestino', 'Elimina', elimina));
  az.addEventListener('pointerdown', e => e.stopPropagation());
  box.append(az);
  S.zona.append(box); SE.box = box;
  posizionaBox();
}
function rettSchermo(r) {
  const a = suSchermo(SE.pagina, r[0], r[3]), b = suSchermo(SE.pagina, r[2], r[1]);
  if (!a || !b) return null;
  return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]) };
}
function posizionaBox(tr) {
  if (!SE.box) return;
  const lista = selezionati(); if (!lista.length) { svuota(); return; }
  const r = rettDiTutti(tr ? lista.map(s => trasforma(s, tr)) : lista), q = rettSchermo(r);
  if (!q) { SE.box.hidden = true; return; }
  SE.box.hidden = false;
  Object.assign(SE.box.style, { left: q.x - 6 + 'px', top: q.y - 6 + 'px', width: q.w + 12 + 'px', height: q.h + 12 + 'px' });
}
function anteprima(tr) {
  pulisciViva();
  const p = conPagina(SE.pagina); if (!p) return;
  const c = contestoViva(p.wrap, p.vp);
  for (const s of selezionati()) {
    const t = trasforma(s, tr);
    if (t.tipo === 'tratto') riempiViva(c, t, t.strumento === 'evidenziatore' ? 0.6 : 1);
    else { const r = rettDi(t); c.setLineDash([4, 3]); c.lineWidth = 1 / p.vp.scale * 1.5; c.strokeStyle = '#C99A4E'; c.strokeRect(r[0], r[1], r[2] - r[0], r[3] - r[1]); if (t.tipo === 'evidenzia') { c.globalAlpha = 0.5; c.fillStyle = t.colore; for (const [a, b, cc, d] of t.riquadri) c.fillRect(a, b, cc - a, d - b); c.globalAlpha = 1; } }
  }
  c.restore();
  posizionaBox(tr);
}
function nascondi(si) { for (const s of selezionati()) { if (si) s._nascosto = true; else delete s._nascosto; } ridisegnaPagina(SE.pagina); }
function applicaA(lista, cambia) {   // sostituisce i segni con copie cambiate (id nuovi): annulla e unione restano semplici
  const nuovi = lista.map(s => { const n = { ...cambia(s) }; const fresco = nuovoSegno({}); n.id = fresco.id; n.chiave = fresco.chiave; n.modificato = fresco.modificato; n.eliminato = false; return n; });
  for (const s of lista) delete s._nascosto;
  aggiungiSegni(nuovi, lista);
  return nuovi;
}
function conferma_(tr) {
  const pagina = SE.pagina, lista = selezionati();
  const nuovi = applicaA(lista, s => trasforma(s, tr));
  pulisciViva(); SE.ids = nuovi.map(s => s.id); SE.pagina = pagina; disegnaBox();
}
function cambiaColore(h, ev) {
  const lista = selezionati().filter(s => s.tipo !== 'immagine' && ((s.strumento === 'evidenziatore' || s.tipo === 'evidenzia') === ev));
  if (!lista.length) return;
  const nuovi = applicaA(lista, s => ({ ...pulito(s), colore: h }));
  const resto = SE.ids.filter(i => !lista.some(s => s.id === i));
  SE.ids = [...resto, ...nuovi.map(s => s.id)]; disegnaBox();
  avviso('Colore: ' + nomeColore(h));
}
function copia() {
  const pagina = SE.pagina, gruppi = new Map();
  const nuovi = selezionati().map(s => {
    const t = trasforma(s, { dx: 12, dy: -12 }), f = nuovoSegno({ pagina });
    if (s.gruppo) { if (!gruppi.has(s.gruppo)) gruppi.set(s.gruppo, nuovoId()); t.gruppo = gruppi.get(s.gruppo); }
    return { ...t, id: f.id, chiave: f.chiave, modificato: f.modificato, eliminato: false };
  });
  aggiungiSegni(nuovi);
  SE.ids = nuovi.map(s => s.id); SE.pagina = pagina; disegnaBox();
  avviso(nuovi.length === 1 ? 'Copiato' : 'Copiati ' + nuovi.length + ' segni');
}
function elimina() {
  const lista = selezionati(); if (!lista.length) return;
  svuota(); aggiungiSegni([], lista);
  avviso(lista.length === 1 ? 'Segno eliminato' : 'Eliminati ' + lista.length + ' segni', { azione: { testo: 'Annulla', fai: annulla } });
}
function iniziaScala(e, angolo) {
  e.preventDefault(); e.stopPropagation();
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  const p = conPagina(SE.pagina), r = rettDiTutti(selezionati());
  const ancora = { no: [r[2], r[1]], ne: [r[0], r[1]], so: [r[2], r[3]], se: [r[0], r[3]] }[angolo];
  const [sx, sy] = inPdf(p, e.clientX, e.clientY), d0 = Math.hypot(sx - ancora[0], sy - ancora[1]) || 1;
  const nodo = e.currentTarget; let tr = null;
  nascondi(true);
  const muovi = m => { const [x, y] = inPdf(p, m.clientX, m.clientY); tr = { k: limita(Math.hypot(x - ancora[0], y - ancora[1]) / d0, 0.1, 10), ax: ancora[0], ay: ancora[1] }; anteprima(tr); };
  const fine = ev => {
    nodo.removeEventListener('pointermove', muovi); nodo.removeEventListener('pointerup', fine); nodo.removeEventListener('pointercancel', fine);
    if (tr && ev.type === 'pointerup' && Math.abs(tr.k - 1) > 0.01) conferma_(tr); else { nascondi(false); pulisciViva(); posizionaBox(); }
  };
  nodo.addEventListener('pointermove', muovi); nodo.addEventListener('pointerup', fine); nodo.addEventListener('pointercancel', fine);
}
EXTRA.seleziona = {
  giu(e) {
    const p = paginaSotto(e.clientX, e.clientY);
    if (!p) { svuota(); return false; }
    const [px, py] = inPdf(p, e.clientX, e.clientY), k = pxPerPunto(p), r = 8 / k;
    if (SE.ids.length && SE.pagina === p.i) {
      const b = rettDiTutti(selezionati());
      if (px >= b[0] - r && px <= b[2] + r && py >= b[1] - r && py <= b[3] + r) { SE.op = { tipo: 'sposta', id: e.pointerId, p, da: [px, py], mosso: false }; return; }
    }
    const sotto = D.segni.filter(s => s.pagina === p.i && !s.eliminato && tocca(s, px, py, r));
    if (sotto.length) {
      const s = sotto[sotto.length - 1];
      if (e.shiftKey && SE.pagina === p.i) seleziona([...selezionati(), s], p.i); else seleziona([s], p.i);
      SE.op = { tipo: 'sposta', id: e.pointerId, p, da: [px, py], mosso: false };
      return;
    }
    svuota();
    SE.op = { tipo: 'lazo', id: e.pointerId, p, da: [px, py], ora: [px, py], schermo: [e.clientX, e.clientY] };
  },
  inCorso: id => SE.op?.id === id,
  muovi(e) {
    const o = SE.op; if (!o) return;
    const [x, y] = inPdf(o.p, e.clientX, e.clientY);
    if (o.tipo === 'sposta') {
      if (!o.mosso && Math.hypot(x - o.da[0], y - o.da[1]) * pxPerPunto(o.p) < 4) return;
      if (!o.mosso) { o.mosso = true; nascondi(true); }
      o.tr = { dx: x - o.da[0], dy: y - o.da[1] }; anteprima(o.tr);
    } else {
      o.ora = [x, y];
      pulisciViva();
      const c = S.cv, d = S.dViva || 1, z = S.zona.getBoundingClientRect();
      c.setTransform(d, 0, 0, d, 0, 0); c.setLineDash([5, 4]); c.lineWidth = 1.5; c.strokeStyle = '#C99A4E'; c.fillStyle = 'rgba(201,154,78,.10)';
      const x0 = Math.min(o.schermo[0], e.clientX) - z.left, y0 = Math.min(o.schermo[1], e.clientY) - z.top, w = Math.abs(e.clientX - o.schermo[0]), h = Math.abs(e.clientY - o.schermo[1]);
      c.fillRect(x0, y0, w, h); c.strokeRect(x0, y0, w, h); c.setLineDash([]);
    }
  },
  su(e) {
    const o = SE.op; SE.op = null; if (!o) return;
    if (o.tipo === 'sposta') { if (o.mosso && o.tr && e.type === 'pointerup') conferma_(o.tr); else if (o.mosso) { nascondi(false); pulisciViva(); posizionaBox(); } return; }
    pulisciViva();
    const r = [Math.min(o.da[0], o.ora[0]), Math.min(o.da[1], o.ora[1]), Math.max(o.da[0], o.ora[0]), Math.max(o.da[1], o.ora[1])];
    if ((r[2] - r[0]) * pxPerPunto(o.p) < 4 && (r[3] - r[1]) * pxPerPunto(o.p) < 4) return;
    const dentro = D.segni.filter(s => s.pagina === o.p.i && !s.eliminato && intersecano(rettDi(s), r));
    if (dentro.length) seleziona(dentro, o.p.i);
  },
  annullaGesto() { if (SE.op?.mosso) { nascondi(false); pulisciViva(); } SE.op = null; },
  lascia: () => { svuota(); },
  svuota, posiziona: () => posizionaBox(),
  tasto(e) {
    if (!SE.ids.length) return false;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); elimina(); return true; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); copia(); return true; }
    return false;
  },
  selezionaSegni(lista) { if (lista.length) seleziona(lista, lista[0].pagina); }
};

// ======================= Evidenziatore agganciato al testo =======================
const ET = { st: null };
function spanDi(p) { return Array.from(p.pv.div.querySelectorAll('.textLayer span')).filter(s => s.firstChild?.nodeType === 3 && s.textContent.trim()); }
function contiene(r, x, y, t = 3) { return x >= r.left - t && x <= r.right + t && y >= r.top - t && y <= r.bottom + t; }
function vicino(spans, x, y) {
  let meglio = null, dm = Infinity;
  for (const s of spans) {
    const r = s.getBoundingClientRect(); if (!r.width) continue;
    const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0, dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
    const d = dy * 4 + dx; if (d < dm) { dm = d; meglio = s; }
  }
  return meglio;
}
function posizione(span, x, indice) {
  const n = span.firstChild, rg = document.createRange(), len = n.length;
  let off = len;
  for (let i = 0; i < len; i++) { rg.setStart(n, i); rg.setEnd(n, i + 1); const r = rg.getBoundingClientRect(); if (x < r.left + r.width / 2) { off = i; break; } }
  return { span, nodo: n, off, indice };
}
function rettangoliClient() {
  const { a, b } = ET.st; if (!a || !b) return [];
  let [p, q] = (a.indice < b.indice || (a.indice === b.indice && a.off <= b.off)) ? [a, b] : [b, a];
  if (p.indice === q.indice && p.off === q.off) return [];
  const rg = document.createRange(); rg.setStart(p.nodo, p.off); rg.setEnd(q.nodo, q.off);
  const righe = [];
  for (const r of rg.getClientRects()) {
    if (r.width < 0.5 || r.height < 0.5) continue;
    const riga = righe.find(x => Math.abs(x.top - r.top) < r.height * 0.5 && Math.abs(x.bottom - r.bottom) < r.height * 0.5);
    if (riga) { riga.left = Math.min(riga.left, r.left); riga.right = Math.max(riga.right, r.right); riga.top = Math.min(riga.top, r.top); riga.bottom = Math.max(riga.bottom, r.bottom); }
    else righe.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
  }
  return righe;
}
function anteprimaEv() {
  pulisciViva();
  const c = S.cv, d = S.dViva || 1, z = S.zona.getBoundingClientRect();
  c.setTransform(d, 0, 0, d, 0, 0); c.globalAlpha = 0.55; c.fillStyle = colori().evidenziatore;
  for (const r of rettangoliClient()) c.fillRect(r.left - z.left, r.top - z.top, r.right - r.left, r.bottom - r.top);
  c.globalAlpha = 1;
}
EXTRA.evidenziaTesto = {
  prova(e, p) {
    const spans = spanDi(p), su = spans.find(s => contiene(s.getBoundingClientRect(), e.clientX, e.clientY, 2));
    if (!su) return false;
    const a = posizione(su, e.clientX, spans.indexOf(su));
    ET.st = { p, spans, a, b: a };
    return true;
  },
  muovi(e) {
    const st = ET.st; if (!st) return;
    const s = vicino(st.spans, e.clientX, e.clientY); if (!s) return;
    st.b = posizione(s, e.clientX, st.spans.indexOf(s));
    anteprimaEv();
  },
  su(annullato) {
    const st = ET.st; ET.st = null; pulisciViva();
    if (!st || annullato) return;
    ET.st = st; const righe = rettangoliClient(); ET.st = null;
    if (!righe.length) return;
    const riquadri = righe.map(r => {
      const [x0, y0] = inPdf(st.p, r.left, r.bottom), [x1, y1] = inPdf(st.p, r.right, r.top), q = v => Math.round(v * 100) / 100;
      return [q(Math.min(x0, x1)), q(Math.min(y0, y1)), q(Math.max(x0, x1)), q(Math.max(y0, y1))];
    });
    aggiungiSegni([nuovoSegno({ tipo: 'evidenzia', pagina: st.p.i, colore: colori().evidenziatore, riquadri })]);
  }
};

// ======================= Immagini e firma =======================
function centroVisibile() {   // pagina in vista e punto PDF al centro della sua parte visibile
  const i = pagineInVista()[0] ?? ((D.v?.currentPageNumber || 1) - 1), p = conPagina(i); if (!p) return null;
  const r = p.wrap.getBoundingClientRect(), c = D.contenitore.getBoundingClientRect();
  const x = (Math.max(r.left, c.left) + Math.min(r.right, c.right)) / 2, y = (Math.max(r.top, c.top) + Math.min(r.bottom, c.bottom)) / 2;
  return { p, punto: inPdf(p, x, y), larghezza: p.vp.width / p.vp.scale };
}
async function riduci(file) {   // al massimo 1600 px per lato; JPEG, oppure PNG se ha trasparenza
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.drawImage(bmp, 0, 0, w, h); bmp.close?.();
  const png = /png|webp|gif|svg/.test(file.type) && (() => { const d = ctx.getImageData(0, 0, w, h).data; for (let i = 3; i < d.length; i += 16) if (d[i] < 250) return true; return false; })();
  const dati = c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85);
  c.width = c.height = 0;
  return { dati, w, h };
}
async function inserisciImmagine() {
  if (!D.aperto) return;
  const inp = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', style: { display: 'none' } });
  inp.addEventListener('change', async () => {
    const f = inp.files[0]; inp.remove(); if (!f) return;
    try {
      const { dati, w, h } = await riduci(f), v = centroVisibile(); if (!v) return;
      const larg = v.larghezza * 0.4, alt = larg * h / w, [cx, cy] = v.punto, q = n => Math.round(n * 100) / 100;
      const s = nuovoSegno({ tipo: 'immagine', pagina: v.p.i, dati, rett: [q(cx - larg / 2), q(cy - alt / 2), q(cx + larg / 2), q(cy + alt / 2)] });
      aggiungiSegni([s]);
      await scegliStrumento('seleziona'); EXTRA.seleziona.selezionaSegni([s]);
      avviso('Immagine inserita: trascinala o ridimensionala dagli angoli');
    } catch (e) { console.error(e); avviso('Questa immagine non si apre. Prova con un file PNG o JPEG.', { durata: 5000 }); }
  });
  document.body.append(inp); inp.click();
}
// la firma: tratti disegnati in un riquadro, salvati sul dispositivo e inseriti come tratti di penna raggruppati
function blocco(firma, finito) {
  const pad = el('canvas.blocco-firma', { 'aria-label': 'Riquadro per la firma' });
  const tratti = firma ? firma.tratti.map(t => ({ ...t })) : [];
  let corrente = null;
  const ctx = pad.getContext('2d');
  const disegna = () => {
    const r = pad.getBoundingClientRect(), d = devicePixelRatio || 1;
    if (pad.width !== Math.round(r.width * d)) { pad.width = Math.round(r.width * d); pad.height = Math.round(r.height * d); }
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, r.width, r.height);
    ctx.fillStyle = '#0E1D2A';
    for (const t of [...tratti, corrente].filter(Boolean)) {
      const pts = []; for (let i = 0; i < t.p.length; i += 3) pts.push([t.p[i], t.p[i + 1], t.p[i + 2]]);
      const o = getStroke(pts, { size: 4, thinning: 0.63, smoothing: 0.5, streamline: 0.3, simulatePressure: false, last: true }); if (o.length < 3) continue;
      ctx.beginPath(); ctx.moveTo(o[0][0], o[0][1]); for (const q of o) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill();
    }
  };
  const pos = e => { const r = pad.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  pad.addEventListener('pointerdown', e => { e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch {} const [x, y] = pos(e); corrente = { p: [x, y, e.pointerType === 'pen' ? Math.max(0.05, e.pressure) : 0.55] }; disegna(); });
  pad.addEventListener('pointermove', e => { if (!corrente) return; for (const c of (e.getCoalescedEvents?.() || []).length ? e.getCoalescedEvents() : [e]) { const [x, y] = pos(c); corrente.p.push(x, y, c.pointerType === 'pen' ? Math.max(0.05, c.pressure || 0.5) : 0.55); } disegna(); });
  const fine = () => { if (corrente && corrente.p.length >= 6) tratti.push(corrente); corrente = null; disegna(); };
  pad.addEventListener('pointerup', fine); pad.addEventListener('pointercancel', fine);
  setTimeout(disegna, 50);
  return { pad, tratti, pulisci: () => { tratti.length = 0; disegna(); }, misura: () => pad.getBoundingClientRect() };
}
function inserisciFirma(firma) {
  const xs = [], ys = []; for (const t of firma.tratti) for (let i = 0; i < t.p.length; i += 3) { xs.push(t.p[i]); ys.push(t.p[i + 1]); }
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), v = centroVisibile(); if (!v || x1 <= x0) return;
  const k = Math.min(160, v.larghezza * 0.35) / (x1 - x0), [cx, cy] = v.punto, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, gruppo = nuovoId(), q = n => Math.round(n * 100) / 100;
  const nuovi = firma.tratti.map(t => {
    const p = new Float32Array(t.p.length);
    for (let i = 0; i < t.p.length; i += 3) { p[i] = q(cx + (t.p[i] - mx) * k); p[i + 1] = q(cy - (t.p[i + 1] - my) * k); p[i + 2] = t.p[i + 2]; }
    return nuovoSegno({ tipo: 'tratto', pagina: v.p.i, strumento: 'penna', colore: colori().penna, spessore: q(4 * k / 0.755), scala: 1, punti: p, gruppo });
  });
  aggiungiSegni(nuovi);
  scegliStrumento('seleziona').then(() => EXTRA.seleziona.selezionaSegni(nuovi));
  avviso('Firma inserita: trascinala dove serve');
}
function firma() {
  if (!D.aperto) return;
  const salvata = L.imp.firma;
  const nuova = () => {
    const b = blocco(null);
    foglio({ titolo: 'Disegna la firma', sotto: 'Con la penna o con il dito. Resta salvata su questo dispositivo.', contenuto: el('div.riquadro-firma', null, b.pad), azioni: [
      { testo: 'Cancella', fai: () => b.pulisci() },
      { testo: 'Inserisci', primario: true, fai: async c => {
        if (!b.tratti.length) { avviso('La firma è vuota.'); return; }
        const f = { tratti: b.tratti.map(t => ({ p: t.p.map(v => Math.round(v * 100) / 100) })) };
        await impostaL('firma', f); c(); inserisciFirma(f);
      } }] });
  };
  if (!salvata) { nuova(); return; }
  const anteprima_ = el('div.riquadro-firma.piccolo');
  const b = blocco(salvata); b.pad.style.pointerEvents = 'none'; anteprima_.append(b.pad);
  foglio({ titolo: 'Firma', contenuto: anteprima_, azioni: [
    { testo: 'Disegnane una nuova', fai: c => { c(); setTimeout(nuova, 50); } },
    { testo: 'Usa questa firma', primario: true, fai: c => { c(); inserisciFirma(salvata); } }] });
}
EXTRA.inserisci = { immagine: inserisciImmagine, firma };
