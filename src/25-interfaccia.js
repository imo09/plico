// Componenti: icone, livelli (tasto Indietro), foglio dal basso, menu, avviso, conferma, domande.
import { el, $, stretta, emetti } from './20-base.js';

const ICONE = {
  documenti: 'M6.5 3.5h7l4 4v13h-11z M13.5 3.5v4h4 M9 12h6 M9 15.5h6',
  stella: 'M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z',
  cestino: 'M5 7h14 M10 7V4.5h4V7 M7 7l1 13h8l1-13',
  cartella: 'M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z',
  nuovaCartella: 'M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z M12 10.5v5 M9.5 13h5',
  ingranaggio: 'M4 7h9 M17 7h3 M4 17h3 M11 17h9 M13 7a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M7 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
  lente: 'M4.5 11a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0 -13 0 M20 20l-4.4-4.4',
  importa: 'M6.5 3.5h7l4 4v13h-11z M13.5 3.5v4h4 M12 11v6 M9 14h6',
  elenco: 'M8.5 6.5h11 M8.5 12h11 M8.5 17.5h11 M4.5 6.5h.01 M4.5 12h.01 M4.5 17.5h.01',
  griglia: 'M4.5 4.5h6v6h-6z M13.5 4.5h6v6h-6z M4.5 13.5h6v6h-6z M13.5 13.5h6v6h-6z',
  libro: 'M12 6.5c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z M12 6.5v13',
  penna: 'M4.5 19.5l4-1 10.3-10.3a2.1 2.1 0 0 0-3-3L5.5 15.5z M14.3 6.7l3 3',
  evidenziatore: 'M14.5 4.5l5 5-7.5 7.5-5-5z M7 12l-2.5 5.5L7 20l5-3 M15 20.5h5',
  gomma: 'M8.5 19.5h11 M4.8 14.7l8.9-8.9a2 2 0 0 1 2.8 0l2.7 2.7a2 2 0 0 1 0 2.8l-7.4 7.4a2.8 2.8 0 0 1-4 0l-3-3a.7.7 0 0 1 0-1z M9.5 10l5.5 5.5',
  dito: 'M9 11.5V5.8a1.5 1.5 0 0 1 3 0v5.2 M12 10.2a1.5 1.5 0 0 1 3 0v1.3 M15 11a1.5 1.5 0 0 1 3 0v3.5a6 6 0 0 1-6 6h-.7a5.6 5.6 0 0 1-4.5-2.3L4.4 15a1.5 1.5 0 0 1 2.3-1.9L9 15.3',
  condividi: 'M15.7 5.5a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0 -4.6 0 M3.7 12a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0 -4.6 0 M15.7 18.5a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0 -4.6 0 M8.1 10.9l7.8-4.3 M8.1 13.1l7.8 4.3',
  vai: 'M5 12h14 M13 6l6 6-6 6',
  rinomina: 'M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17z M13.5 8.5l3 3',
  copia: 'M12 3.5v11 M7.5 10.5l4.5 4.5 4.5-4.5 M5 20.5h14',
  duplica: 'M8.5 8.5h11v11h-11z M5 15.5h-.5a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v.5',
  dettagli: 'M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0 M12 11v5 M12 7.8h.01',
  info: 'M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0 M12 11v5 M12 7.8h.01',
  fatto: 'M5 12.5l4.5 4.5L19 7.5',
  attesa: 'M12 7v5l3 2 M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0',
  indietro: 'M15 5l-7 7 7 7',
  avanti: 'M9 5l7 7-7 7',
  giu: 'M7 10l5 5 5-5',
  su: 'M7 14l5-5 5 5',
  piu: 'M12 5v14 M5 12h14',
  chiudi: 'M6 6l12 12 M18 6L6 18',
  puntini: 'M5.5 12h.01 M12 12h.01 M18.5 12h.01',
  annulla: 'M9 14L4 9l5-5 M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  ripeti: 'M15 14l5-5-5-5 M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
  ripristina: 'M4.5 12a7.5 7.5 0 1 0 2.4-5.5 M4.5 4v4h4',
  vuoto: 'M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z M9 3.5v17 M12 8.5h4 M12 12h4',
  righe: 'M6.5 3.5h11v17h-11z M9 8h6 M9 11.5h6 M9 15h6',
  quadretti: 'M6.5 3.5h11v17h-11z M6.5 9h11 M6.5 14.5h11 M10.2 3.5v17 M13.8 3.5v17',
  bianco: 'M6.5 3.5h11v17h-11z',
  nuvola: 'M7 18.5h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6-1.3A4.7 4.7 0 0 0 7 18.5z',
  scudo: 'M12 3.5l7 3v5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9v-5z M9 12l2 2 4-4',
  aspetto: 'M12 3.5a8.5 8.5 0 1 0 0 17z M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0',
  archivio: 'M4.5 7.5h15v12h-15z M3.5 4.5h17v3h-17z M10 11.5h4',
  guida: 'M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0 M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.5v.6 M12 16.8h.01',
  lucchetto: 'M6.5 10.5h11v9h-11z M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5'
};
export function icona(nome, classe = 'ic') {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', classe); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path'); p.setAttribute('d', ICONE[nome] || ICONE.documenti); s.append(p);
  return s;
}
export function marchio(px = 28) {
  const t = document.createElement('template');
  t.innerHTML = `<svg viewBox="0 0 64 64" width="${px}" height="${px}" aria-hidden="true" class="marchio"><rect width="64" height="64" rx="14" fill="#0E1D2A"/><path d="M21 11h15l10 10v30a2 2 0 0 1-2 2H21a2 2 0 0 1-2-2V13a2 2 0 0 1 2-2z" fill="#E9EDEC"/><path d="M36 11v8a2 2 0 0 0 2 2h8z" fill="#CAD2D2"/><path d="M24 41c3-7 6-7 7-1s3 7 6 0 4-5 6-2" fill="none" stroke="#C99A4E" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return t.content.firstChild;
}
export function bottoneIcona(nome, etichetta, azione, classe = 'bi') {
  return el('button.' + classe, { type: 'button', 'aria-label': etichetta, title: etichetta, onclick: azione }, icona(nome));
}

// ---------- livelli: il tasto Indietro chiude un livello alla volta (regola 66) ----------
const pila = [];
let popDaIgnorare = 0, attesaFermo = [];
export function apriLivello(chiudi) {
  const voce = { chiudi, attivo: true };
  pila.push(voce);
  history.pushState({ plicoLivello: pila.length }, '');
  return () => {
    if (!voce.attivo) return;
    voce.attivo = false;
    const i = pila.indexOf(voce); if (i >= 0) pila.splice(i, 1);
    voce.chiudi();
    popDaIgnorare++; history.back();
  };
}
export function livelliAperti() { return pila.length; }
export function chiudiTuttiLivelli() { while (pila.length) { const v = pila[pila.length - 1]; v.attivo = false; pila.pop(); v.chiudi(); popDaIgnorare++; history.back(); } }
export function quandoFermo() { return popDaIgnorare ? new Promise(r => attesaFermo.push(r)) : Promise.resolve(); }
export function gestisciPop() {   // true se il popstate era di un livello
  if (popDaIgnorare) { popDaIgnorare--; if (!popDaIgnorare) { const a = attesaFermo; attesaFermo = []; a.forEach(r => r()); } return true; }
  const v = pila.pop();
  if (v) { v.attivo = false; v.chiudi(); return true; }
  return false;
}
export function chiudiUltimo() { const v = pila[pila.length - 1]; if (!v) return false; v.attivo = false; pila.pop(); v.chiudi(); popDaIgnorare++; history.back(); return true; }

// ---------- foglio: dal basso sulla disposizione stretta, finestra al centro sulla larga ----------
export function foglio({ titolo, sotto, contenuto, azioni, classe = '', chiudibile = true, alChiudere } = {}) {
  const corpo = el('div.foglio' + (classe ? '.' + classe : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-label': titolo || 'Finestra' });
  const velo = el('div.velo', null, corpo);
  if (titolo) corpo.append(el('h2.foglio-titolo', { testo: titolo }));
  if (sotto) corpo.append(el('p.foglio-sotto', { testo: sotto }));
  if (contenuto) corpo.append(contenuto);
  const barra = el('div.foglio-azioni');
  let chiudi;
  for (const a of azioni || []) barra.append(el('button.btn' + (a.primario ? '.primario' : '') + (a.pericolo ? '.pericolo' : ''), { type: 'button', testo: a.testo, onclick: () => a.fai(chiudi) }));
  if (azioni?.length) corpo.append(barra);
  document.body.append(velo);
  requestAnimationFrame(() => velo.classList.add('su'));
  let chiuso = false;
  const chiusura = () => { if (chiuso) return; chiuso = true; velo.remove(); alChiudere?.(); };
  chiudi = apriLivello(chiusura);
  if (chiudibile) velo.addEventListener('pointerdown', e => { if (e.target === velo) { e.preventDefault(); chiudi(); } });
  setTimeout(() => { const f = corpo.querySelector('input, [autofocus]') || corpo.querySelector('button'); f?.focus({ preventScroll: true }); }, 30);
  return { corpo, chiudi };
}

// ---------- menu: a comparsa accanto all'ancora (larga), foglio dal basso (stretta) ----------
export function menu(ancora, voci, { titolo } = {}) {
  const lista = el('div.menu-lista', { role: 'menu' });
  let chiudi = () => {};
  for (const v of voci) {
    if (!v) continue;
    if (v.separatore) { lista.append(el('div.menu-sep', { role: 'separator' })); continue; }
    lista.append(el('button.menu-voce' + (v.pericolo ? '.pericolo' : ''), {
      type: 'button', role: 'menuitem',
      onclick: () => { chiudi(); setTimeout(() => v.fai(), 0); }
    }, v.icona ? icona(v.icona) : null, el('span.menu-testo', { testo: v.testo }), v.valore ? el('span.menu-valore', { testo: v.valore }) : null));
  }
  if (stretta() || !ancora) {
    const f = foglio({ titolo, contenuto: lista, classe: 'foglio-menu' });
    chiudi = f.chiudi; return f;
  }
  const pop = el('div.menu', { role: 'presentation' }, lista);
  const velo = el('div.velo-trasparente', null, pop);
  document.body.append(velo);
  const r = ancora.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const w = Math.min(300, W - 16);
  pop.style.width = w + 'px';
  let x = r.right - w; if (x < 8) x = Math.min(r.left, W - w - 8);
  pop.style.left = Math.max(8, x) + 'px';
  const h = pop.offsetHeight;
  let y = r.bottom + 6; if (y + h > H - 8) y = Math.max(8, r.top - h - 6);
  pop.style.top = y + 'px';
  let chiuso = false;
  chiudi = apriLivello(() => { if (chiuso) return; chiuso = true; velo.remove(); ancora.focus?.({ preventScroll: true }); });
  velo.addEventListener('pointerdown', e => { if (e.target === velo) { e.preventDefault(); chiudi(); } });
  velo.addEventListener('contextmenu', e => e.preventDefault());
  pop.querySelector('button')?.focus({ preventScroll: true });
  pop.addEventListener('keydown', e => {
    const b = Array.from(pop.querySelectorAll('button')), i = b.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); b[(i + 1) % b.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); b[(i - 1 + b.length) % b.length].focus(); }
  });
  return { corpo: pop, chiudi };
}

// ---------- avviso in basso: 3 s, 6 s con Annulla ----------
let avvisoAttuale = null;
export function avviso(testo, { azione, durata } = {}) {
  avvisoAttuale?.remove();
  const n = el('div.avviso', { role: 'status', 'aria-live': 'polite' }, el('span', { testo }));
  if (azione) n.append(el('button.avviso-azione', { type: 'button', testo: azione.testo, onclick: () => { n.remove(); azione.fai(); } }));
  (document.querySelector('.area-avvisi') || document.body).append(n);
  avvisoAttuale = n;
  const t = setTimeout(() => n.remove(), durata ?? (azione ? 6000 : 3000));
  n.addEventListener('pointerenter', () => clearTimeout(t), { once: true });
  n.addEventListener('pointerleave', () => setTimeout(() => n.remove(), 2000), { once: true });
  return n;
}

// ---------- striscia fissa in alto: errori che non spariscono da soli ----------
export function striscia(testo, azioni = []) {
  $('.striscia')?.remove();
  const s = el('div.striscia', { role: 'alert' }, el('span', { testo }));
  const togli = () => s.remove();
  for (const a of azioni) s.append(el('button.btn.piccolo', { type: 'button', testo: a.testo, onclick: () => a.fai(togli) }));
  document.body.append(s);
  return togli;
}

export function conferma(testo, { ok = 'Elimina', annulla = 'Annulla', pericolo = true, titolo } = {}) {
  return new Promise(risolvi => {
    let esito = false;
    foglio({ titolo: titolo || testo, sotto: titolo ? testo : null, classe: 'foglio-piccolo', alChiudere: () => risolvi(esito), azioni: [
      { testo: annulla, fai: c => c() },
      { testo: ok, primario: !pericolo, pericolo, fai: c => { esito = true; c(); } }
    ] });
  });
}

// chiedi un testo o un numero: risolve con il valore o null
export function chiedi(titolo, { valore = '', etichetta = '', tipo = 'text', ok = 'Fatto', sotto, controlla, min, max, extra } = {}) {
  return new Promise(risolvi => {
    let esito = null;
    const errore = el('p.campo-errore', { role: 'alert' });
    const campo = el('input.campo', { type: tipo, value: String(valore), 'aria-label': etichetta || titolo, autocomplete: tipo === 'password' ? 'current-password' : 'off', min, max, inputmode: tipo === 'number' ? 'numeric' : null, enterkeyhint: 'done' });
    const corpo = el('form.campo-gruppo', { novalidate: true }, etichetta ? el('label.campo-etichetta', { testo: etichetta }) : null, campo, errore, extra || null);
    let f;
    const invia = () => {
      const v = campo.value.trim();
      const msg = controlla ? controlla(v) : (!v ? 'Scrivi qualcosa.' : '');
      if (msg) { errore.textContent = msg; campo.focus(); return; }
      esito = tipo === 'password' ? campo.value : v; f.chiudi();
    };
    corpo.addEventListener('submit', e => { e.preventDefault(); invia(); });
    f = foglio({ titolo, sotto, contenuto: corpo, classe: 'foglio-piccolo', alChiudere: () => risolvi(esito), azioni: [
      { testo: 'Annulla', fai: c => c() }, { testo: ok, primario: true, fai: invia }
    ] });
    setTimeout(() => { campo.focus(); if (tipo === 'text') campo.select(); }, 40);
  });
}

// scelta fra opzioni: risolve con l'id scelto o null
export function scegli(titolo, opzioni, { sotto } = {}) {
  return new Promise(risolvi => {
    let esito = null, f;
    const lista = el('div.scelte', null, opzioni.map(o => el('button.scelta', { type: 'button', onclick: () => { esito = o.id; f.chiudi(); } },
      o.icona ? el('span.scelta-icona', null, icona(o.icona)) : null,
      el('span.scelta-testo', null, el('b', { testo: o.testo }), o.sotto ? el('small', { testo: o.sotto }) : null))));
    f = foglio({ titolo, sotto, contenuto: lista, alChiudere: () => risolvi(esito) });
  });
}

export function interruttore(acceso, etichetta, cambia) {
  const b = el('button.interruttore', { type: 'button', role: 'switch', 'aria-checked': String(!!acceso), 'aria-label': etichetta });
  b.addEventListener('click', () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', String(v)); cambia(v); });
  return b;
}
export function segmenti(opzioni, attuale, etichetta, cambia) {
  const g = el('div.segmenti', { role: 'radiogroup', 'aria-label': etichetta });
  for (const [v, t] of opzioni) g.append(el('button', { type: 'button', role: 'radio', 'aria-checked': String(v === attuale), testo: t, onclick: () => {
    for (const b of g.children) b.setAttribute('aria-checked', String(b.textContent === t));
    cambia(v);
  } }));
  return g;
}
export function errorePerUtente(e) {
  emetti('errore', e);
  console.error(e);
}

// navigazione con l'indirizzo: aspetta che i livelli chiusi abbiano finito con la cronologia
export async function vai(hash, { sostituisci = false } = {}) {
  await quandoFermo();
  if (location.hash === hash) { emetti('rotta', hash); return; }
  if (sostituisci) { history.replaceState(history.state, '', hash); emetti('rotta', hash); }
  else location.hash = hash;
}
// pressione lunga (e tasto destro) su un elemento
export function pressioneLunga(nodo, f) {
  let t = 0, x = 0, y = 0, scattata = false;
  nodo.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    scattata = false; x = e.clientX; y = e.clientY;
    clearTimeout(t); t = setTimeout(() => { scattata = true; f(e); }, 520);
  });
  const ferma = () => clearTimeout(t);
  nodo.addEventListener('pointermove', e => { if (Math.hypot(e.clientX - x, e.clientY - y) > 8) ferma(); });
  nodo.addEventListener('pointerup', ferma); nodo.addEventListener('pointercancel', ferma); nodo.addEventListener('pointerleave', ferma);
  nodo.addEventListener('click', e => { if (scattata) { e.preventDefault(); e.stopImmediatePropagation(); scattata = false; } }, true);
  nodo.addEventListener('contextmenu', e => { e.preventDefault(); clearTimeout(t); if (!scattata) f(e); });
}

// indietro "dentro l'app": torna alla rotta precedente se c'è, altrimenti alla libreria
let rottaPrecedente = null, rottaAttuale = null;
export function segnaRotta(h) { if (h !== rottaAttuale) { rottaPrecedente = rottaAttuale; rottaAttuale = h; } }
export async function indietro(predefinita = '#libreria') {
  await quandoFermo();
  if (rottaPrecedente && rottaPrecedente !== rottaAttuale && history.length > 1) history.back();
  else vai(predefinita, { sostituisci: true });
}
