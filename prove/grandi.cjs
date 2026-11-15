// Misura con un PDF grande (punto 153b-153h). Uso: node build.mjs && node prove/grandi.cjs [MB]
// Crea un PDF di circa MB megabyte (pagine con un'immagine non compressa, come una scansione), lo importa, lo apre,
// ci scrive 50 tratti e prepara il PDF con i segni. Stampa i tempi (la memoria non si misura: i buffer stanno fuori dalla memoria JavaScript).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const RADICE = path.resolve(__dirname, '..'), PORTA = 8183, URL0 = 'http://localhost:' + PORTA + '/';
const MB = Number(process.argv[2] || 200);
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, URL0).pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(RADICE, p);
  if (!f.startsWith(RADICE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.pdf': 'application/pdf', '.wasm': 'application/wasm', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
function scrivi(file, mb) {   // pagine A4 con un'immagine RGB di circa 1 MB ciascuna
  const L = 600, A = 580, bytesImg = L * A * 3, pagine = Math.max(1, Math.floor(mb * 1048576 / bytesImg) - 1);
  const fd = fs.openSync(file, 'w'); let pos = 0; const off = [];
  const w = b => { const buf = typeof b === 'string' ? Buffer.from(b, 'latin1') : b; fs.writeSync(fd, buf); pos += buf.length; };
  w('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n');
  const n = 2 + pagine * 3; // 1 catalogo, 2 pagine, poi per ogni pagina: pagina, contenuto, immagine
  off[1] = pos; w('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  off[2] = pos; w(`2 0 obj\n<< /Type /Pages /Count ${pagine} /Kids [${Array.from({ length: pagine }, (_, i) => (3 + i * 3) + ' 0 R').join(' ')}] >>\nendobj\n`);
  const img = Buffer.alloc(bytesImg);
  for (let i = 0; i < pagine; i++) {
    const p = 3 + i * 3, c = p + 1, im = p + 2;
    for (let y = 0; y < A; y++) for (let x = 0; x < L; x++) { const k = (y * L + x) * 3; img[k] = (x + i * 7) & 255; img[k + 1] = (y * 2) & 255; img[k + 2] = ((x ^ y) + i) & 255; }
    const cont = `q 495 0 0 478 50 300 cm /Im0 Do Q BT /F1 24 Tf 50 200 Td (Pagina ${i + 1}) Tj ET\n`;
    off[p] = pos; w(`${p} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${im} 0 R >> /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${c} 0 R >>\nendobj\n`);
    off[c] = pos; w(`${c} 0 obj\n<< /Length ${cont.length} >>\nstream\n${cont}endstream\nendobj\n`);
    off[im] = pos; w(`${im} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${L} /Height ${A} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${bytesImg} >>\nstream\n`); w(img); w('\nendstream\nendobj\n');
  }
  const x = pos;
  w(`xref\n0 ${n + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= n; i++) w(String(off[i]).padStart(10, '0') + ' 00000 n \n');
  w(`trailer\n<< /Size ${n + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`);
  fs.closeSync(fd);
  return pagine;
}
(async () => {
  const file = path.join(os.tmpdir(), 'plico-grande-' + MB + '.pdf');
  const pagine = scrivi(file, MB);
  const peso = fs.statSync(file).size;
  console.log(`PDF di prova: ${(peso / 1048576).toFixed(2).replace('.', ',')} MB, ${pagine} pagine`);
  await new Promise(r => server.listen(PORTA, r));
  const browser = await chromium.launch();
  const c = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const p = await c.newPage(); const errori = [];
  p.on('pageerror', e => errori.push(e.message)); p.on('console', m => { if (m.type() === 'error') errori.push(m.text()); });
  const sec = ms => (ms / 1000).toFixed(2).replace('.', ',') + ' s';
  await p.addInitScript(() => { try { sessionStorage.setItem('plico-visto', '1'); } catch {} });
  await p.goto(URL0); await p.waitForSelector('.libreria');
  let t0 = Date.now();
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('.testata .importa')]);
  await fc.setFiles(file); await p.waitForSelector('text=Importato:', { timeout: 300000 });
  console.log('Importazione: ' + sec(Date.now() - t0));
  t0 = Date.now();
  await p.click('.scheda .apri'); await p.waitForSelector('.page[data-page-number="1"] canvas.tela-penna', { timeout: 120000 });
  console.log('Prima pagina visibile: ' + sec(Date.now() - t0));
  await p.getByRole('button', { name: 'Scrivi', exact: true }).click(); await p.waitForTimeout(200);
  for (let i = 0; i < 50; i++) await p.evaluate(i => {
    const c = document.querySelector('.visore'), w = c.querySelector('.page[data-page-number="1"] .canvasWrapper'); c.scrollTop = 0; const pg = w.getBoundingClientRect();
    const y = 0.05 + (i % 25) * 0.012, x0 = i < 25 ? 0.1 : 0.55;
    const ev = (n, x, yy, b) => c.dispatchEvent(new PointerEvent(n, { pointerId: 2, pointerType: 'pen', isPrimary: true, pressure: b ? 0.6 : 0, buttons: b, button: 0, clientX: pg.left + x * pg.width, clientY: pg.top + yy * pg.height, bubbles: true, cancelable: true }));
    ev('pointerdown', x0, y, 1); for (let k = 1; k < 20; k++) ev('pointermove', x0 + k * 0.015, y + (k % 2) * 0.004, 1); ev('pointerup', x0 + 0.3, y, 0);
  }, i);
  await p.waitForTimeout(800);
  t0 = Date.now();
  const [d] = await Promise.all([p.waitForEvent('download', { timeout: 300000 }), (async () => { await p.click('[aria-label="Altre azioni"]'); await p.getByRole('menuitem', { name: 'Salva una copia' }).click(); })()]);
  const out = path.join(os.tmpdir(), 'plico-grande-copia.pdf'); await d.saveAs(out);
  const pesoOut = fs.statSync(out).size;
  console.log('PDF con 50 tratti preparato: ' + sec(Date.now() - t0) + ' - ' + ((pesoOut - peso) / 1048576).toFixed(2).replace('.', ',') + ' MB in più');
  const testa = Buffer.alloc(64); const fd = fs.openSync(out, 'r'); fs.readSync(fd, testa, 0, 64, 0); fs.closeSync(fd);
  const coda = fs.readFileSync(out).subarray(peso, peso + 9).toString('latin1');
  console.log('Originale intatto in testa: ' + (testa.toString('latin1').startsWith('%PDF-1.7') ? 'sì' : 'no') + ' - blocco plico subito dopo: ' + (coda.startsWith('%plico1 ') ? 'sì' : 'no'));
  console.log(errori.length ? 'Errori: ' + errori.join(' / ') : 'Nessun errore');
  await browser.close(); server.close();
  fs.unlinkSync(file); fs.unlinkSync(out);
})();
