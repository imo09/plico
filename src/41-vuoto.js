// Riferimento: genera un PDF A4 vuoto (bianco, righe, quadretti) senza librerie.
export function pdfVuoto(pagine = 1, stile = 'bianco', misura = [595.28, 841.89]) {   // revisione 3: misura della pagina facoltativa
  const [L, A] = misura, n2 = v => v.toFixed(2);
  let c = '';
  if (stile === 'righe') { c = '0.79 0.82 0.82 RG 0.5 w\n'; for (let y = A - 85; y > 42; y -= 24) c += `42.5 ${n2(y)} m ${n2(L - 42.5)} ${n2(y)} l S\n`; }
  if (stile === 'quadretti') { const p = 14.173; c = '0.86 0.89 0.89 RG 0.4 w\n'; for (let x = p; x < L - 1; x += p) c += `${n2(x)} 0 m ${n2(x)} ${n2(A)} l S\n`; for (let y = A - p; y > 1; y -= p) c += `0 ${n2(y)} m ${n2(L)} ${n2(y)} l S\n`; }
  const ogg = [];
  ogg[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  ogg[2] = `<< /Type /Pages /Count ${pagine} /Kids [${Array.from({ length: pagine }, (_, i) => `${4 + i} 0 R`).join(' ')}] >>`;
  ogg[3] = `<< /Length ${c.length} >>\nstream\n${c}endstream`;
  for (let i = 0; i < pagine; i++) ogg[4 + i] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n2(L)} ${n2(A)}] /Resources << >> /Contents 3 0 R >>`;
  const d = new Date(), z = v => String(v).padStart(2, '0');
  const info = ogg.length;
  ogg[info] = `<< /Producer (plico) /CreationDate (D:${d.getUTCFullYear()}${z(d.getUTCMonth() + 1)}${z(d.getUTCDate())}${z(d.getUTCHours())}${z(d.getUTCMinutes())}${z(d.getUTCSeconds())}Z) >>`;
  let out = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n'; const pos = [];
  for (let i = 1; i < ogg.length; i++) { pos[i] = out.length; out += `${i} 0 obj\n${ogg[i]}\nendobj\n`; }
  const xref = out.length;
  out += `xref\n0 ${ogg.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < ogg.length; i++) out += String(pos[i]).padStart(10, '0') + ' 00000 n \n';
  out += `trailer\n<< /Size ${ogg.length} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const b = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) b[i] = out.charCodeAt(i) & 255;   // solo caratteri a un byte
  return b;
}
