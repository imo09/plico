// Libreria: viste, cartelle, importazione, menu del documento, Cestino, ricerca, ordinamento.
import { $, el, id as nuovoId, data, peso, senzaAccenti, nomePulito, nomeSenzaPdf, confronto, emetti, ascolta, stretta, scarica, sha16, PESO_MASSIMO, GIORNO, dataFile } from './20-base.js';
import { icona, marchio, bottoneIcona, foglio, menu, avviso, conferma, chiedi, scegli, vai, pressioneLunga } from './25-interfaccia.js';
import { leggi, tutti, scrivi, insieme, segniDi, togliSegniDi, impostazione, imposta, tutteImpostazioni } from './30-archivio.js';
import { potaLapidi } from './37-unione.js';
import { apriDocumento, miniatura, scomponiBlob, fileDi } from './40-pdf.js';
import { pdfVuoto } from './41-vuoto.js';

export const COLORI_CARTELLA = [
  { id: 'ottone', nome: 'Ottone', colore: '#C99A4E', tinta: '#F3E7D1' },
  { id: 'verderame', nome: 'Verderame', colore: '#2F9184', tinta: '#D7ECE8' },
  { id: 'ruggine', nome: 'Ruggine', colore: '#B4544A', tinta: '#F3DCD8' },
  { id: 'acciaio', nome: 'Acciaio', colore: '#71879A', tinta: '#E0E7ED' },
  { id: 'blu', nome: 'Blu', colore: '#2E5E9E', tinta: '#DCE5F1' },
  { id: 'sabbia', nome: 'Sabbia', colore: '#A89272', tinta: '#EEE7DA' }
];
const colore = c => COLORI_CARTELLA.find(x => x.id === c) || COLORI_CARTELLA[0];

export const TESTI = {
  nonPdf: 'plico apre solo PDF. Per Word, Excel e PowerPoint esporta in PDF dall\'app che li ha creati, poi condividilo con plico.',
  illeggibile: 'Questo file non è un PDF leggibile. Non è stato importato.',
  troppoGrande: 'Questo PDF pesa più di 200 MB: plico non riesce a gestirlo bene su tutti i dispositivi. Non è stato importato.'
};

// stato della libreria in memoria
export const L = { docs: new Map(), cartelle: new Map(), imp: {}, vista: 'tutti', cartella: null, cerca: '', mini: new Map(), apriInScrittura: null, pronta: false,
  sel: new Set(), modoSel: false, ultimaSel: null, ordine: [] };   // selezione multipla (2.2): chiavi "d:{id}" per i documenti, "c:{id}" per le cartelle

export async function caricaLibreria() {
  const [docs, cartelle, imp] = await Promise.all([tutti('documenti'), tutti('cartelle'), tutteImpostazioni()]);
  L.docs = new Map(docs.map(d => [d.id, d])); L.cartelle = new Map(cartelle.map(c => [c.id, c])); L.imp = imp; L.pronta = true;
}
export const vivi = () => [...L.docs.values()].filter(d => !d.eliminato && !d.rimosso);
export const cartelleVive = () => [...L.cartelle.values()].filter(c => !c.eliminato && !c.rimosso);
export function cartellaViva(idc) { const c = idc && L.cartelle.get(idc); return c && !c.eliminato && !c.rimosso ? c : null; }
export function percorsoCartella(idc) {
  const p = []; let c = cartellaViva(idc), giri = 0;
  while (c && giri++ < 50) { p.unshift(c); c = cartellaViva(c.genitore); }
  return p;
}
function figlieDi(idc) { return cartelleVive().filter(c => (c.genitore || null) === (idc || null)).sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0) || confronto(a.nome, b.nome)); }
function discendenti(idc) { const out = []; const giro = x => { for (const f of figlieDi(x)) { out.push(f); giro(f.id); } }; giro(idc); return out; }
const docsIn = idc => vivi().filter(d => d.cartella === idc);

export async function salvaScheda(s, { metadati = true } = {}) {
  if (metadati) s.modificato = Date.now();
  L.docs.set(s.id, s);
  await scrivi('documenti', s);
  emetti('libreria:cambiata', { doc: s.id, metadati });
}
export async function salvaCartella(c) {
  c.modificato = Date.now();
  L.cartelle.set(c.id, c);
  await scrivi('cartelle', c);
  emetti('libreria:cambiata', { cartella: c.id, metadati: true });
}
export async function impostaL(nome, valore) { L.imp[nome] = valore; await imposta(nome, valore); }

// ---------- miniature ----------
export async function urlMiniatura(idd) {
  if (L.mini.has(idd)) return L.mini.get(idd);
  const b = await leggi('miniature', idd);
  const u = b ? URL.createObjectURL(b) : null;
  L.mini.set(idd, u);
  return u;
}
export function dimenticaMiniatura(idd) { const u = L.mini.get(idd); if (u) URL.revokeObjectURL(u); L.mini.delete(idd); }
const osservatore = 'IntersectionObserver' in window ? new IntersectionObserver(voci => {
  for (const v of voci) if (v.isIntersecting) { osservatore.unobserve(v.target); riempiMiniatura(v.target); }
}, { rootMargin: '300px' }) : null;
async function riempiMiniatura(box) {
  const u = await urlMiniatura(box.dataset.doc);
  if (u && box.isConnected) box.replaceChildren(el('img', { src: u, alt: '', decoding: 'async' }));
}
function boxMiniatura(d) {
  const box = el('span.mini', { 'data-doc': d.id }, icona(d.protetto ? 'lucchetto' : 'documenti'));
  if (L.mini.get(d.id)) box.replaceChildren(el('img', { src: L.mini.get(d.id), alt: '' }));
  else if (osservatore) osservatore.observe(box); else riempiMiniatura(box);
  return box;
}

// ---------- importazione ----------
function eUnPdf(testa) { const s = new TextDecoder('latin1').decode(testa); return s.includes('%PDF-'); }
async function importaUno(file, cartella) {
  const nome = nomeSenzaPdf(file.name || 'Documento');
  if (file.size > PESO_MASSIMO) { avviso(TESTI.troppoGrande, { durata: 7000 }); return null; }
  const testa = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  if (!eUnPdf(testa)) {
    avviso(/\.(docx?|xlsx?|pptx?|odt|ods|odp|rtf|pages|numbers|key)$/i.test(file.name || '') ? TESTI.nonPdf : TESTI.illeggibile, { durata: 7000 });
    return null;
  }
  const blob = new Blob([file], { type: 'application/pdf' });
  const sc = await scomponiBlob(blob);
  const base = sc.base.type === 'application/pdf' ? sc.base : new Blob([sc.base], { type: 'application/pdf' });
  const impronta = sc.impronta || await sha16(base);
  const idd = nuovoId(), ora = Date.now();
  const segni = sc.segni.map(s => ({ ...s, doc: idd, chiave: idd + ':' + s.id }));
  let pagine = null, protetto = false, mini = null;
  try {
    const { doc, compito } = await apriDocumento(base);
    try { pagine = doc.numPages; mini = await miniatura(doc, segni); } finally { await compito.destroy(); }
  } catch (e) {
    if (e?.name === 'PasswordException') protetto = true;
    else { console.error(e); avviso(TESTI.illeggibile, { durata: 6000 }); return null; }
  }
  const vivi = segni.filter(s => !s.eliminato);
  const scheda = { id: idd, nome, cartella: cartella || null, preferito: false, origine: 'importato', stile: null, pagine, peso: base.size, impronta, protetto,
    creato: ora, modificato: ora, aperto: ora, pagina: 1, segniModificato: segni.reduce((m, s) => Math.max(m, s.modificato || 0), 0), conSegni: vivi.length > 0, eliminato: null, rimosso: null };
  const op = [{ archivio: 'documenti', valore: scheda }, { archivio: 'basi', valore: base, chiave: idd }];
  if (mini) op.push({ archivio: 'miniature', valore: mini, chiave: idd });
  for (const s of segni) op.push({ archivio: 'segni', valore: s });
  await insieme(op);
  L.docs.set(idd, scheda);
  emetti('libreria:cambiata', { doc: idd, metadati: true, nuovo: true });
  return scheda;
}
export async function importa(files, { cartella } = {}) {
  const lista = Array.from(files || []);
  if (!lista.length) return [];
  const dove = cartella !== undefined ? cartella : (L.vista === 'cartella' ? L.cartella : null);
  const fatti = [];
  const lungo = lista.length > 1 || lista[0].size > 20 * 1048576 ? avviso(lista.length > 1 ? 'Importo ' + lista.length + ' documenti' : 'Importo ' + nomeSenzaPdf(lista[0].name), { durata: 60000 }) : null;
  for (const f of lista) {
    try { const s = await importaUno(f, dove); if (s) fatti.push(s); }
    catch (e) { console.error(e); avviso('plico non riesce a salvare "' + nomeSenzaPdf(f.name) + '" su questo dispositivo. Non è stato importato.', { durata: 7000 }); }
  }
  lungo?.remove();
  if (fatti.length === 1) avviso('Importato: ' + fatti[0].nome);
  else if (fatti.length > 1) avviso(fatti.length + ' documenti importati');
  if (fatti.length && L.vista === 'cestino') L.vista = 'tutti';
  ridisegna();
  return fatti;
}
export function scegliFile() {
  const inp = el('input', { type: 'file', accept: 'application/pdf,.pdf', multiple: true, style: { display: 'none' } });
  inp.addEventListener('change', () => { importa(inp.files); inp.remove(); });
  document.body.append(inp); inp.click();
}
export async function nuovoVuoto(stile) {
  const bytes = pdfVuoto(1, stile), base = new Blob([bytes], { type: 'application/pdf' });
  const idd = nuovoId(), ora = Date.now();
  const d = new Date(), MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  let mini = null;
  try { const { doc, compito } = await apriDocumento(base); try { mini = await miniatura(doc, []); } finally { await compito.destroy(); } } catch (e) { console.error(e); }
  const scheda = { id: idd, nome: 'Appunti del ' + d.getDate() + ' ' + MESI[d.getMonth()], cartella: L.vista === 'cartella' ? L.cartella : null, preferito: false, origine: 'vuoto', stile,
    pagine: 1, peso: base.size, impronta: await sha16(bytes), protetto: false, creato: ora, modificato: ora, aperto: ora, pagina: 1, segniModificato: 0, conSegni: false, eliminato: null, rimosso: null };
  const op = [{ archivio: 'documenti', valore: scheda }, { archivio: 'basi', valore: base, chiave: idd }];
  if (mini) op.push({ archivio: 'miniature', valore: mini, chiave: idd });
  await insieme(op);
  L.docs.set(idd, scheda);
  emetti('libreria:cambiata', { doc: idd, metadati: true, nuovo: true });
  L.apriInScrittura = idd;
  vai('#doc-' + idd);
}
export async function apriProva() {
  try {
    const r = await fetch('esempi/prova.pdf');
    if (!r.ok) throw new Error('rete');
    const b = await r.blob();
    const [s] = await importa([new File([b], 'Documento di prova.pdf', { type: 'application/pdf' })], { cartella: null });
    if (s) vai('#doc-' + s.id);
  } catch { avviso('Il documento di prova non è disponibile in questo momento.'); }
}
export function menuNuovo(ancora) {
  menu(ancora, [
    { testo: 'Importa PDF', valore: '', icona: 'importa', fai: scegliFile },
    { testo: 'Nuovo documento vuoto', icona: 'vuoto', fai: sceltaVuoto },
    { testo: 'Nuova cartella', icona: 'nuovaCartella', fai: () => nuovaCartella(L.vista === 'cartella' ? L.cartella : null) }
  ], { titolo: 'Aggiungi' });
}
async function sceltaVuoto() {
  const s = await scegli('Nuovo documento vuoto', [
    { id: 'bianco', testo: 'Bianco', sotto: 'Pagine senza righe', icona: 'bianco' },
    { id: 'righe', testo: 'A righe', sotto: 'Righe ogni 24 punti', icona: 'righe' },
    { id: 'quadretti', testo: 'A quadretti', sotto: 'Quadretti da 5 mm', icona: 'quadretti' }
  ], { sotto: 'Pagine bianche, a righe o a quadretti' });
  if (s) nuovoVuoto(s);
}

// ---------- cartelle ----------
function sceltaColore(attuale, cambia) {
  const g = el('div.colori-cartella', { role: 'radiogroup', 'aria-label': 'Colore' });
  for (const c of COLORI_CARTELLA) g.append(el('button', { type: 'button', role: 'radio', 'aria-checked': String(c.id === attuale), 'aria-label': c.nome, title: c.nome, onclick: e => {
    for (const b of g.children) b.setAttribute('aria-checked', 'false');
    e.currentTarget.setAttribute('aria-checked', 'true'); cambia(c.id);
  } }, el('span', { style: { background: c.colore } })));
  return g;
}
export async function nuovaCartella(genitore = null) {
  let col = 'ottone';
  const nome = await chiedi('Nuova cartella', { etichetta: 'Nome', sotto: 'Scegli nome e colore', ok: 'Crea', extra: sceltaColore(col, c => { col = c; }) });
  if (!nome) return null;
  const ora = Date.now();
  const c = { id: nuovoId(), nome, colore: col, genitore: genitore || null, ordine: figlieDi(genitore).length, creato: ora, modificato: ora, eliminato: null, rimosso: null };
  await salvaCartella(c);
  ridisegna();
  return c;
}
async function rinominaCartella(c) {
  let col = c.colore;
  const nome = await chiedi('Rinomina la cartella', { valore: c.nome, etichetta: 'Nome', ok: 'Salva', extra: sceltaColore(col, x => { col = x; }) });
  if (!nome) return;
  c.nome = nome; c.colore = col; await salvaCartella(c); ridisegna();
}
async function eliminaCartella(c) {
  const ora = Date.now(), cartelle = [c, ...discendenti(c.id)], ids = new Set(cartelle.map(x => x.id));
  const docs = vivi().filter(d => ids.has(d.cartella));
  for (const x of cartelle) { x.eliminato = ora; await salvaCartella(x); }
  for (const d of docs) { d.eliminato = ora; await salvaScheda(d); }
  if (L.vista === 'cartella' && ids.has(L.cartella)) vai('#libreria'); else ridisegna();
  avviso('Spostato nel cestino', { azione: { testo: 'Annulla', fai: async () => {
    for (const x of cartelle) { x.eliminato = null; await salvaCartella(x); }
    for (const d of docs) { d.eliminato = null; await salvaScheda(d); }
    ridisegna();
  } } });
}
function menuCartella(c, ancora) {
  menu(ancora, [
    { testo: 'Rinomina', icona: 'rinomina', fai: () => rinominaCartella(c) },
    { testo: 'Nuova cartella qui', icona: 'nuovaCartella', fai: () => nuovaCartella(c.id) },
    { separatore: true },
    { testo: 'Sposta nel cestino', icona: 'cestino', pericolo: true, fai: () => eliminaCartella(c) }
  ], { titolo: c.nome });
}
// scelta della cartella come in un explorer (revisione 3): si entra nelle cartelle una alla volta.
// Risolve con l'id della cartella, null per "nessuna cartella", undefined se si annulla.
export function esploraCartelle({ titolo = 'Sposta in una cartella', escludi = new Set(), attuale = null, ok = 'Sposta qui' } = {}) {
  return new Promise(risolvi => {
    let qui = cartellaViva(attuale) ? attuale : null, esito;
    const corpo = el('div.esploratore');
    const disegna = () => {
      const perc = percorsoCartella(qui), figlie = figlieDi(qui);
      const testa = el('div.esplora-testa', null,
        qui ? bottoneIcona('indietro', 'Cartella superiore', () => { qui = cartellaViva(qui)?.genitore || null; disegna(); }) : el('span.esplora-radice', null, icona('documenti')),
        el('span.esplora-percorso', { testo: ['Tutti i documenti', ...perc.map(c => c.nome)].join(' / ') }));
      const lista = el('div.esplora-lista', { role: 'list' }, figlie.map(c => el('button.esplora-voce', { type: 'button', role: 'listitem', disabled: escludi.has(c.id), onclick: () => { qui = c.id; disegna(); } },
        el('span.icona-cartella', { style: { background: colore(c.colore).tinta, color: '#0E1D2A' } }, icona('cartella')), el('span.etichetta', { testo: c.nome }),
        el('span.mono', { testo: String(docsIn(c.id).length) }), icona('avanti'))));
      if (!figlie.length) lista.append(el('p.esplora-vuoto', { testo: 'Nessuna sottocartella.' }));
      lista.append(el('button.esplora-voce.nuova', { type: 'button', onclick: async () => { const c = await nuovaCartella(qui); if (c) { qui = c.id; disegna(); } } },
        el('span.icona-cartella', { style: { background: 'var(--carta)' } }, icona('nuovaCartella')), el('span.etichetta', { testo: 'Nuova cartella qui' })));
      corpo.replaceChildren(testa, lista);
    };
    foglio({ titolo, contenuto: corpo, classe: 'foglio-esplora', alChiudere: () => risolvi(esito), azioni: [
      { testo: 'Annulla', fai: c => c() }, { testo: ok, primario: true, fai: c => { esito = qui; c(); } }] });
    disegna();
  });
}
export const scegliCartella = attuale => esploraCartelle({ attuale });

// ---------- azioni sul documento ----------
export async function rinomina(s) {
  const nome = await chiedi('Rinomina', { valore: s.nome, etichetta: 'Nome del documento', ok: 'Salva' });
  if (!nome || nome === s.nome) return false;
  s.nome = nome; await salvaScheda(s); ridisegna(); return true;
}
export async function sposta(s) {
  const c = await esploraCartelle({ attuale: s.cartella });
  if (c === undefined || c === s.cartella) return;
  s.cartella = c; await salvaScheda(s); ridisegna();
  avviso(c ? 'Spostato in ' + cartellaViva(c)?.nome : 'Tolto dalla cartella');
}
export async function preferito(s) { s.preferito = !s.preferito; await salvaScheda(s); ridisegna(); avviso(s.preferito ? 'Aggiunto ai preferiti' : 'Tolto dai preferiti'); }
export async function duplica(s) {
  const base = await leggi('basi', s.id), segni = await segniDi(s.id), mini = await leggi('miniature', s.id);
  const idd = nuovoId(), ora = Date.now();
  const n = { ...s, id: idd, nome: s.nome + ' (copia)', creato: ora, modificato: ora, aperto: ora, pagina: 1, preferito: false, eliminato: null, rimosso: null };
  const op = [{ archivio: 'documenti', valore: n }, { archivio: 'basi', valore: base, chiave: idd }];
  if (mini) op.push({ archivio: 'miniature', valore: mini, chiave: idd });
  for (const x of segni) op.push({ archivio: 'segni', valore: { ...x, doc: idd, chiave: idd + ':' + x.id } });
  await insieme(op);
  L.docs.set(idd, n); emetti('libreria:cambiata', { doc: idd, metadati: true, nuovo: true });
  ridisegna(); avviso('Duplicato: ' + n.nome);
}
export async function spostaNelCestino(s, { dopo } = {}) {
  s.eliminato = Date.now(); await salvaScheda(s); ridisegna(); dopo?.();
  avviso('Spostato nel cestino', { azione: { testo: 'Annulla', fai: async () => { s.eliminato = null; await salvaScheda(s); ridisegna(); } } });
}
export async function ripristina(s) {
  s.eliminato = null;
  if (s.cartella && !cartellaViva(s.cartella)) s.cartella = null;
  await salvaScheda(s); ridisegna(); avviso('Ripristinato: ' + s.nome);
}
async function cancellaContenuto(s) {
  await insieme([{ archivio: 'basi', togli: s.id }, { archivio: 'miniature', togli: s.id }]);
  await togliSegniDi(s.id);
  dimenticaMiniatura(s.id);
}
export async function eliminaPerSempre(s, { chiedi: domanda = true } = {}) {
  if (domanda && !(await conferma('Eliminare per sempre "' + s.nome + '"? Non si può annullare.', { ok: 'Elimina' }))) return false;
  await cancellaContenuto(s);
  s.rimosso = Date.now(); s.conSegni = false;
  await salvaScheda(s); ridisegna();
  return true;
}
export async function svuotaCestino() {
  const lista = vivi().length, cest = [...L.docs.values()].filter(d => d.eliminato && !d.rimosso);
  if (!cest.length) { avviso('Il cestino è vuoto.'); return; }
  if (!(await conferma('Eliminare per sempre ' + (cest.length === 1 ? '"' + cest[0].nome + '"' : cest.length + ' documenti') + '? Non si può annullare.', { ok: 'Elimina' }))) return;
  for (const d of cest) await eliminaPerSempre(d, { chiedi: false });
  avviso(lista >= 0 ? 'Cestino svuotato' : '');
}
// all'avvio: via dal Cestino ciò che c'è da più di 30 giorni; via le lapidi più vecchie di 90 giorni
export async function puliziaAvvio() {
  const ora = Date.now();
  for (const d of [...L.docs.values()]) if (d.eliminato && !d.rimosso && ora - d.eliminato > 30 * GIORNO) await eliminaPerSempre(d, { chiedi: false });
  const tenute = new Set(potaLapidi([...L.docs.values()], ora, 90, d => d.rimosso || 0).map(d => d.id));
  const op = [];
  for (const d of [...L.docs.values()]) if (!tenute.has(d.id)) { op.push({ archivio: 'documenti', togli: d.id }, { archivio: 'remoti', togli: d.id }); L.docs.delete(d.id); }
  const cTenute = new Set(potaLapidi([...L.cartelle.values()], ora, 90, c => c.rimosso || c.eliminato || 0).map(c => c.id));
  for (const c of [...L.cartelle.values()]) if (!cTenute.has(c.id)) { op.push({ archivio: 'cartelle', togli: c.id }); L.cartelle.delete(c.id); }
  await insieme(op);
}

// file da dare fuori, con la password se serve
async function fileConPassword(s, password) {
  const segni = await segniDi(s.id);
  if (s.protetto && !password && segni.some(x => !x.eliminato)) {
    password = await chiedi('Questo PDF è protetto', { tipo: 'password', etichetta: 'Password', ok: 'Apri' });
    if (password === null) return null;
  }
  return fileDi(s, { password, segni });
}
function erroreComposizione(s, e, rifai) {
  console.error(e);
  foglio({ titolo: 'plico non riesce a preparare il PDF con i segni', sotto: 'Può succedere con un PDF molto grande su un dispositivo con poca memoria. I segni restano salvati.', azioni: [
    { testo: 'Salva l\'originale', fai: async c => { c(); const b = await leggi('basi', s.id); if (b) { scarica(b, nomePulito(s.nome) + '.pdf'); avviso('Copia salvata'); } } },
    { testo: 'Riprova', primario: true, fai: c => { c(); rifai(); } }
  ] });
}
export async function salvaCopia(s, password) {
  let b;
  const attesa = s.peso > 20 * 1048576 ? avviso('Preparo il PDF', { durata: 60000 }) : null;
  try { b = await fileConPassword(s, password); } catch (e) { attesa?.remove(); erroreComposizione(s, e, () => salvaCopia(s, password)); return; }
  attesa?.remove();
  if (!b) return;
  scarica(b, nomePulito(s.nome) + '.pdf'); avviso('Copia salvata');
}
export async function condividi(s, password) {
  let b;
  const attesa = s.peso > 20 * 1048576 ? avviso('Preparo il PDF', { durata: 60000 }) : null;
  try { b = await fileConPassword(s, password); } catch (e) { attesa?.remove(); erroreComposizione(s, e, () => condividi(s, password)); return; }
  attesa?.remove();
  if (!b) return;
  const file = new File([b], nomePulito(s.nome) + '.pdf', { type: 'application/pdf' });
  const manda = () => navigator.share({ files: [file], title: s.nome });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await manda(); }
    catch (e) {
      if (e?.name === 'AbortError') return;
      if (e?.name === 'NotAllowedError') { avviso('PDF pronto', { azione: { testo: 'Condividi', fai: () => manda().catch(() => {}) }, durata: 10000 }); return; }
      scarica(file, file.name); avviso('Copia salvata');
    }
  } else { scarica(file, file.name); avviso('Copia salvata'); }
}
export async function dettagli(s) {
  const segni = (await segniDi(s.id)).filter(x => !x.eliminato).length;
  const riga = (k, v) => el('div.riga-imp', null, el('span.testi', null, el('span', { testo: k })), el('span.valore', { testo: v }));
  foglio({ titolo: 'Dettagli', contenuto: el('div', null,
    riga('Nome', s.nome), riga('Cartella', cartellaViva(s.cartella)?.nome || '-'), riga('Pagine', s.pagine ?? '-'), riga('Peso', peso(s.peso)),
    riga('Creato', data(s.creato)), riga('Modificato', data(Math.max(s.modificato || 0, s.segniModificato || 0))), riga('Segni', String(segni)),
    s.protetto ? riga('Protetto da password', 'Sì') : null), azioni: [{ testo: 'Chiudi', fai: c => c() }] });
}
export function menuDocumento(s, ancora) {
  if (s.eliminato) {
    menu(ancora, [
      { testo: 'Ripristina', icona: 'ripristina', fai: () => ripristina(s) },
      { testo: 'Elimina per sempre', icona: 'cestino', pericolo: true, fai: () => eliminaPerSempre(s) }
    ], { titolo: s.nome });
    return;
  }
  menu(ancora, [
    { testo: 'Apri', icona: 'libro', fai: () => vai('#doc-' + s.id) },
    { separatore: true },
    { testo: 'Rinomina', icona: 'rinomina', fai: () => rinomina(s) },
    { testo: 'Sposta in una cartella', icona: 'cartella', valore: cartellaViva(s.cartella)?.nome || '', fai: () => sposta(s) },
    { testo: s.preferito ? 'Togli dai preferiti' : 'Aggiungi ai preferiti', icona: 'stella', fai: () => preferito(s) },
    { testo: 'Duplica', icona: 'duplica', fai: () => duplica(s) },
    { separatore: true },
    { testo: 'Condividi', icona: 'condividi', fai: () => condividi(s) },
    { testo: 'Salva una copia', icona: 'copia', fai: () => salvaCopia(s) },
    { separatore: true },
    { testo: 'Sposta nel cestino', icona: 'cestino', pericolo: true, fai: () => spostaNelCestino(s) }
  ], { titolo: s.nome });
}

// ---------- selezione multipla (2.2) ----------
const chiaveDoc = d => 'd:' + d.id, chiaveCartella = c => 'c:' + c.id;
function elementiScelti() {
  const docs = [], cartelle = [];
  for (const k of L.sel) { const [t, i] = [k[0], k.slice(2)]; if (t === 'd' && L.docs.get(i)) docs.push(L.docs.get(i)); if (t === 'c' && L.cartelle.get(i)) cartelle.push(L.cartelle.get(i)); }
  return { docs, cartelle };
}
export function esciSelezione() { if (!L.modoSel && !L.sel.size) return false; L.sel.clear(); L.modoSel = false; L.ultimaSel = null; ridisegna(); return true; }
function scegliElemento(k, intervallo = false) {
  if (intervallo && L.ultimaSel && L.ordine.includes(L.ultimaSel) && L.ordine.includes(k)) {
    const [a, b] = [L.ordine.indexOf(L.ultimaSel), L.ordine.indexOf(k)].sort((x, y) => x - y);
    for (const x of L.ordine.slice(a, b + 1)) L.sel.add(x);
  } else if (L.sel.has(k)) L.sel.delete(k); else L.sel.add(k);
  L.ultimaSel = k; L.modoSel = L.sel.size > 0 || L.modoSel;
  ridisegna();
}
function annullaSpostamenti(prima, testo) {
  avviso(testo, { azione: { testo: 'Annulla', fai: async () => {
    for (const [x, campo, v] of prima) { x[campo] = v; if (campo === 'cartella') await salvaScheda(x); else await salvaCartella(x); }
    ridisegna();
  } } });
}
// sposta documenti e cartelle (chiavi "d:" e "c:") nella cartella "dove" (null = nessuna cartella)
export async function spostaElementi(chiavi, dove) {
  const prima = [], vietate = new Set();
  for (const k of chiavi) if (k[0] === 'c') { vietate.add(k.slice(2)); for (const d of discendenti(k.slice(2))) vietate.add(d.id); }
  if (dove && vietate.has(dove)) { avviso('Una cartella non può andare dentro se stessa.'); return; }
  let n = 0;
  for (const k of chiavi) {
    const i = k.slice(2);
    if (k[0] === 'd') { const d = L.docs.get(i); if (!d || d.eliminato || d.cartella === dove) continue; prima.push([d, 'cartella', d.cartella]); d.cartella = dove; await salvaScheda(d); n++; }
    else { const c = L.cartelle.get(i); if (!c || (c.genitore || null) === dove) continue; prima.push([c, 'genitore', c.genitore]); c.genitore = dove; await salvaCartella(c); n++; }
  }
  L.sel.clear(); L.modoSel = false; ridisegna();
  if (n) annullaSpostamenti(prima, (n === 1 ? 'Spostato' : 'Spostati ' + n + ' elementi') + (dove ? ' in ' + cartellaViva(dove)?.nome : ' in Tutti i documenti'));
}
async function spostaSelezione() {
  const { cartelle } = elementiScelti(), escludi = new Set();
  for (const c of cartelle) { escludi.add(c.id); for (const d of discendenti(c.id)) escludi.add(d.id); }
  const dove = await esploraCartelle({ escludi, attuale: L.vista === 'cartella' ? L.cartella : null });
  if (dove !== undefined) await spostaElementi([...L.sel], dove);
}
async function preferitiSelezione() {
  const { docs } = elementiScelti(); if (!docs.length) return;
  const tutti_ = docs.every(d => d.preferito);
  for (const d of docs) { d.preferito = !tutti_; await salvaScheda(d); }
  esciSelezione(); avviso(tutti_ ? 'Tolti dai preferiti' : 'Aggiunti ai preferiti');
}
async function condividiSelezione() {
  const { docs } = elementiScelti(); if (!docs.length) return;
  if (docs.length === 1) { esciSelezione(); return condividi(docs[0]); }
  const attesa = avviso('Preparo ' + docs.length + ' PDF', { durata: 120000 }), file = [];
  try { for (const d of docs) { const b = await fileConPassword(d); if (b) file.push(new File([b], nomePulito(d.nome) + '.pdf', { type: 'application/pdf' })); } }
  catch (e) { attesa.remove(); console.error(e); avviso('plico non riesce a preparare tutti i PDF.', { durata: 5000 }); return; }
  attesa.remove(); esciSelezione();
  const manda = () => navigator.share({ files: file, title: file.length + ' documenti' });
  if (navigator.canShare && navigator.canShare({ files: file })) {
    try { await manda(); } catch (e) { if (e?.name === 'NotAllowedError') avviso('PDF pronti', { azione: { testo: 'Condividi', fai: () => manda().catch(() => {}) }, durata: 10000 }); else if (e?.name !== 'AbortError') { for (const f of file) scarica(f, f.name); } }
  } else { for (const f of file) scarica(f, f.name); avviso('Copie salvate'); }
}
async function cestinoSelezione() {
  const { docs, cartelle } = elementiScelti(), ora = Date.now(), cambiati = [], cambiateC = [];
  const tutteCartelle = new Set(); for (const c of cartelle) { tutteCartelle.add(c); for (const d of discendenti(c.id)) tutteCartelle.add(d); }
  const ids = new Set([...tutteCartelle].map(c => c.id));
  const tuttiDocs = new Set([...docs, ...vivi().filter(d => ids.has(d.cartella))]);
  for (const c of tutteCartelle) if (!c.eliminato) { c.eliminato = ora; await salvaCartella(c); cambiateC.push(c); }
  for (const d of tuttiDocs) if (!d.eliminato) { d.eliminato = ora; await salvaScheda(d); cambiati.push(d); }
  esciSelezione();
  avviso(tuttiDocs.size === 1 && !tutteCartelle.size ? 'Spostato nel cestino' : 'Spostati nel cestino: ' + (tuttiDocs.size + tutteCartelle.size) + ' elementi', { azione: { testo: 'Annulla', fai: async () => {
    for (const c of cambiateC) { c.eliminato = null; await salvaCartella(c); }
    for (const d of cambiati) { d.eliminato = null; await salvaScheda(d); }
    ridisegna();
  } } });
}
async function ripristinaSelezione() { const { docs } = elementiScelti(); for (const d of docs) { d.eliminato = null; if (d.cartella && !cartellaViva(d.cartella)) d.cartella = null; await salvaScheda(d); } esciSelezione(); avviso(docs.length === 1 ? 'Ripristinato: ' + docs[0].nome : 'Ripristinati ' + docs.length + ' documenti'); }
async function eliminaSelezione() {
  const { docs } = elementiScelti(); if (!docs.length) return;
  if (!(await conferma('Eliminare per sempre ' + (docs.length === 1 ? '"' + docs[0].nome + '"' : docs.length + ' documenti') + '? Non si può annullare.', { ok: 'Elimina' }))) return;
  for (const d of docs) await eliminaPerSempre(d, { chiedi: false });
  esciSelezione();
}
function selezionaTutti() { for (const k of L.ordine) L.sel.add(k); L.modoSel = true; ridisegna(); }
function barraSelezione() {
  const n = L.sel.size, { docs, cartelle } = elementiScelti();
  const az = (icn, testo, fai, abilitato = true) => el('button.btn.testo.azione-sel', { type: 'button', onclick: fai, disabled: !abilitato, title: testo, 'aria-label': testo }, icona(icn), el('span', { testo }));
  const cestino = L.vista === 'cestino';
  return el('header.testata.selezione', { role: 'toolbar', 'aria-label': 'Selezione' },
    bottoneIcona('chiudi', 'Chiudi la selezione (Esc)', esciSelezione),
    el('div.testata-titolo', null, el('h1', { testo: n ? (n === 1 ? '1 selezionato' : n + ' selezionati') : 'Seleziona' })),
    el('div.azioni-selezione', null,
      az('spunta', 'Seleziona tutti', selezionaTutti),
      cestino ? [az('ripristina', 'Ripristina', ripristinaSelezione, docs.length > 0), az('cestino', 'Elimina per sempre', eliminaSelezione, docs.length > 0)]
        : [az('cartella', 'Sposta', spostaSelezione, n > 0), az('stella', docs.length && docs.every(d => d.preferito) ? 'Togli dai preferiti' : 'Preferiti', preferitiSelezione, docs.length > 0),
          az('condividi', 'Condividi', condividiSelezione, docs.length > 0 && !cartelle.length), az('cestino', 'Cestino', cestinoSelezione, n > 0)]));
}
addEventListener('keydown', e => { if (e.key === 'Escape' && radice?.isConnected && L.modoSel && !document.querySelector('.velo')) { e.preventDefault(); esciSelezione(); } });
// trascinamento (tablet e PC): documenti e cartelle su una cartella del pannello, un riquadro o "Tutti i documenti"
const TIPO_TRASCINA = 'application/x-plico';
function trascinabile(nodo, k) {
  nodo.draggable = true;
  nodo.addEventListener('dragstart', e => {
    if (!L.sel.has(k)) { L.sel.clear(); L.sel.add(k); }
    e.dataTransfer.setData(TIPO_TRASCINA, JSON.stringify([...L.sel])); e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', [...L.sel].length + ' elementi');
  });
}
function bersaglio(nodo, dove) {
  nodo.addEventListener('dragover', e => { if (e.dataTransfer.types.includes(TIPO_TRASCINA)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; nodo.classList.add('bersaglio'); } });
  nodo.addEventListener('dragleave', () => nodo.classList.remove('bersaglio'));
  nodo.addEventListener('drop', e => { const v = e.dataTransfer.getData(TIPO_TRASCINA); nodo.classList.remove('bersaglio'); if (!v) return; e.preventDefault(); e.stopPropagation(); spostaElementi(JSON.parse(v), dove); });
  return nodo;
}
const puoTrascinare = () => matchMedia('(hover: hover)').matches;

// ---------- disegno della libreria ----------
let radice = null, statoSync = { testo: '', errore: false, visibile: false };
ascolta('sync:stato', st => { statoSync = st; const n = $('.stato-sync'); if (n) aggiornaStatoSync(n); });
function aggiornaStatoSync(n) {
  n.hidden = !statoSync.visibile;
  n.classList.toggle('errore', !!statoSync.errore);
  n.replaceChildren(icona(statoSync.errore ? 'info' : 'nuvola'), el('span', { testo: statoSync.testo }));
}
export function ridisegna() { if (radice && radice.isConnected) mostraLibreria(); }
const recente = d => Math.max(d.aperto || 0, d.modificato || 0, d.segniModificato || 0, d.creato || 0);
function ordina(lista) {
  const o = L.imp.ordine || 'recenti';
  return lista.sort(o === 'nome' ? (a, b) => confronto(a.nome, b.nome) : (a, b) => recente(b) - recente(a));
}
function vistaGriglia() { return L.imp.vista ? L.imp.vista === 'griglia' : !stretta(); }

function rigaMeta(d, conCartella) {
  const c = conCartella && cartellaViva(d.cartella);
  return el('span.riga', null,
    el('span', { testo: data(recente(d)) + ' - ' + (d.pagine ?? '-') + ' pag.' + (c ? ' - ' + c.nome : '') }),
    el('span.spazio'),
    d.conSegni ? el('span', { title: 'Con segni' }, icona('penna')) : null,
    d.preferito ? el('span', { title: 'Preferito' }, icona('stella', 'ic stella-on')) : null);
}
function apriDoc(d) { if (d.eliminato) { menuDocumento(d, null); return; } vai('#doc-' + d.id); }
function clicElemento(e, k, apri_) {   // in selezione il tocco sceglie; Ctrl e Maiusc scelgono anche fuori dalla selezione
  if (L.modoSel || e.ctrlKey || e.metaKey || e.shiftKey) { e.preventDefault(); scegliElemento(k, e.shiftKey); return; }
  apri_();
}
function segnoScelto(k) { return L.sel.has(k) ? el('span.spunta', { 'aria-hidden': 'true' }, icona('fatto')) : (L.modoSel ? el('span.spunta.vuota', { 'aria-hidden': 'true' }) : null); }
function schedaGriglia(d, conCartella) {
  const k = chiaveDoc(d); L.ordine.push(k);
  const apri = el('button.apri', { type: 'button', onclick: e => clicElemento(e, k, () => apriDoc(d)), 'aria-label': d.nome + (d.eliminato ? ', nel cestino' : ''), 'aria-pressed': L.modoSel ? String(L.sel.has(k)) : null },
    boxMiniatura(d), el('span.nome', { testo: d.nome }), rigaMeta(d, conCartella));
  const puntini = L.modoSel ? null : bottoneIcona('puntini', 'Azioni per ' + d.nome, e => menuDocumento(d, e.currentTarget), 'bi puntini');
  const s = el('div.scheda' + (L.sel.has(k) ? '.scelto' : ''), null, apri, segnoScelto(k), puntini);
  pressioneLunga(apri, () => scegliElemento(k));
  if (puoTrascinare()) trascinabile(s, k);
  return s;
}
function rigaElenco(d, conCartella) {
  const k = chiaveDoc(d); L.ordine.push(k);
  const apri = el('button.apri', { type: 'button', onclick: e => clicElemento(e, k, () => apriDoc(d)), 'aria-pressed': L.modoSel ? String(L.sel.has(k)) : null }, boxMiniatura(d), el('span.testi', null, el('span.nome', { testo: d.nome }), rigaMeta(d, conCartella)));
  const puntini = L.modoSel ? null : bottoneIcona('puntini', 'Azioni per ' + d.nome, e => menuDocumento(d, e.currentTarget));
  pressioneLunga(apri, () => scegliElemento(k));
  const r = el('div.riga-doc' + (L.sel.has(k) ? '.scelto' : ''), null, segnoScelto(k), apri, puntini);
  if (puoTrascinare()) trascinabile(r, k);
  return r;
}
function documenti(lista, conCartella = false) {
  if (vistaGriglia()) return el('div.griglia', null, lista.map(d => schedaGriglia(d, conCartella)));
  return el('div.elenco', null, lista.map(d => rigaElenco(d, conCartella)));
}
function riquadroCartella(c) {
  const t = colore(c.colore), n = docsIn(c.id).length + figlieDi(c.id).length, k = chiaveCartella(c); L.ordine.push(k);
  const b = el('button.riquadro' + (L.sel.has(k) ? '.scelto' : ''), { type: 'button', style: { background: t.colore }, 'aria-label': c.nome + ', ' + n + ' elementi', 'aria-pressed': L.modoSel ? String(L.sel.has(k)) : null, onclick: e => clicElemento(e, k, () => vai('#cartella-' + c.id)) },
    el('span.linguetta'), el('span.fronte', { style: { background: t.tinta } }, el('span.mono', { testo: String(n) }), el('b', { testo: c.nome })), segnoScelto(k));
  pressioneLunga(b, () => scegliElemento(k));
  if (puoTrascinare()) trascinabile(b, k);
  return bersaglio(b, c.id);
}
function statoVuoto(titolo, testo, azioni = []) {
  return el('div.vuoto', null, el('span.grande', null, icona('documenti')), el('h2', { testo: titolo }), testo ? el('p', { testo }) : null,
    azioni.length ? el('div.azioni', null, azioni.map(a => el('button.btn' + (a.primario ? '.primario' : ''), { type: 'button', testo: a.testo, onclick: a.fai }))) : null);
}
function voce(icn, etichetta, conta, attiva, fai, extra) {
  return el('button.voce', { type: 'button', 'aria-current': attiva ? 'page' : null, onclick: fai, ...extra }, icona(icn), el('span.etichetta', { testo: etichetta }), conta !== null ? el('span.conta', { testo: String(conta) }) : null);
}
function pannello() {
  const cest = [...L.docs.values()].filter(d => d.eliminato && !d.rimosso).length;
  const p = el('nav.pannello', { 'aria-label': 'Libreria' },
    el('div.pannello-testa', null, marchio(30), el('span.nome-app', { testo: 'plico' }), bottoneIcona('ingranaggio', 'Impostazioni', () => vai('#impostazioni'))),
    bersaglio(voce('documenti', 'Tutti i documenti', vivi().length, L.vista === 'tutti' && !L.cerca, () => vai('#libreria')), null),
    voce('stella', 'Preferiti', vivi().filter(d => d.preferito).length, L.vista === 'preferiti', () => vai('#preferiti')),
    el('span.pannello-titolo', { testo: 'Cartelle' }));
  const giro = (idc, livello) => {
    for (const c of figlieDi(idc)) {
      const t = colore(c.colore);
      const b = el('button.voce', { type: 'button', 'aria-current': L.vista === 'cartella' && L.cartella === c.id ? 'page' : null, style: { paddingLeft: (14 + Math.min(livello, 4) * 16) + 'px' }, onclick: () => vai('#cartella-' + c.id) },
        el('span.punto-cartella', { style: { background: t.colore } }), el('span.etichetta', { testo: c.nome }), el('span.conta', { testo: String(docsIn(c.id).length) }));
      pressioneLunga(b, () => menuCartella(c, b));
      bersaglio(b, c.id);
      p.append(b); giro(c.id, livello + 1);
    }
  };
  giro(null, 0);
  p.append(voce('nuovaCartella', 'Nuova cartella', null, false, () => nuovaCartella(null)), el('div.pannello-spazio'));
  const st = el('div.stato-sync', { role: 'status' }); aggiornaStatoSync(st); p.append(st);
  p.append(voce('cestino', 'Cestino', cest, L.vista === 'cestino', () => vai('#cestino')));
  return p;
}
function barraGiu() {
  const tab = (icn, testo, attiva, fai) => el('button.scheda-giu', { type: 'button', 'aria-current': attiva ? 'page' : null, onclick: fai }, icona(icn), el('span', { testo }));
  const piu = el('button.tondo', { type: 'button', 'aria-label': 'Aggiungi', onclick: e => menuNuovo(e.currentTarget) }, icona('piu'));
  return el('nav.barra-giu', { 'aria-label': 'Sezioni' },
    tab('documenti', 'Documenti', L.vista === 'tutti', () => vai('#libreria')),
    tab('cartella', 'Cartelle', L.vista === 'cartelle' || L.vista === 'cartella' || L.vista === 'cestino', () => vai('#cartelle')),
    tab('stella', 'Preferiti', L.vista === 'preferiti', () => vai('#preferiti')), piu);
}
function testaStretta(cerca) {
  return el('header.testa-stretta', null, marchio(28), el('span.nome-app', { testo: 'plico' }),
    bottoneIcona('lente', 'Cerca un documento', () => { cerca.classList.toggle('aperta'); if (cerca.classList.contains('aperta')) cerca.querySelector('input').focus(); else { L.cerca = ''; mostraLibreria(); } }),
    bottoneIcona('ingranaggio', 'Impostazioni', () => vai('#impostazioni')));
}
function promemoria() {
  const docs = vivi(); if (!docs.length || L.imp.dropbox?.tokenRinnovo) return null;
  const ultima = L.imp.ultimaCopia || Math.min(...docs.map(d => d.creato || Date.now()));
  if (Date.now() - ultima < 30 * GIORNO) return null;
  return el('div.promemoria', { role: 'note' }, el('span', { testo: L.imp.ultimaCopia ? 'L\'ultima copia di sicurezza ha più di 30 giorni.' : 'Nessuna copia di sicurezza finora.' }),
    el('button.btn.piccolo', { type: 'button', testo: 'Esporta', onclick: () => emetti('azione:esporta') }));
}

export function mostraLibreria() {
  const app = $('#app');
  const vecchiaPosizione = radice?.querySelector('.contenuto')?.scrollTop || 0, stessaVista = radice?.dataset.vista === L.vista + ':' + L.cartella;
  const campo = el('input', { type: 'search', placeholder: 'Cerca un documento', 'aria-label': 'Cerca un documento', value: L.cerca, enterkeyhint: 'search' });
  const cerca = el('label.cerca' + (L.cerca ? '.aperta' : ''), null, icona('lente'), campo);
  let tRicerca = 0;
  campo.addEventListener('input', () => { clearTimeout(tRicerca); tRicerca = setTimeout(() => { L.cerca = campo.value; disegnaContenuto(); }, 120); });
  const contenuto = el('div.contenuto');
  const principale = el('main.principale', null, testaStretta(cerca), contenuto,
    el('button.tondo.piu', { type: 'button', 'aria-label': 'Aggiungi', onclick: e => menuNuovo(e.currentTarget) }, icona('piu')), barraGiu());
  radice = el('div.libreria', { 'data-vista': L.vista + ':' + L.cartella }, pannello(), principale);

  function testata(titolo, briciole, extra) {
    if (L.modoSel) return barraSelezione();
    const t = el('header.testata', null, el('div.testata-titolo', null, briciole || null, el('h1', { testo: titolo })), extra || null, cerca,
      el('button.btn.testo.importa', { type: 'button', onclick: scegliFile }, icona('importa'), 'Importa'),
      bottoneIcona('seleziona', 'Seleziona', () => { L.modoSel = true; mostraLibreria(); }, 'bi entra-sel'),
      bottoneIcona(vistaGriglia() ? 'elenco' : 'griglia', vistaGriglia() ? 'Mostra come elenco' : 'Mostra come griglia', async () => { await impostaL('vista', vistaGriglia() ? 'elenco' : 'griglia'); mostraLibreria(); }, 'bi cambia-vista'));
    return t;
  }
  function rigaOrdine(nota) {
    const o = L.imp.ordine || 'recenti';
    const b = el('button.ordina', { type: 'button', 'aria-label': 'Ordina: ' + (o === 'nome' ? 'Per nome' : 'Recenti') }, o === 'nome' ? 'Per nome' : 'Recenti', icona('giu'));
    b.addEventListener('click', () => menu(b, [
      { testo: 'Recenti', icona: o === 'recenti' ? 'fatto' : null, fai: async () => { await impostaL('ordine', 'recenti'); mostraLibreria(); } },
      { testo: 'Per nome', icona: o === 'nome' ? 'fatto' : null, fai: async () => { await impostaL('ordine', 'nome'); mostraLibreria(); } }
    ], { titolo: 'Ordina' }));
    return el('div.riga-ordine', null, el('span.nota', { testo: nota }), b);
  }
  function disegnaContenuto() {
    contenuto.replaceChildren(); L.ordine = [];
    const q = senzaAccenti(L.cerca.trim());
    if (q) {
      const ris = ordina(vivi().filter(d => senzaAccenti(d.nome).includes(q)));
      contenuto.append(testata('Risultati'), ris.length ? documenti(ris, true) : statoVuoto('Nessun risultato', 'Nessun documento ha "' + L.cerca.trim() + '" nel nome.'));
      return;
    }
    if (L.vista === 'tutti') {
      const docs = ordina(vivi());
      contenuto.append(testata('Tutti i documenti'));
      const ult = L.imp.ultimoAperto && L.docs.get(L.imp.ultimoAperto);
      if (ult && !ult.eliminato && !ult.rimosso) contenuto.append(el('button.riprendi', { type: 'button', onclick: () => vai('#doc-' + ult.id) },
        el('span.tondino', null, icona('libro')), el('span.testi', null, el('span.sopratitolo', { testo: 'Riprendi' }), el('span.titolo', { testo: ult.nome + ' - pagina ' + (ult.pagina || 1) + ' di ' + (ult.pagine ?? '-') })), icona('avanti')));
      const pm = promemoria(); if (pm) contenuto.append(pm);
      if (!docs.length) contenuto.append(statoVuoto('Qui arriveranno i tuoi PDF', null, [
        { testo: 'Importa un PDF', primario: true, fai: scegliFile }, { testo: 'Crea un documento vuoto', fai: sceltaVuoto }, { testo: 'Apri il documento di prova', fai: apriProva }]));
      else contenuto.append(rigaOrdine(docs.length === 1 ? '1 documento' : docs.length + ' documenti'), documenti(docs, true));
    } else if (L.vista === 'preferiti') {
      const docs = ordina(vivi().filter(d => d.preferito));
      contenuto.append(testata('Preferiti'), docs.length ? documenti(docs, true) : statoVuoto('Nessun preferito.', 'Tocca la stella nel menu di un documento.'));
    } else if (L.vista === 'cartelle') {
      contenuto.append(testata('Cartelle'));
      const lista = el('div.elenco');
      const giro = (idc, livello) => { for (const c of figlieDi(idc)) {
        const t = colore(c.colore);
        const k = chiaveCartella(c); L.ordine.push(k);
        const b = el('button.riga-cartella' + (L.sel.has(k) ? '.scelto' : ''), { type: 'button', style: { paddingLeft: (4 + Math.min(livello, 4) * 20) + 'px' }, 'aria-pressed': L.modoSel ? String(L.sel.has(k)) : null, onclick: e => clicElemento(e, k, () => vai('#cartella-' + c.id)) },
          segnoScelto(k), el('span.icona-cartella', { style: { background: t.tinta, color: '#0E1D2A' } }, icona('cartella')), el('span.etichetta', { testo: c.nome }), el('span.mono', { testo: String(docsIn(c.id).length) }));
        pressioneLunga(b, () => scegliElemento(k)); bersaglio(b, c.id); lista.append(b); giro(c.id, livello + 1); } };
      giro(null, 0);
      lista.append(el('button.riga-cartella', { type: 'button', onclick: () => nuovaCartella(null) }, el('span.icona-cartella', { style: { background: 'var(--carta)' } }, icona('nuovaCartella')), el('span.etichetta', { testo: 'Nuova cartella' })));
      const cest = [...L.docs.values()].filter(d => d.eliminato && !d.rimosso).length;
      lista.append(el('button.riga-cartella', { type: 'button', onclick: () => vai('#cestino') }, el('span.icona-cartella', { style: { background: 'var(--carta)' } }, icona('cestino')), el('span.etichetta', { testo: 'Cestino' }), el('span.mono', { testo: String(cest) })));
      contenuto.append(lista);
    } else if (L.vista === 'cartella') {
      const c = cartellaViva(L.cartella);
      if (!c) { vai('#libreria', { sostituisci: true }); return; }
      const perc = percorsoCartella(c.id).slice(0, -1);
      const sopra = perc.length ? perc[perc.length - 1] : null;
      const bric = el('button.briciole', { type: 'button', onclick: () => vai(sopra ? '#cartella-' + sopra.id : (stretta() ? '#cartelle' : '#libreria')) }, (perc.length ? perc.map(x => x.nome).join(' / ') : (stretta() ? 'Cartelle' : 'Tutti i documenti')) + ' /');
      const azioni = bottoneIcona('puntini', 'Azioni per la cartella ' + c.nome, e => menuCartella(c, e.currentTarget));
      contenuto.append(testata(c.nome, bric, azioni));
      const sotto = figlieDi(c.id), docs = ordina(docsIn(c.id));
      if (sotto.length) contenuto.append(el('section.riquadri', { 'aria-label': 'Sottocartelle' }, sotto.map(riquadroCartella)));
      if (docs.length) contenuto.append(rigaOrdine(docs.length === 1 ? '1 documento' : docs.length + ' documenti'), documenti(docs));
      else if (!sotto.length) contenuto.append(statoVuoto('Questa cartella è vuota.', 'Sposta qui un documento o importane uno.', [{ testo: 'Importa un PDF', primario: true, fai: scegliFile }]));
    } else if (L.vista === 'cestino') {
      const docs = [...L.docs.values()].filter(d => d.eliminato && !d.rimosso).sort((a, b) => b.eliminato - a.eliminato);
      contenuto.append(testata('Cestino'), el('p.nota', { style: { margin: 0, color: 'var(--testo-2)' }, testo: 'I documenti restano qui 30 giorni, poi vengono eliminati.' }));
      contenuto.append(docs.length ? documenti(docs, true) : statoVuoto('Il cestino è vuoto.', null));
    }
  }
  disegnaContenuto();
  app.replaceChildren(radice);
  if (stessaVista) contenuto.scrollTop = vecchiaPosizione;
  document.title = 'plico';
}
export async function mostraVista(vista, cartella = null) {
  if (L.vista !== vista || L.cartella !== cartella) { L.sel.clear(); L.modoSel = false; }
  L.vista = vista; L.cartella = cartella;
  if (vista !== 'tutti') L.cerca = '';
  mostraLibreria();
}
