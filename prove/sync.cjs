// Prova della sincronizzazione (storia S7) con un Dropbox finto, due dispositivi. Uso: node prove/sync.cjs
// Costruisce l'app con una chiave di prova, poi la ricostruisce come prima (senza chiave, se in src/versione.json non c'è).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const RADICE = path.resolve(__dirname, '..'), PORTA = 8182, URL0 = 'http://localhost:' + PORTA + '/';
execSync('node build.mjs', { cwd: RADICE, env: { ...process.env, PLICO_DROPBOX: 'chiavediprova' }, stdio: 'inherit' });
const TIPI = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf', '.wasm': 'application/wasm' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, URL0).pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(RADICE, p);
  if (!f.startsWith(RADICE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'Content-Type': TIPI[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});

// ---------- Dropbox finto ----------
const file = new Map(), sessioni = new Map(); let giri = 0, rev = 1, chiamate = [];
const meta = (k) => { const f = file.get(k); return { '.tag': 'file', name: f.display.split('/').pop(), path_lower: k, path_display: f.display, rev: f.rev, size: f.dati.length }; };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Expose-Headers': 'Dropbox-API-Result' };
function salva(arg, dati) {
  const k = arg.path.toLowerCase(), c = file.get(k);
  if (arg.mode['.tag'] === 'add' && c) return { conflitto: true };
  if (arg.mode['.tag'] === 'update' && (!c || c.rev !== arg.mode.update)) return { conflitto: true };
  file.set(k, { display: arg.path, rev: 'r' + (rev++), dati });
  return { meta: meta(k) };
}
async function dropbox(route) {
  const q = route.request(), u = new URL(q.url());
  if (q.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS });
  const j = (o, s = 200) => route.fulfill({ status: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
  const arg = () => JSON.parse(q.headers()['dropbox-api-arg'] || '{}');
  const corpo = () => q.postDataBuffer() || Buffer.alloc(0);
  const rotta = u.pathname; chiamate.push(rotta);
  if (rotta === '/oauth2/token') return j({ access_token: 'tok', expires_in: 14400, refresh_token: 'rinnovo', account_id: 'acc' });
  if (rotta === '/2/users/get_current_account') return j({ name: { display_name: 'Prova' }, email: 'prova@esempio.it' });
  if (rotta === '/2/auth/token/revoke') return j(null);
  if (rotta === '/2/files/list_folder') { giri++; return j({ entries: [...file.keys()].map(meta), cursor: 'c', has_more: false }); }
  if (rotta === '/2/files/delete_v2') { const a = JSON.parse(q.postData()), k = a.path.toLowerCase(); if (!file.has(k)) return j({ error_summary: 'path_lookup/not_found/' }, 409); file.delete(k); return j({ metadata: {} }); }
  if (rotta === '/2/files/move_v2') { const a = JSON.parse(q.postData()), k = a.from_path.toLowerCase(), f = file.get(k); if (!f) return j({ error_summary: 'from_lookup/not_found/' }, 409); file.delete(k); file.set(a.to_path.toLowerCase(), { ...f, display: a.to_path }); return j({ metadata: meta(a.to_path.toLowerCase()) }); }
  if (rotta === '/2/files/download') { const k = arg().path.toLowerCase(), f = file.get(k); if (!f) return j({ error_summary: 'path/not_found/' }, 409); return route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'application/octet-stream', 'Dropbox-API-Result': JSON.stringify(meta(k)) }, body: f.dati }); }
  if (rotta === '/2/files/upload') { const r = salva(arg(), corpo()); return r.conflitto ? j({ error_summary: 'path/conflict/file/' }, 409) : j(r.meta); }
  if (rotta === '/2/files/upload_session/start') { const id = 's' + (rev++); sessioni.set(id, [corpo()]); return j({ session_id: id }); }
  if (rotta === '/2/files/upload_session/append_v2') { const a = arg(); sessioni.get(a.cursor.session_id).push(corpo()); return j(null); }
  if (rotta === '/2/files/upload_session/finish') { const a = arg(), parti = sessioni.get(a.cursor.session_id); parti.push(corpo()); const tutto = Buffer.concat(parti); if (tutto.length !== a.cursor.offset + corpo().length) return j({ error_summary: 'lookup_failed/incorrect_offset/' }, 409); const r = salva(a.commit, tutto); return r.conflitto ? j({ error_summary: 'path/conflict/file/' }, 409) : j(r.meta); }
  return j({ error_summary: 'sconosciuta' }, 400);
}

const esiti = []; let falliti = 0;
async function prova(nome, f) { try { await f(); esiti.push('ok   ' + nome); } catch (e) { falliti++; esiti.push('NO   ' + nome + ': ' + String(e.stack || e).split('\n').slice(0, 2).join(' | ')); } }
const vero = (c, m) => { if (!c) throw new Error(m); };
async function dispositivo(browser, nome) {
  const c = await browser.newContext({ viewport: { width: 1333, height: 800 } });
  await c.route('https://api.dropboxapi.com/**', dropbox);
  await c.route('https://content.dropboxapi.com/**', dropbox);
  await c.route('https://www.dropbox.com/oauth2/authorize**', r => { const u = new URL(r.request().url()); r.fulfill({ status: 302, headers: { Location: u.searchParams.get('redirect_uri') + '?code=codice&state=' + u.searchParams.get('state') } }); });
  const p = await c.newPage(); p.errori = [];
  p.on('console', m => { if (m.type() === 'error' && !/Sincronizzazione|status of 409/.test(m.text())) p.errori.push(nome + ': ' + m.text()); });
  p.on('pageerror', e => p.errori.push(nome + ': ' + e.message));
  await p.addInitScript(() => { try { sessionStorage.setItem('plico-visto', '1'); } catch {} });
  return { c, p };
}
const conta = (p, idd) => p.evaluate(idd => new Promise(ok => { const r = indexedDB.open('plico'); r.onsuccess = () => { const t = r.result.transaction(['documenti', 'segni', 'basi']); const d = t.objectStore('documenti').getAll(), s = t.objectStore('segni').getAll(), b = t.objectStore('basi').getAllKeys(); t.oncomplete = () => ok({ docs: d.result.filter(x => !x.rimosso && !x.eliminato).map(x => x.nome), segni: s.result.filter(x => !x.eliminato && (!idd || x.doc === idd)).length, basi: b.result.length }); }; }), idd);
async function tratto(p, y) {
  await p.evaluate(y => {
    const c = document.querySelector('.visore'), w = c.querySelector('.page[data-page-number="1"] .canvasWrapper'); c.scrollTop = 0; const pg = w.getBoundingClientRect();
    const ev = (n, x, yy, b) => c.dispatchEvent(new PointerEvent(n, { pointerId: 3, pointerType: 'mouse', isPrimary: true, pressure: b ? 0.5 : 0, buttons: b, button: 0, clientX: pg.left + x * pg.width, clientY: pg.top + yy * pg.height, bubbles: true, cancelable: true }));
    ev('pointerdown', 0.2, y, 1); for (let i = 1; i < 15; i++) ev('pointermove', 0.2 + i * 0.015, y + (i % 2) * 0.006, 1); ev('pointerup', 0.4, y, 0);
  }, y);
  await p.waitForTimeout(500);
}
async function collega(p) {
  await p.goto(URL0 + '#impostazioni'); await p.waitForSelector('.impostazioni');
  await p.getByRole('button', { name: 'Collega', exact: true }).click();
  await p.waitForSelector('text=Dropbox collegato', { timeout: 10000 });
}
async function sincronizza(p) {
  const prima = giri;
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await p.waitForFunction(() => /Sincronizzato alle/.test(document.querySelector('.stato-sync')?.textContent || document.body.innerText), null, { timeout: 20000 });
  if (giri === prima) throw new Error('nessun giro');
  await p.waitForTimeout(300);
}
function pdfGrande(mb) {   // un PDF valido di circa "mb" MB: un flusso di commenti mai disegnati
  const riempi = Buffer.alloc(mb * 1048576, 0x41);
  const parti = ['%PDF-1.7\n'], pos = [];
  const ogg = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Count 1 /Kids [3 0 R] >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> /Contents 4 0 R >>'];
  let len = parti[0].length; const out = [Buffer.from(parti[0], 'latin1')];
  ogg.forEach((o, i) => { pos.push(len); const b = Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, 'latin1'); out.push(b); len += b.length; });
  pos.push(len); const testa = Buffer.from(`4 0 obj\n<< /Length 5 0 R >>\nstream\n`, 'latin1'); const contenuto = Buffer.concat([Buffer.from('BT /F1 1 Tf ET\n%', 'latin1'), riempi, Buffer.from('\n', 'latin1')]);
  const coda4 = Buffer.from(`endstream\nendobj\n`, 'latin1'); out.push(testa, contenuto, coda4); len += testa.length + contenuto.length + coda4.length;
  pos.push(len); const o5 = Buffer.from(`5 0 obj\n${contenuto.length}\nendobj\n`, 'latin1'); out.push(o5); len += o5.length;
  let x = `xref\n0 6\n0000000000 65535 f \n` + pos.map(v => String(v).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${len}\n%%EOF\n`;
  out.push(Buffer.from(x, 'latin1'));
  return Buffer.concat(out);
}

(async () => {
  await new Promise(r => server.listen(PORTA, r));
  const browser = await chromium.launch();
  const A = await dispositivo(browser, 'A'), B = await dispositivo(browser, 'B');
  let idProva;
  await prova('A: documento con un segno, poi Collega Dropbox: indice, PDF e segni su Dropbox', async () => {
    await A.p.goto(URL0); await A.p.getByRole('button', { name: 'Apri il documento di prova' }).click();
    await A.p.waitForSelector('.page[data-page-number="1"] canvas.tela-penna');
    idProva = await A.p.evaluate(() => location.hash.slice(5));
    await A.p.getByRole('button', { name: 'Scrivi', exact: true }).click(); await tratto(A.p, 0.12);
    await collega(A.p); await sincronizza(A.p);
    const k = [...file.keys()];
    vero(k.includes('/libreria.json') && k.some(x => x.startsWith('/documenti/documento di prova - ')) && k.includes('/segni/' + idProva + '.json'), 'file: ' + k.join(', '));
    const pdf = file.get(k.find(x => x.startsWith('/documenti/'))).dati.toString('latin1');
    vero(pdf.includes('%plico1 '), 'il PDF su Dropbox non ha i segni');
  });
  await prova('B: Collega e riceve documento, originale e segni (S7)', async () => {
    await B.p.goto(URL0); await collega(B.p); await sincronizza(B.p);
    const n = await conta(B.p, idProva);
    vero(n.docs.includes('Documento di prova') && n.basi === 1 && n.segni === 1, JSON.stringify(n));
  });
  await prova('B scrive, A riceve; senza rete tutti e due scrivono, poi i segni si uniscono', async () => {
    await B.p.goto(URL0 + '#doc-' + idProva); await B.p.waitForSelector('.page[data-page-number="1"] canvas.tela-penna');
    await B.p.getByRole('button', { name: 'Scrivi', exact: true }).click(); await tratto(B.p, 0.2);
    await B.p.click('[aria-label="Torna alla libreria"]'); await sincronizza(B.p);
    await sincronizza(A.p);
    vero((await conta(A.p, idProva)).segni === 2, 'A dopo B: ' + JSON.stringify(await conta(A.p, idProva)));
    await A.c.setOffline(true); await B.c.setOffline(true);
    for (const [D, y] of [[A, 0.3], [B, 0.4]]) {
      await D.p.goto(URL0 + '#doc-' + idProva).catch(() => {}); await D.p.waitForSelector('.page[data-page-number="1"] canvas.tela-penna');
      if (!(await D.p.isVisible('.barra-strumenti'))) await D.p.getByRole('button', { name: 'Scrivi', exact: true }).click();
      await tratto(D.p, y); await D.p.click('[aria-label="Torna alla libreria"]'); await D.p.waitForTimeout(400);
    }
    await A.c.setOffline(false); await B.c.setOffline(false);
    await sincronizza(A.p); await sincronizza(B.p); await sincronizza(A.p);
    const a = await conta(A.p, idProva), b = await conta(B.p, idProva);
    vero(a.segni === 4 && b.segni === 4, 'A ' + JSON.stringify(a) + ' B ' + JSON.stringify(b));
  });
  await prova('rinomina su A: il PDF su Dropbox cambia nome, B vede il nome nuovo', async () => {
    await A.p.goto(URL0);
    await A.p.locator('.scheda', { hasText: 'Documento di prova' }).locator('.puntini').click();
    await A.p.getByRole('menuitem', { name: 'Rinomina' }).click();
    await A.p.fill('.foglio input', 'Accordo è firmato'); await A.p.getByRole('button', { name: 'Salva' }).click();
    await A.p.waitForTimeout(300); await sincronizza(A.p);
    vero([...file.keys()].some(k => k === '/documenti/accordo è firmato - ' + idProva + '.pdf'), 'file: ' + [...file.keys()].join(', '));
    await sincronizza(B.p);
    vero((await conta(B.p)).docs.includes('Accordo è firmato'), JSON.stringify(await conta(B.p)));
  });
  await prova('PDF di 10 MB: caricato a pezzi e ricevuto identico', async () => {
    const grande = pdfGrande(10), f = path.join(require('os').tmpdir(), 'grande.pdf'); fs.writeFileSync(f, grande);
    const [fc] = await Promise.all([A.p.waitForEvent('filechooser'), A.p.click('.testata .importa')]);
    await fc.setFiles(f); await A.p.waitForSelector('text=Importato: grande', { timeout: 20000 });
    chiamate = []; await sincronizza(A.p);
    vero(chiamate.includes('/2/files/upload_session/finish'), 'nessuna sessione: ' + chiamate.join(' '));
    const k = [...file.keys()].find(x => x.startsWith('/documenti/grande - '));
    vero(k && file.get(k).dati.equals(grande), 'PDF diverso su Dropbox');
    await sincronizza(B.p);
    vero((await conta(B.p)).docs.includes('grande'), 'B non lo vede');
  });
  await prova('Elimina per sempre su B: sparisce da Dropbox e da A', async () => {
    await B.p.goto(URL0);
    await B.p.locator('.scheda', { hasText: 'grande' }).locator('.puntini').click(); await B.p.getByRole('menuitem', { name: 'Sposta nel cestino' }).click();
    await B.p.goto(URL0 + '#cestino'); await B.p.locator('.scheda', { hasText: 'grande' }).locator('.puntini').click();
    await B.p.getByRole('menuitem', { name: 'Elimina per sempre' }).click(); await B.p.getByRole('button', { name: 'Elimina', exact: true }).click();
    await B.p.waitForTimeout(300); await sincronizza(B.p);
    vero(![...file.keys()].some(x => x.startsWith('/documenti/grande - ')), 'ancora su Dropbox');
    await sincronizza(A.p);
    vero(!(await conta(A.p)).docs.includes('grande'), 'ancora su A');
  });
  await prova('nessun errore nella pagina', async () => { vero(!A.p.errori.length && !B.p.errori.length, [...A.p.errori, ...B.p.errori].join(' / ')); });
  await browser.close(); server.close();
  execSync('node build.mjs', { cwd: RADICE, stdio: 'inherit' });
  console.log(esiti.join('\n')); console.log(falliti ? falliti + ' prove fallite' : 'Tutte le prove passano');
  process.exit(falliti ? 1 : 0);
})();
