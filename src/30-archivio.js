// Archivio sul dispositivo: IndexedDB, base dati "plico". Solo questo modulo tocca IndexedDB.
const NOME = 'plico', VERSIONE = 1;
const CHIAVI = { documenti: 'id', cartelle: 'id', segni: 'chiave', remoti: 'id' };   // gli altri archivi hanno la chiave fuori dal valore
let db = null;

export function apri() {
  if (db) return db;
  db = new Promise((ok, ko) => {
    const r = indexedDB.open(NOME, VERSIONE);
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const n of ['documenti', 'cartelle', 'remoti']) if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, { keyPath: CHIAVI[n] });
      if (!d.objectStoreNames.contains('segni')) d.createObjectStore('segni', { keyPath: 'chiave' }).createIndex('doc', 'doc');
      for (const n of ['basi', 'miniature', 'impostazioni']) if (!d.objectStoreNames.contains(n)) d.createObjectStore(n);
    };
    r.onsuccess = () => { const d = r.result; d.onversionchange = () => d.close(); ok(d); };
    r.onerror = () => ko(r.error);
    r.onblocked = () => ko(new Error('Archivio bloccato da un\'altra scheda di plico'));
  });
  db.catch(() => { db = null; });
  return db;
}
const fatto = r => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
const finita = t => new Promise((ok, ko) => { t.oncomplete = () => ok(); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error || new Error('Scrittura annullata')); });

export async function leggi(archivio, chiave) {
  const t = (await apri()).transaction(archivio);
  return fatto(t.objectStore(archivio).get(chiave));
}
export async function tutti(archivio) {
  const t = (await apri()).transaction(archivio);
  return fatto(t.objectStore(archivio).getAll());
}
export async function scrivi(archivio, valore, chiave) {
  const t = (await apri()).transaction(archivio, 'readwrite');
  const s = t.objectStore(archivio);
  CHIAVI[archivio] ? s.put(valore) : s.put(valore, chiave);
  await finita(t);
}
export async function togli(archivio, chiave) {
  const t = (await apri()).transaction(archivio, 'readwrite');
  t.objectStore(archivio).delete(chiave);
  await finita(t);
}
// più scritture in una transazione sola: [{ archivio, valore, chiave }] oppure { archivio, togli: chiave }
export async function insieme(operazioni) {
  if (!operazioni.length) return;
  const nomi = [...new Set(operazioni.map(o => o.archivio))];
  const t = (await apri()).transaction(nomi, 'readwrite');
  for (const o of operazioni) {
    const s = t.objectStore(o.archivio);
    if ('togli' in o) s.delete(o.togli);
    else CHIAVI[o.archivio] ? s.put(o.valore) : s.put(o.valore, o.chiave);
  }
  await finita(t);
}
export async function segniDi(doc) {
  const t = (await apri()).transaction('segni');
  return fatto(t.objectStore('segni').index('doc').getAll(doc));
}
export async function togliSegniDi(doc) {
  const t = (await apri()).transaction('segni', 'readwrite');
  const s = t.objectStore('segni'), chiavi = await fatto(s.index('doc').getAllKeys(doc));
  for (const k of chiavi) s.delete(k);
  await finita(t);
}
export async function impostazione(nome, predefinito) {
  const v = await leggi('impostazioni', nome);
  return v === undefined ? predefinito : v;
}
export async function imposta(nome, valore) { return scrivi('impostazioni', valore, nome); }
export async function tutteImpostazioni() {
  const t = (await apri()).transaction('impostazioni'), s = t.objectStore('impostazioni');
  const [k, v] = await Promise.all([fatto(s.getAllKeys()), fatto(s.getAll())]);
  const o = {}; k.forEach((n, i) => { o[n] = v[i]; }); return o;
}
export async function spazio() {
  try { const e = await navigator.storage.estimate(); return { usato: e.usage, totale: e.quota }; } catch { return { usato: null, totale: null }; }
}
export async function protetto() { try { return await navigator.storage.persisted(); } catch { return false; } }
export async function proteggi() { try { return await navigator.storage.persist(); } catch { return false; } }
