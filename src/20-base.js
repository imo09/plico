// Utilità comuni: DOM, formati italiani, id, eventi interni.
export const $ = (sel, radice = document) => radice.querySelector(sel);
export const $$ = (sel, radice = document) => Array.from(radice.querySelectorAll(sel));
export const MB = 1048576;
export const PESO_MASSIMO = 200 * MB;
export const GIORNO = 86400000;

// el('button.classe', { attributi, onclick }, figli...)
export function el(tag, attr, ...figli) {
  const [nome, ...classi] = tag.split('.');
  const n = document.createElement(nome || 'div');
  if (classi.length) n.className = classi.join(' ');
  if (attr) for (const k in attr) {
    const v = attr[k];
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k === 'testo') n.textContent = v;
    else if (k in n && k !== 'list' && k !== 'form' && typeof v !== 'string') n[k] = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const f of figli.flat(Infinity)) if (f !== null && f !== undefined && f !== false) n.append(f instanceof Node ? f : String(f));
  return n;
}

export function id() {
  const a = crypto.getRandomValues(new Uint8Array(8)), c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = ''; for (const b of a) s += c[b % 36]; return s;
}

export function limita(v, a, b) { return v < a ? a : v > b ? b : v; }
export const attendi = ms => new Promise(r => setTimeout(r, ms));

const numIt = new Map();
export function numero(n, decimali = 2) {
  if (!numIt.has(decimali)) numIt.set(decimali, new Intl.NumberFormat('it-IT', { minimumFractionDigits: decimali, maximumFractionDigits: decimali }));
  return numIt.get(decimali).format(n);
}
export function peso(byte) {
  if (byte === null || byte === undefined || isNaN(byte)) return '-';
  if (byte >= 1024 * MB) return numero(byte / (1024 * MB)) + ' GB';
  if (byte >= MB) return numero(byte / MB) + ' MB';
  return numero(byte / 1024) + ' KB';
}
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const due = v => String(v).padStart(2, '0');
export function oraBreve(ms) { const d = new Date(ms); return due(d.getHours()) + ':' + due(d.getMinutes()); }
export function data(ms) {   // "Oggi 09:41", "Ieri", "12 nov", "12 nov 2025"
  if (!ms) return '-';
  const d = new Date(ms), o = new Date();
  const g = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((g(o) - g(d)) / GIORNO);
  if (diff === 0) return 'Oggi ' + oraBreve(ms);
  if (diff === 1) return 'Ieri';
  return d.getDate() + ' ' + MESI[d.getMonth()] + (d.getFullYear() !== o.getFullYear() ? ' ' + d.getFullYear() : '');
}
export function dataFile(ms = Date.now()) { const d = new Date(ms); return d.getFullYear() + '-' + due(d.getMonth() + 1) + '-' + due(d.getDate()); }
export function senzaAccenti(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
export function nomePulito(nome) {   // nome sicuro per un file, su ogni sistema
  let s = String(nome || 'documento').replace(/[\u0000-\u001f\u007f/\\:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/[. ]+$/, '').slice(0, 80).trim();
  return s || 'documento';
}
export function nomeSenzaPdf(nome) { return String(nome || '').replace(/\.pdf$/i, '').trim() || 'Documento'; }
export const confronto = new Intl.Collator('it', { sensitivity: 'base', numeric: true }).compare;

const bus = new EventTarget();
export function emetti(nome, dati) { bus.dispatchEvent(new CustomEvent(nome, { detail: dati })); }
export function ascolta(nome, f) { const h = e => f(e.detail); bus.addEventListener(nome, h); return () => bus.removeEventListener(nome, h); }

export function rimanda(f, ms) {   // esegue f dopo ms dall'ultima chiamata; .subito() esegue ora
  let t = 0, args = null;
  const r = (...a) => { args = a; clearTimeout(t); t = setTimeout(() => { t = 0; f(...args); }, ms); };
  r.subito = () => { if (t) { clearTimeout(t); t = 0; return f(...(args || [])); } };
  r.inAttesa = () => !!t;
  return r;
}
export const stretta = () => !matchMedia('(min-width: 720px)').matches;
export const menoMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function scarica(blob, nome) {
  const u = URL.createObjectURL(blob);
  const a = el('a', { href: u, download: nome, style: { display: 'none' } });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 60000);
}
export async function sha16(dati) {   // primi 16 caratteri esadecimali dello SHA-256
  const b = dati instanceof Blob ? await dati.arrayBuffer() : dati;
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', b));
  return Array.from(h.subarray(0, 8), x => x.toString(16).padStart(2, '0')).join('');
}
