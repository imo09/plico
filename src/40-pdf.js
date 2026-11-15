// Riferimento: componi e scomponi nel browser. Dipende da pdf.js, da getStroke (perfect-freehand) e da 36-segni.js.
// componi(pdfjs, base, segni, { getStroke, pdfjs: { standardFontDataUrl, wasmUrl }, password, tolleranza, impronta }) -> PDF con i segni
// Revisione 2: "base" può essere un Uint8Array o un Blob; con "impronta" nota non si rilegge l'originale. Senza segni torna "base" com'è.
// scomponi(file) -> { base, segni, plico }: se il file non viene da plico, base è il file intero e segni è vuoto
import { poligonoDi, semplifica, asseDi, impacchetta, spacchetta } from './36-segni.js';
import { getStroke } from './35-freehand.js';
import { leggi, segniDi } from './30-archivio.js';
const enc = new TextEncoder();
async function comprimi(testo) {
  const s = new Blob([testo]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function espandi(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return await new Response(s).text();
}
function inBase64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
function daBase64(t) { const s = atob(t); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
async function impronta(bytes) { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)); return Array.from(h.subarray(0, 8), x => x.toString(16).padStart(2, '0')).join(''); }

async function bloccoPlico(lung, ultimo, impr, segni) {
  let json = JSON.stringify(impacchetta(segni)), b64;
  for (;;) { b64 = inBase64(await comprimi(json)); if (!/startxref|%%EOF/.test(b64)) break; json += ' '; }
  const righe = b64.match(/.{1,76}/g).map(r => '%' + r).join('\n');
  const nl = (ultimo === 0x0a || ultimo === 0x0d) ? '' : '\n';
  return enc.encode(`${nl}%plico1 ${lung} ${impr} ${b64.length}\n${righe}\n`);
}
const linea = poli => { const a = new Array(poli.length * 3); for (let i = 0, j = 0; i < poli.length; i += 2) { a[j++] = NaN; a[j++] = NaN; a[j++] = NaN; a[j++] = NaN; a[j++] = poli[i]; a[j++] = poli[i + 1]; } return a; };
const rgb = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
function rettangolo(poli, m) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of poli) for (let i = 0; i < p.length; i += 2) { if (p[i] < x0) x0 = p[i]; if (p[i] > x1) x1 = p[i]; if (p[i + 1] < y0) y0 = p[i + 1]; if (p[i + 1] > y1) y1 = p[i + 1]; } return [x0 - m, y0 - m, x1 + m, y1 + m]; }

export async function componi(pdfjs, base, segni, opzioni = {}) {
  const vivi = segni.filter(s => !s.eliminato);
  if (!vivi.length) return base;                                         // nessun segno: il file resta l'originale, byte per byte
  const blob = base instanceof Blob, lung = blob ? base.size : base.length;
  const ultimo = blob ? new Uint8Array(await base.slice(lung - 1).arrayBuffer())[0] : base[lung - 1];
  const impr = opzioni.impronta || await impronta(blob ? await base.arrayBuffer() : base);
  const coda = await bloccoPlico(lung, ultimo, impr, segni);
  const dati = new Uint8Array(lung + coda.length);
  if (blob) await copiaBlob(base, dati); else dati.set(base);
  dati.set(coda, lung);
  const compito = pdfjs.getDocument({ data: dati, password: opzioni.password, ...opzioni.pdfjs });
  const doc = await compito.promise;
  try {
    const T = pdfjs.AnnotationEditorType, st = doc.annotationStorage;
    let n = 0; const metti = v => st.setValue('pdfjs_internal_editor_plico' + (n++), v);
    const pagine = new Map();
    for (const s of vivi) { if (!pagine.has(s.pagina)) pagine.set(s.pagina, []); pagine.get(s.pagina).push(s); }
    for (const [pagina, lista] of pagine) {
      const comune = { pageIndex: pagina, rotation: 0, user: 'plico' };
      for (const s of lista) if (s.tipo === 'evidenzia') {   // 1. evidenziazioni del testo (sotto)
        const quad = [], contorni = [];
        for (const [x0, y0, x1, y1] of s.riquadri) { quad.push(x0, y1, x1, y1, x0, y0, x1, y0); contorni.push([x0, y0, x1, y0, x1, y1, x0, y1]); }
        metti({ ...comune, annotationType: T.HIGHLIGHT, rect: rettangolo(contorni, 0), color: rgb(s.colore), opacity: 1, quadPoints: quad, outlines: contorni });
      }
      const contorno = s => semplifica(s._poligono || (s._poligono = poligonoDi(s, opzioni.getStroke)), opzioni.tolleranza ?? 0.03);
      for (const s of lista) if (s.tipo === 'tratto' && s.strumento === 'evidenziatore') {   // 2. evidenziatore a mano: una nota Ink per tratto, fusione "moltiplica"
        const poli = contorno(s);
        metti({ ...comune, annotationType: T.HIGHLIGHT, rect: rettangolo([poli], 1), color: rgb(s.colore), opacity: 1, thickness: s.spessore, outlines: { outline: linea(poli), points: [asseDi(s)] } });
      }
      const perColore = new Map();                                                    // 3. penna e forme: un timbro vettoriale per colore
      for (const s of lista) if (s.tipo === 'tratto' && s.strumento !== 'evidenziatore') { if (!perColore.has(s.colore)) perColore.set(s.colore, []); perColore.get(s.colore).push(contorno(s)); }
      for (const [colore, poli] of perColore) metti({ ...comune, annotationType: T.SIGNATURE, isSignature: true, areContours: true, rect: rettangolo(poli, 1), color: rgb(colore), thickness: 0, lines: poli.map(linea) });
      for (const s of lista) if (s.tipo === 'testo')                                  // 4. testo da tastiera (sopra)
        metti({ ...comune, annotationType: T.FREETEXT, rect: s.rett, color: rgb(s.colore), fontSize: s.corpo, value: s.testo });
    }
    return await doc.saveDocument();
  } finally { await compito.destroy(); }
}

async function copiaBlob(blob, dest) {   // copia un Blob in un buffer già pronto, a pezzi, senza una seconda copia intera
  const r = blob.stream().getReader(); let pos = 0;
  for (;;) { const { done, value } = await r.read(); if (done) break; dest.set(value, pos); pos += value.length; }
}
function cercaIndietro(file, ago) {   // ultima posizione di "ago" (bytes) nel file, -1 se manca
  salta: for (let i = file.length - ago.length; i >= 0; i--) { for (let k = 0; k < ago.length; k++) if (file[i + k] !== ago[k]) continue salta; return i; }
  return -1;
}
export async function scomponi(file) {
  const esterno = { base: file, segni: [], plico: false };
  const ago = enc.encode('%plico1 ');
  const qui = cercaIndietro(file, ago);
  if (qui < 0) return esterno;
  const dec = new TextDecoder('latin1');
  const fineRiga = file.indexOf(0x0a, qui);
  const m = /^%plico1 (\d+) ([0-9a-f]{16}) (\d+)$/.exec(dec.decode(file.subarray(qui, fineRiga)));
  if (!m) return esterno;
  const lung = Number(m[1]), car = Number(m[3]);
  if (qui !== lung && qui !== lung + 1) return esterno;                 // l'intestazione sta subito dopo l'originale
  const base = file.subarray(0, lung);
  if (await impronta(base) !== m[2]) return esterno;
  let i = fineRiga + 1, b64 = '';
  while (b64.length < car && file[i] === 0x25) { const f = file.indexOf(0x0a, i); b64 += dec.decode(file.subarray(i + 1, f)); i = f + 1; }
  if (b64.length !== car) return esterno;
  const resto = dec.decode(file.subarray(i));
  if (resto.length && (resto.match(/%%EOF/g) || []).length !== 1) return esterno;   // qualcun altro ha scritto dopo plico
  try { return { base, segni: spacchetta(JSON.parse(await espandi(daBase64(b64)))), plico: true }; } catch { return esterno; }
}

// ---- aggiunte della 2.0 (non nell'appendice A2) ----
const CODA = 16 * 1048576;
// come scomponi, ma su un Blob: cerca il blocco negli ultimi 16 MB e prende l'originale come fetta, senza copiarlo
export async function scomponiBlob(file) {
  const da = Math.max(0, file.size - CODA);
  const coda = new Uint8Array(await file.slice(da).arrayBuffer());
  const esterno = { base: file, segni: [], plico: false };
  const qui = cercaIndietro(coda, enc.encode('%plico1 '));
  if (qui < 0) {
    if (!da) return esterno;
    const r = await scomponi(new Uint8Array(await file.arrayBuffer()));   // blocco più grande di 16 MB: caso raro
    return r.plico ? { ...r, base: file.slice(0, r.base.length) } : esterno;
  }
  const dec = new TextDecoder('latin1');
  const fineRiga = coda.indexOf(0x0a, qui);
  if (fineRiga < 0) return esterno;
  const m = /^%plico1 (\d+) ([0-9a-f]{16}) (\d+)$/.exec(dec.decode(coda.subarray(qui, fineRiga)));
  if (!m) return esterno;
  const lung = Number(m[1]), car = Number(m[3]), assoluto = da + qui;
  if (assoluto !== lung && assoluto !== lung + 1) return esterno;
  const base = file.slice(0, lung, 'application/pdf');
  if (await impronta(await base.arrayBuffer()) !== m[2]) return esterno;
  let i = fineRiga + 1, b64 = '';
  while (b64.length < car && coda[i] === 0x25) { const f = coda.indexOf(0x0a, i); if (f < 0) return esterno; b64 += dec.decode(coda.subarray(i + 1, f)); i = f + 1; }
  if (b64.length !== car) return esterno;
  const resto = dec.decode(coda.subarray(i));
  if (resto.length && (resto.match(/%%EOF/g) || []).length !== 1) return esterno;
  try { return { base, segni: spacchetta(JSON.parse(await espandi(daBase64(b64)))), plico: true, impronta: m[2] }; } catch { return esterno; }
}

let pronto = null;
export function carica() {
  return pronto || (pronto = (async () => {
    const pdfjs = await import('./lib/pdfjs/pdf.min.mjs');
    globalThis.pdfjsLib = pdfjs;                               // serve prima di caricare il visore
    const visore = await import('./lib/pdfjs/pdf_viewer.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('lib/pdfjs/pdf.worker.min.mjs', location.href).href;
    const OPZIONI = { standardFontDataUrl: new URL('lib/pdfjs/standard_fonts/', location.href).href,
      wasmUrl: new URL('lib/pdfjs/wasm/', location.href).href,
      cMapUrl: new URL('lib/pdfjs/cmaps/', location.href).href, cMapPacked: true, isEvalSupported: false };
    class TrasportoBlob extends pdfjs.PDFDataRangeTransport {
      constructor(blob) { super(blob.size, null); this.blob = blob; }
      requestDataRange(da, a) {
        this.blob.slice(da, a).arrayBuffer().then(b => this.onDataRange(da, new Uint8Array(b)), e => console.error('Lettura del PDF', e));
      }
    }
    return { pdfjs, visore, OPZIONI, TrasportoBlob };
  })().catch(e => { pronto = null; throw e; }));
}

// apre un PDF a pezzi dal Blob. chiediPassword(sbagliata) -> Promise<string|null>
export async function apriDocumento(blob, { chiediPassword } = {}) {
  const { pdfjs, OPZIONI, TrasportoBlob } = await carica();
  const compito = pdfjs.getDocument({ range: new TrasportoBlob(blob), length: blob.size, rangeChunkSize: 1048576, disableAutoFetch: true, disableStream: true, ...OPZIONI });
  let password = null;
  if (chiediPassword) compito.onPassword = async (rispondi, motivo) => {
    const p = await chiediPassword(motivo === pdfjs.PasswordResponses.INCORRECT_PASSWORD);
    if (p === null) { compito.destroy(); return; }
    password = p; rispondi(p);
  };
  const doc = await compito.promise;
  return { compito, doc, password: () => password };
}

// disegna i segni di una pagina su un contesto: sx, sy = pixel della tela per px CSS del viewport
export function disegnaSegni(ctx, lista, viewport, sx, sy, { evidenziatori = true, penne = true, miscela = false } = {}) {
  ctx.save();
  ctx.setTransform(sx, 0, 0, sy, 0, 0);
  ctx.transform(...viewport.transform);
  const riempi = s => {
    const p = s._poligono || (s._poligono = poligonoDi(s, getStroke));
    if (p.length < 6) return;
    ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.closePath(); ctx.fillStyle = s.colore; ctx.fill();
  };
  if (evidenziatori) {
    if (miscela) ctx.globalCompositeOperation = 'multiply';
    for (const s of lista) if (!s.eliminato && s.tipo === 'tratto' && s.strumento === 'evidenziatore') riempi(s);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (penne) for (const s of lista) if (!s.eliminato && s.tipo === 'tratto' && s.strumento !== 'evidenziatore') riempi(s);
  ctx.restore();
}

// miniatura della prima pagina con i suoi segni, larga 320 px, in WebP
export async function miniatura(doc, segni) {
  const pagina = await doc.getPage(1);
  const v1 = pagina.getViewport({ scale: 1 });
  const viewport = pagina.getViewport({ scale: 320 / v1.width });
  const c = document.createElement('canvas');
  c.width = Math.round(viewport.width); c.height = Math.round(viewport.height);
  const ctx = c.getContext('2d', { alpha: false });
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, c.width, c.height);
  await pagina.render({ canvasContext: ctx, canvas: c, viewport }).promise;
  disegnaSegni(ctx, (segni || []).filter(s => s.pagina === 0), viewport, c.width / viewport.width, c.height / viewport.height, { miscela: true });
  const b = await new Promise(r => c.toBlob(r, 'image/webp', 0.8));
  c.width = c.height = 0;
  return b;
}

// il file da dare fuori: l'originale con i segni (punto 110), oppure l'originale identico se non ci sono segni
export async function fileDi(scheda, { password, segni } = {}) {
  const base = await leggi('basi', scheda.id);
  if (!base) throw new Error('Manca il PDF originale di "' + scheda.nome + '" su questo dispositivo.');
  const lista = segni || await segniDi(scheda.id);
  if (!lista.some(s => !s.eliminato)) return base;
  const { pdfjs, OPZIONI } = await carica();
  const out = await componi(pdfjs, base, lista, { getStroke, pdfjs: OPZIONI, password, impronta: scheda.impronta });
  return out instanceof Blob ? out : new Blob([out], { type: 'application/pdf' });
}
