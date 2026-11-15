// Riferimento: copia di sicurezza in formato .zip senza librerie (scrittura senza compressione, lettura anche di zip compressi).
const TAB = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = TAB[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

export async function creaZip(voci) {            // voci: [{ nome: 'Documenti/a.pdf', dati: Uint8Array | Blob }] -> Blob
  const enc = new TextEncoder(), parti = [], indice = [];
  let pos = 0;
  for (const v of voci) {
    const nome = enc.encode(v.nome);
    const blob = v.dati instanceof Blob ? v.dati : new Blob([v.dati]);
    const crc = crc32(new Uint8Array(await blob.arrayBuffer()));
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);   // 0x0800: nomi in UTF-8
    h.setUint16(12, 0x21, true);                                                                  // data fissa 01/01/1980
    h.setUint32(14, crc, true); h.setUint32(18, blob.size, true); h.setUint32(22, blob.size, true); h.setUint16(26, nome.length, true);
    parti.push(h.buffer, nome, blob);
    indice.push({ nome, crc, lung: blob.size, pos });
    pos += 30 + nome.length + blob.size;
  }
  const inizio = pos;
  for (const e of indice) {
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, e.crc, true); c.setUint32(20, e.lung, true); c.setUint32(24, e.lung, true); c.setUint16(28, e.nome.length, true); c.setUint32(42, e.pos, true);
    parti.push(c.buffer, e.nome); pos += 46 + e.nome.length;
  }
  const f = new DataView(new ArrayBuffer(22));
  f.setUint32(0, 0x06054b50, true); f.setUint16(8, indice.length, true); f.setUint16(10, indice.length, true); f.setUint32(12, pos - inizio, true); f.setUint32(16, inizio, true);
  parti.push(f.buffer);
  return new Blob(parti, { type: 'application/zip' });
}

export async function leggiZip(file) {           // file: Blob -> [{ nome, leggi(): Promise<Uint8Array> }]
  const coda = new Uint8Array(await file.slice(Math.max(0, file.size - 65557)).arrayBuffer());
  let i = coda.length - 22;
  while (i >= 0 && !(coda[i] === 0x50 && coda[i + 1] === 0x4b && coda[i + 2] === 5 && coda[i + 3] === 6)) i--;
  if (i < 0) throw new Error('Non è un file zip');
  const dv = new DataView(coda.buffer, coda.byteOffset, coda.byteLength);
  const quante = dv.getUint16(i + 10, true), lung = dv.getUint32(i + 12, true), inizio = dv.getUint32(i + 16, true);
  const dir = new Uint8Array(await file.slice(inizio, inizio + lung).arrayBuffer());
  const dd = new DataView(dir.buffer), dec = new TextDecoder(), voci = [];
  for (let p = 0, k = 0; k < quante && dd.getUint32(p, true) === 0x02014b50; k++) {
    const metodo = dd.getUint16(p + 10, true), compresso = dd.getUint32(p + 20, true), nl = dd.getUint16(p + 28, true), el = dd.getUint16(p + 30, true), cl = dd.getUint16(p + 32, true), dove = dd.getUint32(p + 42, true);
    const nome = dec.decode(dir.subarray(p + 46, p + 46 + nl));
    if (!nome.endsWith('/')) voci.push({ nome, async leggi() {
      const h = new DataView(await file.slice(dove, dove + 30).arrayBuffer());
      const da = dove + 30 + h.getUint16(26, true) + h.getUint16(28, true);
      const grezzo = file.slice(da, da + compresso);
      if (metodo === 0) return new Uint8Array(await grezzo.arrayBuffer());
      if (metodo === 8) return new Uint8Array(await new Response(grezzo.stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      throw new Error('Compressione non supportata: ' + nome);
    } });
    p += 46 + nl + el + cl;
  }
  return voci;
}
