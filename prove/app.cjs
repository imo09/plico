// Prove dell'app costruita, in Chromium con Playwright. Uso: node build.mjs && node prove/app.cjs [--schermate]
// Serve la cartella del progetto su http://localhost:8181, prova le storie principali e, con --schermate, salva le schermate in prove/schermate/.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const RADICE = path.resolve(__dirname, '..'), PORTA = 8181, URL0 = 'http://localhost:' + PORTA + '/';
const TIPI = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf', '.wasm': 'application/wasm', '.bcmap': 'application/octet-stream', '.pfb': 'application/octet-stream', '.ttf': 'font/ttf' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, URL0).pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(RADICE, p);
  if (!f.startsWith(RADICE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'Content-Type': TIPI[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
const esiti = []; let falliti = 0;
async function prova(nome, f) {
  const t0 = Date.now();
  try { await f(); esiti.push('ok   ' + nome + ' (' + ((Date.now() - t0) / 1000).toFixed(2) + ' s)'); }
  catch (e) { falliti++; esiti.push('NO   ' + nome + ': ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
}
const vero = (c, msg) => { if (!c) throw new Error(msg); };

async function nuovaPagina(browser, opz = {}) {
  const c = await browser.newContext({ viewport: { width: 1333, height: 800 }, acceptDownloads: true, ...opz });
  const p = await c.newPage();
  p.errori = [];
  p.on('console', m => { const t = m.text(); if (m.type() === 'error' || /Content Security Policy/i.test(t)) p.errori.push(t); });
  p.on('pageerror', e => p.errori.push('pagina: ' + e.message));
  return { c, p };
}
const segniInArchivio = (p, doc) => p.evaluate(doc => new Promise((ok, ko) => {
  const r = indexedDB.open('plico'); r.onerror = () => ko(r.error);
  r.onsuccess = () => { const t = r.result.transaction('segni').objectStore('segni').index('doc').getAll(doc); t.onsuccess = () => { ok(t.result.map(s => ({ id: s.id, tipo: s.tipo, eliminato: s.eliminato, strumento: s.strumento, pagina: s.pagina, n: s.punti?.length, testo: s.testo, gruppo: s.gruppo, punti: s.punti ? Array.from(s.punti.slice(0, 2)) : null }))); r.result.close(); }; };
}), doc);
const docAperto = p => p.evaluate(() => (/^#doc-([a-z0-9]{8})$/.exec(location.hash) || [])[1]);
async function attendiDocumento(p) { await p.waitForFunction(() => /^#doc-/.test(location.hash) && document.querySelector('.canvasWrapper canvas.tela-penna') || document.querySelector('.visore .page[data-loaded]'), null, { timeout: 15000 }); await p.waitForTimeout(400); }
// tratto con eventi sintetici di penna (punto 147)
async function tratto(p, punti, { tipo = 'pen', pagina = 1, bottoni = 1, id = 7 } = {}) {
  await p.evaluate(({ punti, tipo, pagina, bottoni, id }) => {
    const c = document.querySelector('.visore'), w = c.querySelector('.page[data-page-number="' + pagina + '"] .canvasWrapper');
    let pg = w.getBoundingClientRect(), cr = c.getBoundingClientRect();
    const ys = punti.map(q => pg.top + q[1] * pg.height);   // porta in vista la zona del tratto, come farebbe chi scrive
    if (Math.min(...ys) < cr.top + 20 || Math.max(...ys) > cr.bottom - 80) { c.scrollTop += Math.min(...ys) - cr.top - 120; pg = w.getBoundingClientRect(); }
    const ev = (n, [x, y], b) => c.dispatchEvent(new PointerEvent(n, { pointerId: id, pointerType: tipo, isPrimary: true, pressure: b ? 0.6 : 0, buttons: b, button: n === 'pointermove' ? -1 : 0, clientX: pg.left + x * pg.width, clientY: pg.top + y * pg.height, bubbles: true, cancelable: true }));
    ev('pointerdown', punti[0], bottoni);
    for (const q of punti.slice(1)) ev('pointermove', q, bottoni);
    ev('pointerup', punti[punti.length - 1], 0);
  }, { punti, tipo, pagina, bottoni, id });
}
const zigzag = (x0, y0, n = 20) => Array.from({ length: n }, (_, i) => [x0 + i * 0.01, y0 + (i % 2 ? 0.01 : 0)]);

(async () => {
  await new Promise(r => server.listen(PORTA, r));
  const browser = await chromium.launch();
  const schermate = process.argv.includes('--schermate');
  let docProva = null, fileEsportato = null, zipCopia = null;
  const { c, p } = await nuovaPagina(browser);

  await prova('costruzione: index.html sotto 0,40 MB, senza indirizzi esterni', async () => {
    const t = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
    vero(Buffer.byteLength(t) < 0.4 * 1048576, 'index.html pesa ' + Buffer.byteLength(t));
    const esterni = (t.match(/https?:\/\/[a-z0-9.-]+/gi) || []).filter(u => !/www\.w3\.org|dropbox(api)?\.com/.test(u));
    vero(!esterni.length, 'indirizzi esterni: ' + esterni.join(', '));
  });
  await prova('avvio: libreria vuota, nessun errore', async () => {
    await p.goto(URL0); await p.waitForSelector('text=Qui arriveranno i tuoi PDF');
    vero(!p.errori.length, p.errori.join(' / '));
  });
  await prova('documento di prova: 4 pagine, miniatura salvata', async () => {
    await p.getByRole('button', { name: 'Apri il documento di prova' }).click();
    await attendiDocumento(p);
    docProva = await docAperto(p);
    vero((await p.textContent('.indicatore')).trim() === '1 / 4', 'indicatore ' + await p.textContent('.indicatore'));
    const mini = await p.evaluate(id => new Promise(ok => { const r = indexedDB.open('plico'); r.onsuccess = () => { const g = r.result.transaction('miniature').objectStore('miniature').get(id); g.onsuccess = () => ok(g.result ? g.result.size : 0); }; }), docProva);
    vero(mini > 1000, 'miniatura ' + mini);
  });
  await prova('ricerca nel testo: "Compenso" trovato', async () => {
    await p.keyboard.press('Control+f'); await p.keyboard.type('Compenso');
    await p.waitForFunction(() => /di \d+/.test(document.querySelector('.barra-cerca .esito')?.textContent || ''), null, { timeout: 8000 });
    await p.keyboard.press('Escape');
  });
  await prova('scrittura: penna con pressione, salvata e ritrovata dopo la ricarica (S2)', async () => {
    await p.getByRole('button', { name: 'Scrivi', exact: true }).click();
    await p.waitForSelector('.barra-strumenti:not([hidden])');
    await tratto(p, zigzag(0.2, 0.15));
    await tratto(p, zigzag(0.2, 0.25));
    await p.waitForTimeout(700);
    let s = await segniInArchivio(p, docProva);
    vero(s.filter(x => !x.eliminato).length === 2, 'segni salvati: ' + JSON.stringify(s));
    vero((await p.textContent('.salvataggio')).includes('Salvato'), 'stato ' + await p.textContent('.salvataggio'));
    await p.reload(); await attendiDocumento(p);
    s = await segniInArchivio(p, docProva);
    vero(s.filter(x => !x.eliminato).length === 2, 'dopo ricarica: ' + s.length);
    const pixel = await p.evaluate(() => { const c = document.querySelector('.page[data-page-number="1"] canvas.tela-penna'); if (!c) return -1; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
    vero(pixel > 50, 'tela vuota dopo la ricarica: ' + pixel);
  });
  await prova('dopo la penna si apre in Scrittura; tasto della S Pen cancella; Annulla ripristina', async () => {
    vero(await p.isVisible('.barra-strumenti'), 'non è in Scrittura');
    await tratto(p, [[0.15, 0.155], [0.45, 0.155]], { bottoni: 33 });   // buttons & 32: tasto laterale
    await p.waitForTimeout(600);
    let s = await segniInArchivio(p, docProva);
    vero(s.filter(x => x.eliminato).length === 1, 'gomma: ' + JSON.stringify(s));
    await p.keyboard.press('Control+z'); await p.waitForTimeout(600);
    s = await segniInArchivio(p, docProva);
    vero(s.filter(x => !x.eliminato).length === 2, 'annulla: ' + JSON.stringify(s));
  });
  await prova('evidenziatore: a mano libera con linea dritta, agganciato al testo, palmo ignorato', async () => {
    await p.keyboard.press('e');
    await tratto(p, [[0.01, 0.50], [0.03, 0.502], [0.06, 0.499], [0.085, 0.501]]);   // nel margine: a mano libera
    await tratto(p, [[0.33, 0.201], [0.5, 0.202], [0.62, 0.201]]);                       // sopra una riga di testo: agganciato
    await tratto(p, zigzag(0.6, 0.6), { tipo: 'touch', id: 9 });   // un dito subito dopo la penna: palmo
    await p.waitForTimeout(600);
    const s = await segniInArchivio(p, docProva);
    vero(s.filter(x => x.strumento === 'evidenziatore').length === 1, 'evidenziatore a mano: ' + JSON.stringify(s));
    vero(s.filter(x => x.tipo === 'evidenzia').length === 1, 'evidenziatore sul testo: ' + JSON.stringify(s));
    vero(s.length === 4, 'il palmo ha scritto: ' + s.length);
    await p.keyboard.press('p');
  });
  await prova('testo con accenti ed euro, forma, Seleziona e sposta, tocco con due dita annulla', async () => {
    await p.keyboard.press('t');
    await tratto(p, [[0.1, 0.9], [0.1, 0.9]], { tipo: 'mouse', id: 1 });
    await p.waitForSelector('.editor-testo textarea');
    await p.keyboard.type('Prezzo 20 € già');
    await tratto(p, [[0.5, 0.5], [0.5, 0.5]], { tipo: 'mouse', id: 1 });   // tocco fuori: conferma
    await p.waitForTimeout(500);
    let s = await segniInArchivio(p, docProva);
    vero(s.some(x => x.tipo === 'testo' && x.testo === 'Prezzo 20 € già' && !x.eliminato), 'testo: ' + JSON.stringify(s.filter(x => x.tipo === 'testo')));
    await p.keyboard.press('f');
    await tratto(p, [[0.6, 0.62], [0.7, 0.66], [0.8, 0.7]]);
    await p.waitForTimeout(400);
    s = await segniInArchivio(p, docProva);
    const forma = s.find(x => x.strumento === 'forma' && !x.eliminato);
    vero(forma, 'forma: ' + JSON.stringify(s));
    await p.keyboard.press('s');
    await tratto(p, [[0.6, 0.62], [0.6, 0.62]]);
    await p.waitForSelector('.sel-box');
    await tratto(p, [[0.7, 0.62], [0.72, 0.6], [0.75, 0.58]]);
    await p.waitForTimeout(500);
    s = await segniInArchivio(p, docProva);
    const forme = s.filter(x => x.strumento === 'forma');
    vero(forme.length === 2 && forme.filter(x => !x.eliminato).length === 1 && forme.find(x => !x.eliminato).punti[0] > forma.punti[0], 'spostamento: ' + JSON.stringify(forme));
    await p.waitForTimeout(800);   // lontano dall'ultimo segnale della penna, il dito conta
    await p.evaluate(() => {
      const c = document.querySelector('.visore'), r = c.getBoundingClientRect();
      const ev = (n, id, x) => c.dispatchEvent(new PointerEvent(n, { pointerId: id, pointerType: 'touch', isPrimary: id === 21, clientX: r.left + x, clientY: r.top + 300, buttons: n === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true }));
      ev('pointerdown', 21, 300); ev('pointerdown', 22, 400); ev('pointerup', 21, 300); ev('pointerup', 22, 400);
    });
    await p.waitForTimeout(600);
    s = await segniInArchivio(p, docProva);
    const vive = s.filter(x => x.strumento === 'forma' && !x.eliminato);
    vero(vive.length === 1 && vive[0].id === forma.id, 'annulla con due dita: ' + JSON.stringify(s.filter(x => x.strumento === 'forma')));
    await p.keyboard.press('p');
  });
  await prova('immagine e firma inserite', async () => {
    await p.click('[aria-label="Inserisci un\'immagine o la firma"]');
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.getByRole('menuitem', { name: 'Immagine' }).click()]);
    await fc.setFiles(path.join(RADICE, 'icone/icona-192.png'));
    await p.waitForSelector('text=Immagine inserita');
    await p.click('[aria-label="Inserisci un\'immagine o la firma"]'); await p.getByRole('menuitem', { name: 'Firma' }).click();
    await p.waitForSelector('.blocco-firma');
    await p.evaluate(() => { const c = document.querySelector('.blocco-firma'), r = c.getBoundingClientRect();
      const ev = (n, x, y) => c.dispatchEvent(new PointerEvent(n, { pointerId: 4, pointerType: 'pen', pressure: 0.5, buttons: n === 'pointerup' ? 0 : 1, clientX: r.left + x, clientY: r.top + y, bubbles: true }));
      for (const y0 of [60, 100]) { ev('pointerdown', 30, y0); for (let i = 1; i < 20; i++) ev('pointermove', 30 + i * 10, y0 + (i % 3) * 8); ev('pointerup', 230, y0); } });
    await p.getByRole('button', { name: 'Inserisci', exact: true }).click();
    await p.waitForSelector('text=Firma inserita'); await p.waitForTimeout(500);
    const s = await segniInArchivio(p, docProva);
    vero(s.some(x => x.tipo === 'immagine'), 'immagine mancante');
    const g = s.filter(x => x.gruppo && !x.eliminato); vero(g.length === 2 && g[0].gruppo === g[1].gruppo, 'firma: ' + JSON.stringify(g));
    await p.keyboard.press('p');
  });
  await prova('Salva una copia: PDF con blocco plico e annotazioni con autore plico (S4)', async () => {
    const [d] = await Promise.all([p.waitForEvent('download'), (async () => { await p.click('.testa-doc [aria-label="Altre azioni"]'); await p.getByRole('menuitem', { name: 'Salva una copia' }).click(); })()]);
    fileEsportato = path.join(require('os').tmpdir(), 'plico-copia.pdf'); await d.saveAs(fileEsportato);
    const b = fs.readFileSync(fileEsportato), t = b.toString('latin1');
    vero(t.includes('%plico1 '), 'manca il blocco plico');
    vero(b.length > fs.statSync(path.join(RADICE, 'esempi/prova.pdf')).size, 'il file non è cresciuto');
    const autori = await p.evaluate(async b64 => {
      const pdfjs = await import('./lib/pdfjs/pdf.min.mjs');
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise;
      const a = await (await doc.getPage(1)).getAnnotations();
      return a.map(x => x.titleObj?.str || x.title || '');
    }, b.toString('base64'));
    vero(autori.length >= 2 && autori.every(a => a === 'plico'), 'annotazioni: ' + JSON.stringify(autori));
    const tipi = await p.evaluate(async b64 => {
      const pdfjs = await import('./lib/pdfjs/pdf.min.mjs');
      const doc = await pdfjs.getDocument({ data: Uint8Array.from(atob(b64), c => c.charCodeAt(0)), isEvalSupported: false }).promise;
      return (await (await doc.getPage(1)).getAnnotations()).map(a => a.subtype + ':' + (a.contentsObj?.str || ''));
    }, b.toString('base64'));
    vero(tipi.some(x => x.startsWith('FreeText:Prezzo 20 € già')) && tipi.some(x => x.startsWith('Highlight')) && tipi.filter(x => x.startsWith('Stamp')).length >= 2, 'tipi: ' + JSON.stringify(tipi));
  });
  await prova('importare il PDF esportato: segni di nuovo modificabili (S8)', async () => {
    await p.click('.testa-doc [aria-label="Torna alla libreria"]');
    await p.waitForSelector('.libreria');
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('.testata .importa')]);
    await fc.setFiles(fileEsportato);
    await p.waitForSelector('text=Importato: plico-copia');
    const id = await p.evaluate(() => new Promise(ok => { const r = indexedDB.open('plico'); r.onsuccess = () => { const g = r.result.transaction('documenti').objectStore('documenti').getAll(); g.onsuccess = () => ok(g.result.find(d => d.nome === 'plico-copia').id); }; }));
    const s = await segniInArchivio(p, id);
    vero(s.filter(x => !x.eliminato).length === 9, 'segni importati: ' + JSON.stringify(s));
  });
  await prova('Cestino con Annulla (S5)', async () => {
    const scheda = p.locator('.scheda', { hasText: 'plico-copia' });
    await scheda.locator('.puntini').click();
    await p.getByRole('menuitem', { name: 'Sposta nel cestino' }).click();
    await p.waitForSelector('.avviso >> text=Annulla');
    vero(!(await p.isVisible('.scheda >> text=plico-copia')), 'ancora visibile');
    await p.click('.avviso-azione');
    await p.waitForSelector('.scheda >> text=plico-copia');
  });
  await prova('selezione multipla: due documenti spostati in una cartella nuova con l\'explorer', async () => {
    await p.click('.testata .entra-sel');
    const schede = p.locator('.scheda .apri'); await schede.nth(0).click(); await schede.nth(1).click();
    await p.waitForSelector('text=2 selezionati');
    await p.click('.azione-sel[aria-label="Sposta"]');
    await p.getByRole('button', { name: 'Nuova cartella qui' }).click();
    await p.fill('.foglio-piccolo input', 'Archivio'); await p.getByRole('button', { name: 'Crea' }).click();
    await p.waitForSelector('.esplora-percorso >> text=Tutti i documenti / Archivio');
    await p.getByRole('button', { name: 'Sposta qui' }).click();
    await p.waitForSelector('text=Spostati 2 elementi in Archivio');
    const n = await p.evaluate(() => new Promise(ok => { const r = indexedDB.open('plico'); r.onsuccess = () => { const t = r.result.transaction(['documenti', 'cartelle']); const d = t.objectStore('documenti').getAll(), c = t.objectStore('cartelle').getAll(); t.oncomplete = () => { const a = c.result.find(x => x.nome === 'Archivio'); ok(d.result.filter(x => x.cartella === a?.id).length); }; }; }));
    vero(n === 2, 'documenti nella cartella: ' + n);
  });
  await prova('pannello Pagine: elimina una pagina, Annulla la rimette', async () => {
    await p.goto(URL0 + '#doc-' + docProva); await attendiDocumento(p);
    await p.click('.testa-doc [aria-label="Altre azioni"]'); await p.getByRole('menuitem', { name: 'Pagine' }).click();
    await p.waitForSelector('.griglia-pagine');
    await p.click('[aria-label="Azioni per la pagina 2"]'); await p.getByRole('menuitem', { name: 'Elimina la pagina' }).click();
    await p.waitForFunction(() => document.querySelector('.indicatore')?.textContent.includes('/ 3'), null, { timeout: 15000 });
    await p.waitForSelector('.foglio-pagine');   // il pannello si riapre da solo dopo ogni cambio
    await p.click('.foglio-pagine >> text=Chiudi');
    await p.click('.avviso-azione');
    await p.waitForFunction(() => document.querySelector('.indicatore')?.textContent.includes('/ 4'), null, { timeout: 15000 });
    const s = await segniInArchivio(p, docProva);
    vero(s.filter(x => !x.eliminato).length >= 8, 'segni dopo Annulla: ' + s.filter(x => !x.eliminato).length);
  });
  await prova('doppio tocco in Lettura ingrandisce', async () => {
    if (await p.isVisible('.barra-strumenti')) await p.click('[aria-label="Leggi"]');
    const prima = await p.evaluate(() => document.querySelector('.page').getBoundingClientRect().width);
    await p.evaluate(() => { const c = document.querySelector('.visore'), r = c.getBoundingClientRect();
      const ev = (n) => c.dispatchEvent(new PointerEvent(n, { pointerId: 31, pointerType: 'touch', isPrimary: true, clientX: r.left + 400, clientY: r.top + 300, bubbles: true }));
      ev('pointerdown'); ev('pointerup'); ev('pointerdown'); ev('pointerup'); });
    await p.waitForTimeout(800);
    const dopo = await p.evaluate(() => document.querySelector('.page').getBoundingClientRect().width);
    vero(dopo > prima * 1.5, 'larghezza ' + prima + ' -> ' + dopo);
  });
  await prova('tele solo per le pagine in vista: al massimo 3, sotto 8 milioni di pixel (50 pagine)', async () => {
    const { pdfVuoto } = await import(path.join(RADICE, 'src/41-vuoto.js'));
    const f = path.join(require('os').tmpdir(), 'cinquanta.pdf'); fs.writeFileSync(f, pdfVuoto(50, 'righe'));
    await p.goto(URL0 + '#libreria'); await p.waitForSelector('.libreria');
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('.testata .importa')]); await fc.setFiles(f);
    await p.waitForSelector('text=Importato: cinquanta');
    await p.click('.scheda >> text=cinquanta'); await attendiDocumento(p);
    if (!(await p.isVisible('.barra-strumenti'))) await p.getByRole('button', { name: 'Scrivi', exact: true }).click();
    let massimo = 0, pixel = 0;
    for (let i = 0; i < 40; i++) {
      await p.evaluate(() => { const c = document.querySelector('.visore'); c.scrollTop += c.clientHeight * 1.2; });
      await p.waitForTimeout(120);
      const m = await p.evaluate(() => { const t = [...document.querySelectorAll('canvas.tela-penna')].filter(c => c.width > 0); return [t.length, Math.max(0, ...t.map(c => c.width * c.height))]; });
      massimo = Math.max(massimo, m[0]); pixel = Math.max(pixel, m[1]);
    }
    vero(massimo <= 3 && massimo >= 1, 'tele contemporanee: ' + massimo);
    vero(pixel <= 8388608, 'pixel per tela: ' + pixel);
  });
  await prova('prova della penna: legge tipo e pressione', async () => {
    await p.goto(URL0 + '#penna'); await p.waitForSelector('text=Prova la penna');
    await p.evaluate(() => { const c = document.querySelector('.blocco-prova'), r = c.getBoundingClientRect();
      const ev = (n, x) => c.dispatchEvent(new PointerEvent(n, { pointerId: 5, pointerType: 'pen', pressure: 0.42, buttons: n === 'pointerup' ? 0 : 1, clientX: r.left + x, clientY: r.top + 50, bubbles: true }));
      ev('pointerdown', 20); ev('pointermove', 60); ev('pointermove', 90); });
    const v = await p.textContent('.lettura-penna');
    vero(v.includes('Penna') && v.includes('0,42'), 'lettura: ' + v);
  });
  await prova('documento vuoto a righe, Aggiungi pagina, si apre in Scrittura', async () => {
    await p.goto(URL0 + '#libreria'); await p.waitForSelector('.libreria');
    await p.click('.tondo.piu'); await p.getByRole('menuitem', { name: 'Nuovo documento vuoto' }).click();
    await p.getByRole('button', { name: /A righe/ }).click();
    await attendiDocumento(p);
    vero(await p.isVisible('.barra-strumenti'), 'non in Scrittura');
    await p.keyboard.press('p');
    await tratto(p, zigzag(0.2, 0.2)); await p.waitForTimeout(500);
    await p.click('.testa-doc [aria-label="Altre azioni"]'); await p.getByRole('menuitem', { name: 'Aggiungi pagina' }).click();
    await p.waitForFunction(() => document.querySelector('.indicatore')?.textContent.includes('/ 2'), null, { timeout: 10000 });
    const s = await segniInArchivio(p, await docAperto(p));
    vero(s.length === 1, 'segni dopo Aggiungi pagina: ' + s.length);
  });
  await prova('copia di sicurezza: Esporta, poi Importa con Unisci in un archivio vuoto', async () => {
    await p.goto(URL0 + '#impostazioni'); await p.waitForSelector('.impostazioni');
    const [d] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Esporta', exact: true }).click()]);
    zipCopia = path.join(require('os').tmpdir(), 'plico-copia.zip'); await d.saveAs(zipCopia);
    const { c: c2, p: p2 } = await nuovaPagina(browser);
    await p2.goto(URL0 + '#impostazioni'); await p2.waitForSelector('.impostazioni');
    const [fc] = await Promise.all([p2.waitForEvent('filechooser'), p2.getByRole('button', { name: 'Scegli' }).click()]);
    await fc.setFiles(zipCopia);
    await p2.getByRole('button', { name: /Unisci/ }).click();
    await p2.waitForSelector('text=documenti importati', { timeout: 20000 });
    const conta = await p2.evaluate(() => new Promise(ok => { const r = indexedDB.open('plico'); r.onsuccess = () => { const t = r.result.transaction(['documenti', 'segni']); const a = t.objectStore('documenti').getAll(), b = t.objectStore('segni').getAll(); t.oncomplete = () => ok({ d: a.result.length, s: b.result.length }); }; }));
    const qui = await p.evaluate(() => new Promise(ok => { const r = indexedDB.open('plico'); r.onsuccess = () => { const t = r.result.transaction(['documenti', 'segni']); const a = t.objectStore('documenti').getAll(), b = t.objectStore('segni').getAll(); t.oncomplete = () => ok({ d: a.result.length, s: b.result.length }); }; }));
    vero(conta.d === qui.d && conta.s === qui.s, 'copia ' + JSON.stringify(conta) + ' originale ' + JSON.stringify(qui));
    vero(!p2.errori.length, p2.errori.join(' / '));
    await c2.close();
  });
  await prova('senza rete alla seconda apertura (S6)', async () => {
    await p.goto(URL0); await p.waitForSelector('.libreria');
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.waitForTimeout(800);
    await c.setOffline(true);
    await p.reload(); await p.waitForSelector('.libreria', { timeout: 10000 });
    await p.click('.scheda >> text=Documento di prova'); await attendiDocumento(p);
    await c.setOffline(false);
  });
  await prova('nessun errore e nessuna violazione della regola di sicurezza', async () => { vero(!p.errori.length, p.errori.join(' / ')); });

  if (schermate) {
    const dir = path.join(RADICE, 'prove/schermate'); fs.mkdirSync(dir, { recursive: true });
    for (const [w, h] of [[360, 640], [390, 844], [800, 1280], [1333, 800], [1440, 900]]) for (const tema of ['chiaro', 'scuro']) {
      const { c: cc, p: pp } = await nuovaPagina(browser, { viewport: { width: w, height: h }, colorScheme: tema === 'scuro' ? 'dark' : 'light', deviceScaleFactor: 1 });
      await pp.addInitScript(() => { try { sessionStorage.setItem('plico-visto', '1'); } catch {} });
      await pp.goto(URL0); await pp.waitForSelector('.libreria');
      await pp.getByRole('button', { name: 'Apri il documento di prova' }).click(); await attendiDocumento(pp);
      await pp.getByRole('button', { name: 'Scrivi', exact: true }).click();
      await tratto(pp, zigzag(0.15, 0.2, 30)); await pp.waitForTimeout(300);
      await pp.screenshot({ path: path.join(dir, `documento-${w}x${h}-${tema}.png`) });
      await pp.click('.testa-doc [aria-label="Torna alla libreria"]'); await pp.waitForSelector('.libreria'); await pp.waitForTimeout(400);
      await pp.screenshot({ path: path.join(dir, `libreria-${w}x${h}-${tema}.png`) });
      await pp.goto(URL0 + '#impostazioni'); await pp.waitForSelector('.impostazioni');
      await pp.screenshot({ path: path.join(dir, `impostazioni-${w}x${h}-${tema}.png`) });
      if (pp.errori.length) esiti.push('NO   schermate ' + w + 'x' + h + ' ' + tema + ': ' + pp.errori.join(' / ')), falliti++;
      await cc.close();
    }
    esiti.push('ok   schermate in prove/schermate/');
  }
  await browser.close(); server.close();
  console.log(esiti.join('\n'));
  console.log(falliti ? falliti + ' prove fallite' : 'Tutte le prove passano');
  process.exit(falliti ? 1 : 0);
})();
