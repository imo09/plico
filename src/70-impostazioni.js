// Impostazioni, Guida, copia di sicurezza (Esporta tutto, Importa una copia), promemoria.
import { $, el, data, peso, numero, nomePulito, dataFile, scarica, stretta, emetti, ascolta, sha16 } from './20-base.js';
import { icona, bottoneIcona, foglio, avviso, conferma, scegli, interruttore, segmenti, indietro, vai } from './25-interfaccia.js';
import { leggi, tutti, insieme, segniDi, togliSegniDi, spazio, protetto, proteggi } from './30-archivio.js';
import { pulito } from './36-segni.js';
import { unisciSchede, unisciRecord, unisciSegni, pubblica, pubblicaCartella } from './37-unione.js';
import { scomponiBlob, fileDi, apriDocumento, miniatura } from './40-pdf.js';
import { creaZip, leggiZip } from './42-zip.js';
import { L, impostaL, svuotaCestino, vivi, caricaLibreria, dimenticaMiniatura, salvaScheda } from './50-libreria.js';
import { D } from './60-documento.js';

export const VERSIONE = '{{VERSIONE}}';
export const sezioniExtra = [];   // 80-sync.js aggiunge qui la sezione Sincronizzazione

export const GUIDA = [
  ['A cosa serve', 'plico apre i tuoi PDF, te li fa leggere e ti lascia scriverci sopra a mano. I documenti restano su questo dispositivo.'],
  ['Come funziona', 'Importa un PDF con il +. Tocca un documento per leggerlo. Tocca Scrivi per usare penna, evidenziatore e gomma; tocca Leggi per tornare alla lettura. Con una penna, come la S Pen, la penna scrive e il dito scorre. Ogni segno si salva da solo.'],
  ['Opzioni', 'Tocca di nuovo lo strumento attivo per cambiare colore e spessore. Tieni ferma la penna a fine tratto per avere una linea dritta. Con Testo scrivi con la tastiera; con Forme tracci linee, frecce, rettangoli ed ellissi; con Seleziona sposti, ridimensioni, copi o elimini i segni. Dal menu inserisci un\'immagine o la tua firma; da Pagine aggiungi, sposti o elimini pagine. Nella libreria tieni premuto un documento per sceglierne più di uno. Doppio tocco per ingrandire, tocco con due dita per annullare.'],
  ['Esempio', 'Ti arriva un modulo. Condividi > plico, firmi, poi Condividi per rimandarlo. Chi lo riceve vede la firma con qualsiasi lettore PDF.'],
  ['Attenzione', 'I documenti vivono nel browser di questo dispositivo: se cancelli i dati del sito o disinstalli l\'app, li perdi. Esporta ogni tanto una copia di sicurezza dalle Impostazioni. Su iPhone il sistema può svuotare l\'archivio dopo un lungo periodo senza uso. I documenti non si vedono nell\'Archivio del telefono: usa Condividi o Salva una copia, anche per stampare. plico regge PDF fino a 200 MB; uno molto grande si apre più lentamente e su un telefono con poca memoria Condividi può non riuscire. plico non modifica il testo dei PDF e non apre file Word, Excel o PowerPoint: esportali in PDF dall\'app che li ha creati.']
];
const LICENZE = 'pdf.js 6.4.299, Mozilla: licenza Apache 2.0, con i font standard Foxit e Liberation e le rispettive licenze.\n\nperfect-freehand 1.2.3, Stephen Ruiz Ltd: licenza MIT.\n\nSpace Grotesk, Space Mono e Poppins: SIL Open Font License 1.1.\n\nIl testo completo delle licenze è nel file LICENZE.txt del sito e in lib/pdfjs/LICENSE.';

export function applicaTema(t = L.imp.tema || 'auto') {
  if (t === 'chiaro' || t === 'scuro') document.documentElement.dataset.tema = t; else delete document.documentElement.dataset.tema;
  try { localStorage.setItem('plico-tema', t); } catch {}
}

// ---------- copia di sicurezza (punti 118-120) ----------
const PARTE = 1024 * 1048576;
const CHIAVI_IMP = ['tema', 'splash', 'latoBarra', 'raddrizza', 'lineaDritta', 'vista', 'ordine', 'colori', 'coloriRecenti', 'spessori', 'strumento'];
export async function esportaTutto() {
  const docs = vivi();
  if (!docs.length) { avviso('Non ci sono documenti da esportare.'); return; }
  if (D.aperto) await D.strumenti?.salvaOra();
  const imp = {}; for (const k of CHIAVI_IMP) if (L.imp[k] !== undefined) imp[k] = L.imp[k];
  const indice = new Blob([JSON.stringify({ v: 1, app: 'plico', versione: VERSIONE, creato: Date.now(), cartelle: [...L.cartelle.values()].map(pubblicaCartella), documenti: docs.map(pubblica), impostazioni: imp }, null, 1)], { type: 'application/json' });
  const attesa = avviso('Preparo la copia di sicurezza', { durata: 600000 });
  const parti = []; let voci = [], tot = 0, saltati = [];
  for (const s of docs) {
    let b;
    try { b = await fileDi(s, { password: D.aperto && D.scheda?.id === s.id ? D.password : null }); }
    catch (e) { console.error(e); try { b = await leggi('basi', s.id); saltati.push(s.nome); } catch { b = null; } }
    if (!b) continue;
    if (voci.length && tot + b.size > PARTE) { parti.push(voci); voci = []; tot = 0; }
    voci.push({ nome: 'Documenti/' + nomePulito(s.nome) + ' - ' + s.id + '.pdf', dati: b }); tot += b.size;
  }
  if (voci.length) parti.push(voci);
  const giorno = dataFile();
  for (let i = 0; i < parti.length; i++) {
    const zip = await creaZip([{ nome: 'libreria.json', dati: indice }, ...parti[i]]);
    scarica(zip, 'plico-copia-' + giorno + (parti.length > 1 ? '-' + (i + 1) : '') + '.zip');
    parti[i] = null;
  }
  attesa.remove();
  await impostaL('ultimaCopia', Date.now());
  avviso(saltati.length ? 'Copia salvata. ' + saltati.length + ' documenti protetti sono senza i segni: aprili e salva una copia.' : 'Copia salvata', { durata: saltati.length ? 8000 : 3000 });
  emetti('libreria:ridisegna');
}
export function scegliCopia() {
  const inp = el('input', { type: 'file', accept: '.zip,application/zip', multiple: true, style: { display: 'none' } });
  inp.addEventListener('change', () => { importaCopia(Array.from(inp.files)); inp.remove(); });
  document.body.append(inp); inp.click();
}
export async function importaCopia(files, modo) {
  if (!files?.length) return;
  let indice = null; const pdf = new Map();
  try {
    for (const f of files) for (const v of await leggiZip(f)) {
      if (v.nome === 'libreria.json') { const j = JSON.parse(new TextDecoder().decode(await v.leggi())); if (j?.app === 'plico' && (!indice || j.creato > indice.creato)) indice = j; }
      const m = /^Documenti\/.* - ([a-z0-9]{8})\.pdf$/.exec(v.nome); if (m) pdf.set(m[1], v);
    }
  } catch (e) { console.error(e); avviso('Questo file non è una copia di sicurezza di plico.', { durata: 5000 }); return; }
  if (!indice) { avviso('Questo file non è una copia di sicurezza di plico.', { durata: 5000 }); return; }
  const schede = (indice.documenti || []).filter(s => pdf.has(s.id)), cartelle = indice.cartelle || [];
  if (!modo) modo = await scegli('Importa una copia', [
    { id: 'unisci', testo: 'Unisci', sotto: 'Aggiunge ciò che manca e tiene la versione più recente.', icona: 'duplica' },
    { id: 'sostituisci', testo: 'Sostituisci', sotto: 'I documenti di adesso vanno nel Cestino.', icona: 'ripristina' }
  ], { sotto: 'La copia contiene ' + (schede.length === 1 ? '1 documento' : schede.length + ' documenti') + ' e ' + (cartelle.filter(c => !c.eliminato).length) + ' cartelle.' });
  if (!modo) return;
  const attesa = avviso('Importo la copia', { durata: 600000 });
  try {
    const ora = Date.now();
    if (modo === 'sostituisci') for (const s of vivi()) { s.eliminato = ora; await salvaScheda(s); }
    // cartelle
    const uc = unisciRecord([...L.cartelle.values()].map(pubblicaCartella), cartelle.map(pubblicaCartella));
    await insieme(uc.perLocale.map(c => ({ archivio: 'cartelle', valore: c })));
    // documenti
    const locali = [...L.docs.values()];
    const forzate = modo === 'sostituisci' ? schede.map(s => ({ ...s, eliminato: null, modificato: ora })) : schede;
    const us = unisciSchede(locali.filter(l => forzate.some(s => s.id === l.id)), forzate);
    let n = 0;
    for (const s of forzate) {
      const v = us.tutti.find(x => x.id === s.id);
      const voce = pdf.get(s.id), blob = new Blob([await voce.leggi()], { type: 'application/pdf' });
      const sc = await scomponiBlob(blob);
      const base = new Blob([sc.base], { type: 'application/pdf' }), impronta = sc.impronta || await sha16(base);
      const segniCopia = sc.segni.map(x => ({ ...x, doc: s.id, chiave: s.id + ':' + x.id }));
      const op = [];
      const locale = L.docs.get(s.id), baseLocale = locale && await leggi('basi', s.id);
      const vinceCopia = !locale || !baseLocale || modo === 'sostituisci' || v.impronta === impronta && locale.impronta !== impronta;
      if (vinceCopia || !baseLocale) op.push({ archivio: 'basi', valore: base, chiave: s.id });
      let segni;
      if (modo === 'sostituisci') { await togliSegniDi(s.id); segni = segniCopia; op.push(...segni.map(x => ({ archivio: 'segni', valore: x }))); }
      else { const u = unisciSegni(await segniDi(s.id), segniCopia); segni = u.tutti; op.push(...u.perLocale.map(x => ({ archivio: 'segni', valore: pulito(x) }))); }
      const scheda = { ...v, impronta: vinceCopia ? impronta : (locale?.impronta || impronta), peso: vinceCopia ? base.size : (locale?.peso ?? base.size),
        conSegni: segni.some(x => !x.eliminato), segniModificato: segni.reduce((m, x) => Math.max(m, x.modificato || 0), locale?.segniModificato || 0) };
      try { const { doc, compito } = await apriDocumento(vinceCopia ? base : baseLocale); try { op.push({ archivio: 'miniature', valore: await miniatura(doc, segni), chiave: s.id }); scheda.pagine = doc.numPages; } finally { await compito.destroy(); } } catch {}
      op.push({ archivio: 'documenti', valore: scheda });
      await insieme(op); dimenticaMiniatura(s.id); n++;
    }
    if (modo === 'sostituisci' && indice.impostazioni) for (const k of CHIAVI_IMP) if (k in indice.impostazioni) await impostaL(k, indice.impostazioni[k]);
    await caricaLibreria();
    attesa.remove();
    avviso(n === 1 ? '1 documento importato' : n + ' documenti importati');
    emetti('libreria:cambiata', { metadati: true });
    emetti('libreria:ridisegna');
  } catch (e) { console.error(e); attesa.remove(); avviso('plico non riesce a importare la copia su questo dispositivo. Nulla è andato perso.', { durata: 7000 }); }
}
ascolta('azione:esporta', () => esportaTutto());

// ---------- schermata delle Impostazioni (punto 88) ----------
let aperta = 'scrittura';
function riga({ testo, sotto, destra, paragrafo }) {
  return el('div.riga-imp' + (paragrafo ? '.paragrafo' : ''), null, el('span.testi', null, el('span', { testo }), sotto ? el('small', { testo: sotto }) : null), destra || null);
}
const azione = (testo, fai) => el('button.btn.piccolo', { type: 'button', testo, onclick: fai });
function info(testo) { return el('button.info-i', { type: 'button', 'aria-label': 'Informazioni', onclick: () => foglio({ sotto: testo, titolo: 'Che cosa vuol dire', azioni: [{ testo: 'Ho capito', fai: c => c() }] }) }, icona('info')); }

async function sezioni() {
  const sp = await spazio(), prot = await protetto(), cest = [...L.docs.values()].filter(d => d.eliminato && !d.rimosso).length, docs = vivi().length;
  const lato = L.imp.latoBarra || 'destra', tema = L.imp.tema || 'auto';
  const lista = [
    { id: 'scrittura', titolo: 'Scrittura', icona: 'penna', riassunto: 'Barra a ' + lato + ', raddrizza ' + (L.imp.raddrizza !== false ? 'acceso' : 'spento'), righe: () => [
      riga({ testo: 'Barra degli strumenti', sotto: 'Su tablet e PC', destra: segmenti([['destra', 'Destra'], ['sinistra', 'Sinistra']], lato, 'Barra degli strumenti', v => impostaL('latoBarra', v).then(ridisegna)) }),
      riga({ testo: 'Raddrizza tenendo premuto', sotto: 'Tieni ferma la penna a fine tratto', destra: interruttore(L.imp.raddrizza !== false, 'Raddrizza tenendo premuto', v => impostaL('raddrizza', v).then(ridisegna)) }),
      riga({ testo: 'Linea dritta automatica', sotto: 'Per l\'evidenziatore', destra: interruttore(L.imp.lineaDritta !== false, 'Linea dritta automatica', v => impostaL('lineaDritta', v).then(ridisegna)) }),
      riga({ testo: 'Evidenziatore agganciato al testo', sotto: 'Se parti da una parola, segue le righe del testo', destra: interruttore(L.imp.agganciaTesto !== false, 'Evidenziatore agganciato al testo', v => impostaL('agganciaTesto', v).then(ridisegna)) }),
      riga({ testo: 'Prova la penna', sotto: 'Pressione, inclinazione, tasto laterale', destra: azione('Apri', () => vai('#penna')) }),
      L.imp.firma ? riga({ testo: 'Firma salvata', sotto: 'Su questo dispositivo', destra: azione('Cancella', async () => { await impostaL('firma', null); avviso('Firma cancellata'); ridisegna(); }) }) : null].filter(Boolean) },
    { id: 'aspetto', titolo: 'Aspetto', icona: 'aspetto', riassunto: 'Tema ' + { auto: 'automatico', chiaro: 'chiaro', scuro: 'scuro' }[tema], righe: () => [
      riga({ testo: 'Tema', destra: segmenti([['auto', 'Automatico'], ['chiaro', 'Chiaro'], ['scuro', 'Scuro']], tema, 'Tema', async v => { await impostaL('tema', v); applicaTema(v); ridisegna(); }) }),
      riga({ testo: 'Animazione di avvio', sotto: 'Spenta anche con "riduci movimento"', destra: interruttore(L.imp.splash !== false, 'Animazione di avvio', async v => { await impostaL('splash', v); try { localStorage.setItem('plico-splash', v ? 'si' : 'no'); } catch {} }) })] },
    ...sezioniExtra.map(f => f()).filter(Boolean),
    { id: 'archivio', titolo: 'Archivio', icona: 'archivio', riassunto: peso(sp.usato) + ' - ' + (L.imp.ultimaCopia ? 'ultima copia ' + data(L.imp.ultimaCopia) : 'nessuna copia finora'), righe: () => [
      riga({ testo: 'Spazio usato', sotto: docs === 1 ? '1 documento su questo dispositivo' : docs + ' documenti su questo dispositivo', destra: el('span.valore', { testo: peso(sp.usato) }) }),
      riga({ testo: 'Protezione dalla pulizia', sotto: 'Il browser non cancella i documenti se manca spazio', destra: el('span', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
        el('span.valore', { testo: prot ? 'Attiva' : 'Non attiva' }), info('plico chiede al browser di non cancellare i documenti quando lo spazio del dispositivo finisce. Il browser può dire di no, per esempio se plico non è installata: in quel caso esporta più spesso una copia di sicurezza.'),
        prot ? null : azione('Attiva', async () => { const ok = await proteggi(); avviso(ok ? 'Protezione attiva' : 'Il browser non ha concesso la protezione. Esporta ogni tanto una copia.', { durata: 5000 }); ridisegna(); })) }),
      riga({ testo: 'Esporta tutto', sotto: L.imp.ultimaCopia ? 'Ultima copia: ' + data(L.imp.ultimaCopia) : 'Nessuna copia finora', destra: azione('Esporta', esportaTutto) }),
      riga({ testo: 'Importa una copia', sotto: 'Unisci o Sostituisci', destra: azione('Scegli', scegliCopia) }),
      riga({ testo: 'Svuota il cestino', sotto: cest === 1 ? '1 documento' : cest + ' documenti', destra: azione('Svuota', async () => { await svuotaCestino(); ridisegna(); }) })] },
    { id: 'guida', titolo: 'Guida', icona: 'guida', riassunto: 'A cosa serve, come funziona, attenzione', righe: () => GUIDA.map(([t, s]) => riga({ testo: t, sotto: s, paragrafo: true })) },
    { id: 'info', titolo: 'Informazioni', icona: 'info', riassunto: 'Versione e licenze', righe: () => [
      riga({ testo: 'Versione', destra: el('span.valore', { testo: VERSIONE }) }),
      riga({ testo: 'Licenze', sotto: 'pdf.js (Apache 2.0), perfect-freehand (MIT), caratteri (OFL)', destra: azione('Apri', () => foglio({ titolo: 'Licenze', contenuto: el('p', { style: { margin: 0, whiteSpace: 'pre-line', fontSize: '14px', lineHeight: '1.5' }, testo: LICENZE }), azioni: [{ testo: 'Chiudi', fai: c => c() }] })) })] }
  ];
  return lista;
}
let radice = null;
export async function mostraImpostazioni(sezione) {
  if (sezione) aperta = sezione;
  const lista = await sezioni();
  const colonna = el('div.colonna');
  const largo = !stretta();
  for (const z of lista) {
    const apertaOra = largo || aperta === z.id;
    const testa = el('button.sezione-testa', { type: 'button', 'aria-expanded': String(apertaOra), tabindex: largo ? '-1' : null, onclick: () => { if (largo) return; aperta = aperta === z.id ? '' : z.id; mostraImpostazioni(); } },
      el('span.bollo', null, icona(z.icona)), el('span.testi', null, el('b', { testo: z.titolo }), el('small', { testo: z.riassunto })), icona('giu', 'ic freccia'));
    const s = el('section.sezione', { id: 'sezione-' + z.id }, testa);
    if (apertaOra) s.append(el('div.sezione-corpo', null, z.righe()));
    colonna.append(s);
  }
  colonna.append(el('p.firma-app', null, 'plico ' + VERSIONE + ' - by ', el('b', { testo: 'nautargo' })));
  const corpo = el('div.corpo', null, colonna);
  const vecchio = radice?.isConnected ? radice.querySelector('.corpo')?.scrollTop : 0;
  radice = el('div.impostazioni', null, el('header.testa-doc', null, bottoneIcona('indietro', 'Torna alla libreria', () => indietro()), el('h1', { testo: 'Impostazioni' })), corpo);
  $('#app').replaceChildren(radice);
  corpo.scrollTop = vecchio || 0;
  if (sezione && sezione !== 'scrittura') radice.querySelector('#sezione-' + sezione)?.scrollIntoView({ block: 'start' });
  document.title = 'Impostazioni - plico';
}
function ridisegna() { if (radice?.isConnected) mostraImpostazioni(); }
export const ridisegnaImpostazioni = () => ridisegna();
