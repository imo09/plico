// Unione pura di record (schede, cartelle, segni): per chiave vince il "modificato" più recente; le lapidi contano.
// Non tocca il DOM né l'archivio. Usata dalla copia di sicurezza (Unisci) e dalla sincronizzazione.

const firmaCompleta = r => JSON.stringify(r, (k, v) => (k[0] === '_' ? undefined : (v instanceof Float32Array ? Array.from(v) : v)));
const firmaSegno = s => (s.modificato || 0) + ':' + (s.eliminato ? 1 : 0);

// a parità di "modificato" vince il record con la firma maggiore, così ogni dispositivo sceglie lo stesso
export function vince(a, b, firma = firmaCompleta) {
  if (!a) return b; if (!b) return a;
  const ma = a.modificato || 0, mb = b.modificato || 0;
  if (ma !== mb) return ma > mb ? a : b;
  return firma(a) >= firma(b) ? a : b;
}
// Ritorna { tutti, perLocale (record da scrivere su questo dispositivo), perRemoto (true se l'altra parte va aggiornata) }
export function unisciRecord(locali, remoti, chiave = r => r.id, firma = firmaCompleta) {
  const L = new Map(locali.map(r => [chiave(r), r])), R = new Map(remoti.map(r => [chiave(r), r]));
  const tutti = [], perLocale = []; let perRemoto = false;
  for (const k of new Set([...L.keys(), ...R.keys()])) {
    const l = L.get(k), r = R.get(k), v = vince(l, r, firma), fv = firma(v);
    tutti.push(v);
    if (!l || fv !== firma(l)) perLocale.push(v);
    if (!r || fv !== firma(r)) perRemoto = true;
  }
  return { tutti, perLocale, perRemoto };
}
export const chiaveSegno = s => s.chiave || (s.doc + ':' + s.id);
export const unisciSegni = (locali, remoti) => unisciRecord(locali, remoti, chiaveSegno, firmaSegno);

// campi della scheda che viaggiano fra dispositivi; "aperto", "pagina", "segniModificato", "conSegni" restano del dispositivo
export const CAMPI_SCHEDA = ['id', 'nome', 'cartella', 'preferito', 'origine', 'stile', 'pagine', 'peso', 'impronta', 'protetto', 'creato', 'modificato', 'eliminato', 'rimosso'];
export function pubblica(scheda) { const o = {}; for (const k of CAMPI_SCHEDA) o[k] = scheda[k] ?? null; return o; }
export function unisciSchede(locali, remoti) {
  const L = new Map(locali.map(s => [s.id, s]));
  const u = unisciRecord(locali.map(pubblica), remoti.map(pubblica));
  const completa = p => ({ aperto: p.creato, pagina: 1, segniModificato: 0, conSegni: false, ...(L.get(p.id) || {}), ...p });
  return { tutti: u.tutti.map(completa), perLocale: u.perLocale.map(completa), perRemoto: u.perRemoto };
}
export const CAMPI_CARTELLA = ['id', 'nome', 'colore', 'genitore', 'ordine', 'creato', 'modificato', 'eliminato', 'rimosso'];
export function pubblicaCartella(c) { const o = {}; for (const k of CAMPI_CARTELLA) o[k] = c[k] ?? null; return o; }

// toglie le lapidi più vecchie di "giorni"; quando(r) dice da quando il record è una lapide (0 = non lo è)
export function potaLapidi(lista, ora, giorni = 90, quando = r => (r.eliminato === true ? r.modificato : 0)) {
  const limite = ora - giorni * 86400000;
  return lista.filter(r => { const t = quando(r); return !t || t >= limite; });
}
