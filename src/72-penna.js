// Diagnostica della penna (2.2): che cosa arriva dal dispositivo mentre scrivi. Percorso #penna, dalle Impostazioni.
import { $, el, numero } from './20-base.js';
import { bottoneIcona, indietro } from './25-interfaccia.js';
import { getStroke } from './35-freehand.js';

const NOMI = { pen: 'Penna', touch: 'Dito', mouse: 'Mouse' };
export function mostraPenna() {
  const valori = {};
  const riga = (k, t) => { valori[k] = el('dd', { testo: '-' }); return [el('dt', { testo: t }), valori[k]]; };
  const lettura = el('dl.lettura-penna', null, riga('tipo', 'Tipo'), riga('pressione', 'Pressione'), riga('inclinazione', 'Inclinazione'), riga('tasti', 'Tasti premuti'),
    riga('laterale', 'Tasto laterale'), riga('vicina', 'Vicina allo schermo'), riga('frequenza', 'Eventi al secondo'), riga('intermedi', 'Punti per evento'), riga('previsti', 'Punti previsti'));
  const barra = el('span.barra-pressione', null, el('i'));
  const pad = el('canvas.blocco-prova', { 'aria-label': 'Riquadro per provare la penna' });
  const tratti = []; let corrente = null, eventi = [], laterale = false;
  const ctx = pad.getContext('2d');
  const disegna = () => {
    const r = pad.getBoundingClientRect(), d = devicePixelRatio || 1;
    if (pad.width !== Math.round(r.width * d) || pad.height !== Math.round(r.height * d)) { pad.width = Math.round(r.width * d); pad.height = Math.round(r.height * d); }
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, r.width, r.height);
    ctx.fillStyle = '#0E1D2A';
    for (const t of [...tratti, corrente].filter(Boolean)) {
      const o = getStroke(t, { size: 6, thinning: 0.63, smoothing: 0.5, streamline: 0.15, simulatePressure: false, last: true }); if (o.length < 3) continue;
      ctx.beginPath(); ctx.moveTo(o[0][0], o[0][1]); for (const q of o) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill();
    }
  };
  const mostra = (e, tipo) => {
    valori.tipo.textContent = NOMI[e.pointerType] || e.pointerType || '-';
    valori.pressione.textContent = numero(e.pressure || 0);
    barra.firstChild.style.width = Math.round((e.pressure || 0) * 100) + '%';
    valori.inclinazione.textContent = (e.tiltX || 0) + ' gradi, ' + (e.tiltY || 0) + ' gradi';
    valori.tasti.textContent = String(e.buttons);
    if ((e.buttons & 32) || (e.pointerType === 'pen' && (e.buttons & 2)) || e.button === 5) laterale = true;
    valori.laterale.textContent = laterale ? 'Rilevato' : 'Non ancora';
    valori.vicina.textContent = e.pointerType === 'pen' && e.buttons === 0 && tipo === 'muovi' ? 'Sì' : (tipo === 'esce' ? 'No' : valori.vicina.textContent);
    if (tipo === 'muovi') {
      const ora = performance.now(); eventi.push(ora); while (eventi.length && ora - eventi[0] > 1000) eventi.shift();
      valori.frequenza.textContent = String(eventi.length);
      valori.intermedi.textContent = String(e.getCoalescedEvents ? Math.max(1, e.getCoalescedEvents().length) : 1);
      valori.previsti.textContent = typeof e.getPredictedEvents === 'function' ? String(e.getPredictedEvents().length) : 'Non disponibili';
    }
  };
  const pos = e => { const r = pad.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, e.pointerType === 'pen' ? Math.max(0.05, e.pressure || 0.5) : 0.5]; };
  pad.addEventListener('pointerdown', e => { e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch {} corrente = [pos(e)]; mostra(e, 'giu'); disegna(); });
  pad.addEventListener('pointermove', e => { mostra(e, 'muovi'); if (!corrente) return; const l = e.getCoalescedEvents?.() || []; for (const c of (l.length ? l : [e])) corrente.push(pos(c)); disegna(); });
  const su = e => { mostra(e, 'su'); if (corrente) tratti.push(corrente); corrente = null; disegna(); };
  pad.addEventListener('pointerup', su); pad.addEventListener('pointercancel', su);
  pad.addEventListener('pointerleave', e => mostra(e, 'esce'));
  pad.addEventListener('contextmenu', e => e.preventDefault());
  const pulisci = el('button.btn.piccolo', { type: 'button', testo: 'Cancella', onclick: () => { tratti.length = 0; laterale = false; disegna(); } });
  const radice = el('div.impostazioni', null,
    el('header.testa-doc', null, bottoneIcona('indietro', 'Torna alle impostazioni', () => indietro('#impostazioni')), el('h1', { testo: 'Prova la penna' })),
    el('div.corpo', null, el('div.colonna.prova-penna', null,
      el('p.nota-penna', { testo: 'Scrivi nel riquadro. Premi il tasto laterale della S Pen per vedere se plico lo riconosce; avvicina la penna senza toccare per la sospensione.' }),
      el('div.sezione', null, el('div.riquadro-prova', null, pad), el('div.riga-imp', null, el('span.testi', null, el('span', { testo: 'Pressione' }), barra), pulisci)),
      el('div.sezione', null, lettura))));
  $('#app').replaceChildren(radice);
  document.title = 'Prova la penna - plico';
  new ResizeObserver(disegna).observe(pad);
}
