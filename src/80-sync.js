// Sincronizzazione con Dropbox (sezione L): giro, unione, stato. Si accende solo con la chiave dell'app.
import { el, emetti, ascolta, rimanda, oraBreve, nomePulito, sha16, data, id as nuovoId } from './20-base.js';
import { avviso, conferma, interruttore, foglio } from './25-interfaccia.js';
import { leggi, tutti, scrivi, insieme, segniDi, togliSegniDi, impostazione, imposta } from './30-archivio.js';
import { impacchetta, spacchetta, pulito } from './36-segni.js';
import { unisciSchede, unisciRecord, unisciSegni, pubblica, pubblicaCartella } from './37-unione.js';
import { scomponiBlob, fileDi, apriDocumento, miniatura } from './40-pdf.js';
import { L, ridisegna, dimenticaMiniatura, impostaL } from './50-libreria.js';
import { D } from './60-documento.js';
import { sezioniExtra, ridisegnaImpostazioni } from './70-impostazioni.js';
import { dropboxAcceso, collega, completaCollegamento, configurazione, elenca, scarica, carica, elimina, sposta, scollega, ErroreDropbox } from './78-dropbox.js';

const Y = { fase: 'spento', errore: null, ultimo: 0, inCorso: null, ancora: false, password: new Map(), conf: null };
const tipoRete = () => navigator.connection?.type || '';
const reteNota = () => !!navigator.connection && 'type' in navigator.connection;
const percorsoPdf = s => '/Documenti/' + nomePulito(s.nome) + ' - ' + s.id + '.pdf';
const percorsoSegni = idd => '/Segni/' + idd + '.json';

// ---------- stato a schermo (punto 163e) ----------
function testoStato() {
  if (!Y.conf?.tokenRinnovo) return '';
  if (Y.fase === 'inCorso') return 'Sincronizzazione in corso';
  if (Y.fase === 'senzaRete') return 'Senza rete';
  if (Y.fase === 'errore') return 'Errore: ' + (Y.errore || 'qualcosa non è andato');
  if (Y.fase === 'attesa' || programma.inAttesa()) return 'In attesa';
  if (Y.fase === 'ok' && Y.ultimo) return 'Sincronizzato alle ' + oraBreve(Y.ultimo);
  return 'In attesa';
}
function stato(fase, errore = null) {
  Y.fase = fase; Y.errore = errore;
  emetti('sync:stato', { visibile: !!Y.conf?.tokenRinnovo, testo: testoStato(), errore: fase === 'errore' });
  ridisegnaImpostazioni();
}

// ---------- quando (punto 162) ----------
export const programma = rimanda(() => giro(), 30000);
export function giro() {
  if (!dropboxAcceso() || !Y.conf?.tokenRinnovo) return Promise.resolve();
  if (Y.inCorso) { Y.ancora = true; return Y.inCorso; }
  Y.inCorso = (async () => { do { Y.ancora = false; await unGiro(); } while (Y.ancora); })().finally(() => { Y.inCorso = null; });
  return Y.inCorso;
}
async function unGiro() {
  programma.annulla();   // questo giro porta con sé anche le modifiche in coda
  if (!navigator.onLine) { stato('senzaRete'); return; }
  if (L.imp.soloWifi && reteNota() && !['wifi', 'ethernet', 'unknown', ''].includes(tipoRete())) { stato('attesa'); return; }
  stato('inCorso');
  for (let tentativo = 0; ; tentativo++) {
    try { await passi(); Y.ultimo = Date.now(); await salvaConf({ ultimoGiro: Y.ultimo, errore: null }); stato('ok'); return; }
    catch (e) {
      if (e instanceof ErroreDropbox && e.tipo === 'conflitto' && tentativo < 2) continue;   // punto 159.7
      console.error('Sincronizzazione', e);
      if (e.tipo === 'rete') { stato('senzaRete'); return; }
      if (e.tipo === 'scollegato') { Y.conf = { ...Y.conf, tokenRinnovo: null }; await imposta('dropbox', null); stato('errore', e.message); avviso(e.message, { durata: 6000 }); return; }
      stato('errore', e.tipo === 'conflitto' ? 'i file su Dropbox cambiano mentre plico li aggiorna. Riprova fra poco.' : e.message || 'qualcosa non è andato');
      return;
    }
  }
}
async function salvaConf(p) { Y.conf = { ...(await configurazione()), ...p }; await imposta('dropbox', Y.conf); L.imp.dropbox = Y.conf; }

// ---------- un giro (punto 159) ----------
function indiceLocale() {
  const cartelle = [...L.cartelle.values()].map(pubblicaCartella).sort((a, b) => (a.id < b.id ? -1 : 1));
  const documenti = [...L.docs.values()].map(pubblica).sort((a, b) => (a.id < b.id ? -1 : 1));
  return { cartelle, documenti };
}
async function cancellaContenuto(idd) {
  await insieme([{ archivio: 'basi', togli: idd }, { archivio: 'miniature', togli: idd }]);
  await togliSegniDi(idd); dimenticaMiniatura(idd);
}
async function rifaiMiniatura(idd, base, segni) {
  try { const { doc, compito } = await apriDocumento(base); try { const m = await miniatura(doc, segni); await scrivi('miniature', m, idd); dimenticaMiniatura(idd); return doc.numPages; } finally { await compito.destroy(); } }
  catch { return null; }
}
async function passi() {
  const voci = await elenca();
  const pdfRem = new Map(), segniRem = new Map(); let indice = null;
  for (const v of voci) {
    const p = v.path_lower; let m;
    if (p === '/libreria.json') indice = v;
    else if ((m = /^\/documenti\/.* - ([a-z0-9]{8})\.pdf$/.exec(p))) pdfRem.set(m[1], v);
    else if ((m = /^\/segni\/([a-z0-9]{8})\.json$/.exec(p))) segniRem.set(m[1], v);
  }
  // 3. indice: schede e cartelle
  const improntaPrima = new Map([...L.docs.values()].map(s => [s.id, s.impronta]));
  let remotoDiverso = false;
  if (indice && indice.rev !== Y.conf.revIndice) {
    const { blob } = await scarica('/libreria.json');
    let j = null; try { j = JSON.parse(await blob.text()); } catch {}
    if (j?.app === 'plico') {
      const us = unisciSchede([...L.docs.values()], j.documenti || []);
      const uc = unisciRecord([...L.cartelle.values()].map(pubblicaCartella), (j.cartelle || []).map(pubblicaCartella));
      const op = [...us.perLocale.map(s => ({ archivio: 'documenti', valore: s })), ...uc.perLocale.map(c => ({ archivio: 'cartelle', valore: c }))];
      await insieme(op);
      for (const s of us.perLocale) { L.docs.set(s.id, s); if (s.rimosso) await cancellaContenuto(s.id); }
      for (const c of uc.perLocale) L.cartelle.set(c.id, c);
      remotoDiverso = us.perRemoto || uc.perRemoto;
      if (op.length) ridisegna();
    }
    await salvaConf({ revIndice: indice.rev });
  } else if (!indice) remotoDiverso = true;
  // 4. documenti uno per uno
  const remoti = new Map((await tutti('remoti')).map(r => [r.id, r]));
  for (const s of [...L.docs.values()]) {
    const r = remoti.get(s.id) || { id: s.id }, pr = pdfRem.get(s.id), sr = segniRem.get(s.id);
    if (s.rimosso) {
      if (pr) await elimina(pr.path_display || pr.path_lower);
      if (sr) await elimina(sr.path_display || sr.path_lower);
      if (remoti.has(s.id)) await insieme([{ archivio: 'remoti', togli: s.id }]);
      continue;
    }
    let base = await leggi('basi', s.id), cambiatoQui = false;
    const prima = improntaPrima.get(s.id);
    // l'originale: manca qui, oppure su Dropbox ne è arrivato uno più recente
    const remotoNuovo = pr && prima !== undefined && s.impronta !== prima;
    if ((!base || remotoNuovo) && pr) {
      if (base && remotoNuovo && r.impronta && prima !== r.impronta) await copiaLocale(s, base, prima);   // punto 160: cambiati tutti e due
      const { blob } = await scarica(pr.path_display || pr.path_lower);
      const sc = await scomponiBlob(new Blob([blob], { type: 'application/pdf' }));
      base = new Blob([sc.base], { type: 'application/pdf' });
      const impr = sc.impronta || await sha16(base);
      const u = unisciSegni(await segniDi(s.id), sc.segni.map(x => ({ ...x, doc: s.id, chiave: s.id + ':' + x.id })));
      await insieme([{ archivio: 'basi', valore: base, chiave: s.id }, ...u.perLocale.map(x => ({ archivio: 'segni', valore: pulito(x) }))]);
      const pagine = await rifaiMiniatura(s.id, base, u.tutti);
      s.impronta = impr; s.peso = base.size; if (pagine) s.pagine = pagine; s.conSegni = u.tutti.some(x => !x.eliminato);
      await scrivi('documenti', s);
      r.revPdf = pr.rev; r.impronta = impr; r.segniNelPdf = s.segniModificato || 0; r.percorso = pr.path_lower;
      if (D.aperto && D.scheda?.id === s.id) avviso('Il documento è cambiato su un altro dispositivo: chiudilo e riaprilo per vederlo aggiornato.', { durata: 7000 });
    }
    if (!base) { await scrivi('remoti', r); continue; }   // arriverà al prossimo giro
    // i segni (punto 156b)
    let segni = await segniDi(s.id), caricaSegni = !sr && segni.length > 0;
    if (sr && sr.rev !== r.revSegni) {
      const { blob } = await scarica(sr.path_display || sr.path_lower);
      let j = null; try { j = JSON.parse(await blob.text()); } catch {}
      const remotiSegni = j?.app === 'plico' ? spacchetta(j.segni).map(x => ({ ...x, doc: s.id, chiave: s.id + ':' + x.id })) : [];
      const u = unisciSegni(segni, remotiSegni);
      if (u.perLocale.length) {
        await insieme(u.perLocale.map(x => ({ archivio: 'segni', valore: pulito(x) })));
        segni = u.tutti; cambiatoQui = true;
        if (D.aperto && D.scheda?.id === s.id) D.strumenti?.aggiornaSegni?.(u.perLocale);
      }
      r.revSegni = sr.rev; caricaSegni = caricaSegni || u.perRemoto;
    }
    if ((s.segniModificato || 0) > (r.inviatiSegni || 0)) caricaSegni = true;
    if (caricaSegni) {
      const corpo = JSON.stringify({ v: 1, app: 'plico', doc: s.id, impronta: s.impronta, aggiornato: Date.now(), segni: impacchetta(segni) });
      const meta = await carica(percorsoSegni(s.id), new Blob([corpo], { type: 'application/json' }), sr ? sr.rev : null);
      r.revSegni = meta.rev; r.inviatiSegni = Math.max(s.segniModificato || 0, Date.now());
    }
    if (cambiatoQui) {
      const conSegni = segni.some(x => !x.eliminato);
      if (conSegni !== s.conSegni) { s.conSegni = conSegni; await scrivi('documenti', s); }
      if (!(D.aperto && D.scheda?.id === s.id)) await rifaiMiniatura(s.id, base, segni);
      ridisegna();
    }
    // il PDF: solo a documento chiuso (punto 156b)
    const aperto = D.aperto && D.scheda?.id === s.id;
    const percorso = percorsoPdf(s);
    let prAttuale = pr;
    if (!aperto && pr && pr.path_lower !== percorso.toLowerCase()) { prAttuale = await sposta(pr.path_display || pr.path_lower, percorso); r.revPdf = prAttuale.rev; }
    const daComporre = !pr || r.impronta !== s.impronta || (s.segniModificato || 0) > (r.segniNelPdf || 0);
    const password = Y.password.get(s.id) || null;
    if (!aperto && daComporre && (!s.protetto || password || !segni.some(x => !x.eliminato))) {
      const blob = await fileDi(s, { password, segni });
      const meta = await carica(percorso, blob, prAttuale ? prAttuale.rev : null);
      r.revPdf = meta.rev; r.impronta = s.impronta; r.segniNelPdf = s.segniModificato || 0; r.percorso = meta.path_lower;
      Y.password.delete(s.id);
    }
    await scrivi('remoti', r);
  }
  // 5. indice su Dropbox
  const locale = indiceLocale(), firma = await sha16(new TextEncoder().encode(JSON.stringify(locale)));
  if (remotoDiverso || firma !== Y.conf.firmaIndice || !indice) {
    const corpo = JSON.stringify({ v: 1, app: 'plico', aggiornato: Date.now(), ...locale });
    const meta = await carica('/libreria.json', new Blob([corpo], { type: 'application/json' }), indice ? (Y.conf.revIndice || indice.rev) : null);
    await salvaConf({ revIndice: meta.rev, firmaIndice: firma });
  }
}
// punto 160: l'originale è cambiato qui e su Dropbox; quello di qui resta come documento nuovo
async function copiaLocale(s, base, impronta) {
  const idd = nuovoId(), ora = Date.now(), segni = await segniDi(s.id);
  const n = { ...s, id: idd, nome: s.nome + ' (copia del ' + data(ora) + ')', impronta, peso: base.size, creato: ora, modificato: ora, aperto: ora };
  await insieme([{ archivio: 'documenti', valore: n }, { archivio: 'basi', valore: base, chiave: idd },
    ...segni.map(x => ({ archivio: 'segni', valore: { ...pulito(x), doc: idd, chiave: idd + ':' + x.id } }))]);
  L.docs.set(idd, n);
  await rifaiMiniatura(idd, base, segni);
}

// ---------- sezione nelle Impostazioni (punto 163f) ----------
sezioniExtra.push(() => {
  if (!dropboxAcceso()) return null;
  const c = Y.conf;
  if (!c?.tokenRinnovo) return { id: 'sync', titolo: 'Sincronizzazione', icona: 'nuvola', riassunto: 'Dropbox non collegato', righe: () => [
    el('div.riga-imp', null, el('span.testi', null, el('span', { testo: 'Collega Dropbox' }), el('small', { testo: 'I documenti vanno nella cartella Applicazioni/plico del tuo Dropbox. Ad app chiusa non si sincronizza nulla.' })),
      el('button.btn.piccolo.primario', { type: 'button', testo: 'Collega', onclick: () => collega() }))] };
  return { id: 'sync', titolo: 'Sincronizzazione', icona: 'nuvola', riassunto: 'Dropbox - ' + testoStato(), righe: () => [
    el('div.riga-imp', null, el('span.testi', null, el('span', { testo: 'Dropbox' }), el('small', { testo: c.nome || c.email || 'Account collegato' }))),
    el('div.riga-imp', null, el('span.testi', null, el('span', { testo: 'Stato' }), el('small', { testo: testoStato() })),
      el('button.btn.piccolo', { type: 'button', testo: Y.fase === 'errore' ? 'Riprova' : 'Sincronizza ora', onclick: () => { programma.subito() || giro(); } })),
    reteNota() ? el('div.riga-imp', null, el('span.testi', null, el('span', { testo: 'Solo con Wi-Fi' }), el('small', { testo: 'Con la rete mobile le modifiche restano in coda' })),
      interruttore(!!L.imp.soloWifi, 'Solo con Wi-Fi', v => impostaL('soloWifi', v).then(() => { if (!v) giro(); }))) : null,
    el('div.riga-imp', null, el('span.testi', null, el('span', { testo: 'Scollega' }), el('small', { testo: 'I documenti restano su questo dispositivo e su Dropbox.' })),
      el('button.btn.piccolo', { type: 'button', testo: 'Scollega', onclick: async () => {
        if (!(await conferma('Scollegare Dropbox?', { titolo: 'Scollegare Dropbox?', ok: 'Scollega', pericolo: false }))) return;
        await scollega(); await insieme((await tutti('remoti')).map(r => ({ archivio: 'remoti', togli: r.id })));
        Y.conf = null; L.imp.dropbox = null; stato('spento'); avviso('Dropbox scollegato');
      } }))] };
});

// ---------- avvio ----------
export async function avviaSync() {
  if (!dropboxAcceso()) return;
  try {
    const fatto = await completaCollegamento();
    if (fatto) avviso('Dropbox collegato' + (fatto.nome ? ': ' + fatto.nome : ''));
  } catch (e) { avviso(e.message || 'Il collegamento con Dropbox non è andato a buon fine.', { durata: 6000 }); }
  Y.conf = await configurazione(); L.imp.dropbox = Y.conf;
  if (!Y.conf?.tokenRinnovo) { stato('spento'); return; }
  stato('attesa');
  giro();
  ascolta('libreria:cambiata', () => { if (Y.conf?.tokenRinnovo) { programma(); if (Y.fase !== 'inCorso') stato('attesa'); } });
  ascolta('documento:chiuso', ({ id, password }) => { if (password) Y.password.set(id, password); programma.subito() || giro(); });
  addEventListener('online', () => giro());
  addEventListener('offline', () => stato('senzaRete'));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') giro(); });
  setInterval(() => { if (document.visibilityState === 'visible') giro(); }, 120000);
}
export const statoSync = Y;
