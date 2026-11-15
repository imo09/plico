// Client Dropbox (sezione L): collegamento PKCE, rinnovo del token, chiamate, caricamento a pezzi. Solo la cartella dell'app.
import { attendi } from './20-base.js';
import { impostazione, imposta } from './30-archivio.js';

export const CHIAVE = '{{CHIAVE_DROPBOX}}';
export const dropboxAcceso = () => !!CHIAVE && !CHIAVE.includes('{');
const API = 'https://api.dropboxapi.com', CONTENUTI = 'https://content.dropboxapi.com';
const PEZZO = 8 * 1048576;
const ritorno = () => location.origin + location.pathname;

export class ErroreDropbox extends Error {
  constructor(tipo, messaggio, dettaglio = '') { super(messaggio); this.tipo = tipo; this.dettaglio = dettaglio; }
}
const b64url = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function casuale(n) { const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~', a = crypto.getRandomValues(new Uint8Array(n)); let s = ''; for (const x of a) s += c[x % c.length]; return s; }
// punto 163: nell'intestazione Dropbox-API-Arg i caratteri non ASCII vanno scritti come \uXXXX
export const argomento = o => JSON.stringify(o).replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

export async function collega() {
  const verifier = casuale(64), state = casuale(24);
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  await imposta('dropboxAttesa', { verifier, state, ritorno: ritorno(), hash: location.hash });
  const q = new URLSearchParams({ client_id: CHIAVE, response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256', token_access_type: 'offline', redirect_uri: ritorno(), state });
  location.assign('https://www.dropbox.com/oauth2/authorize?' + q);
}
async function token_(corpo) {
  let r;
  try { r = await fetch(API + '/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: CHIAVE, ...corpo }) }); }
  catch { throw new ErroreDropbox('rete', 'Senza rete'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroreDropbox(j.error === 'invalid_grant' ? 'scollegato' : 'server', j.error === 'invalid_grant' ? 'Il collegamento con Dropbox è scaduto. Collega di nuovo.' : 'Dropbox non risponde come dovrebbe', j.error || String(r.status));
  return j;
}
// al ritorno da Dropbox: ?code=...&state=... nell'indirizzo. Ritorna la configurazione, oppure null se non c'era nulla da completare
export async function completaCollegamento() {
  const u = new URL(location.href), code = u.searchParams.get('code'), state = u.searchParams.get('state'), errore = u.searchParams.get('error');
  if (!code && !errore) return null;
  const attesa = await impostazione('dropboxAttesa');
  history.replaceState(null, '', u.pathname + (attesa?.hash || u.hash || '#impostazioni'));
  await imposta('dropboxAttesa', null);
  if (errore) throw new ErroreDropbox('annullato', 'Collegamento con Dropbox annullato.');
  if (!attesa || attesa.state !== state) throw new ErroreDropbox('stato', 'Il collegamento con Dropbox non è andato a buon fine. Riprova.');
  const j = await token_({ code, grant_type: 'authorization_code', code_verifier: attesa.verifier, redirect_uri: attesa.ritorno });
  const conf = { chiave: CHIAVE, tokenRinnovo: j.refresh_token, tokenAccesso: j.access_token, scadenza: Date.now() + (j.expires_in || 14400) * 1000, account: j.account_id, nome: '', revIndice: null, firmaIndice: null, ultimoGiro: 0, errore: null };
  await imposta('dropbox', conf);
  try { const a = await chiama('users/get_current_account'); conf.nome = a?.name?.display_name || a?.email || ''; conf.email = a?.email || ''; await imposta('dropbox', { ...(await impostazione('dropbox')), nome: conf.nome, email: conf.email }); } catch {}
  return conf;
}
export async function configurazione() { return impostazione('dropbox', null); }
async function tokenAccesso(forza) {
  const c = await impostazione('dropbox');
  if (!c?.tokenRinnovo) throw new ErroreDropbox('scollegato', 'Dropbox non è collegato.');
  if (!forza && c.tokenAccesso && c.scadenza > Date.now() + 60000) return c.tokenAccesso;
  const j = await token_({ grant_type: 'refresh_token', refresh_token: c.tokenRinnovo });
  const n = { ...(await impostazione('dropbox')), tokenAccesso: j.access_token, scadenza: Date.now() + (j.expires_in || 14400) * 1000 };
  await imposta('dropbox', n);
  return n.tokenAccesso;
}
function tipoDa(sommario = '') {
  if (/conflict/.test(sommario)) return 'conflitto';
  if (/not_found/.test(sommario)) return 'nonTrovato';
  if (/insufficient_space/.test(sommario)) return 'spazio';
  return 'server';
}
async function richiesta(url, opzioni) {
  let rinnovato = false;
  for (let tentativo = 0; ; tentativo++) {
    const tk = await tokenAccesso(rinnovato);
    let r;
    try { r = await fetch(url, { method: 'POST', ...opzioni, headers: { ...(opzioni.headers || {}), Authorization: 'Bearer ' + tk } }); }
    catch { throw new ErroreDropbox('rete', 'Senza rete'); }
    if (r.status === 401 && !rinnovato) { rinnovato = true; continue; }
    if ((r.status === 429 || r.status === 503) && tentativo < 3) { await attendi(Math.min(60, Number(r.headers.get('Retry-After')) || 2 ** tentativo) * 1000); continue; }
    if (r.status === 409) {
      const j = await r.json().catch(() => ({})), t = tipoDa(j.error_summary);
      throw new ErroreDropbox(t, t === 'spazio' ? 'Lo spazio su Dropbox è finito. I documenti restano su questo dispositivo.' : 'Dropbox ha rifiutato la richiesta', j.error_summary || '');
    }
    if (r.status === 401) throw new ErroreDropbox('scollegato', 'Il collegamento con Dropbox è scaduto. Collega di nuovo.');
    if (!r.ok) throw new ErroreDropbox('server', 'Dropbox non risponde come dovrebbe', String(r.status));
    return r;
  }
}
export async function chiama(rotta, arg) {
  const r = await richiesta(API + '/2/' + rotta, arg === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arg) });
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
// tutte le voci della cartella dell'app (solo file)
export async function elenca() {
  let j = await chiama('files/list_folder', { path: '', recursive: true, include_deleted: false, limit: 2000 });
  const voci = [...j.entries];
  while (j.has_more) { j = await chiama('files/list_folder/continue', { cursor: j.cursor }); voci.push(...j.entries); }
  return voci.filter(v => v['.tag'] === 'file');
}
export async function scarica(percorso) {
  const r = await richiesta(CONTENUTI + '/2/files/download', { headers: { 'Dropbox-API-Arg': argomento({ path: percorso }) } });
  let meta = null; try { meta = JSON.parse(r.headers.get('Dropbox-API-Result')); } catch {}
  return { blob: await r.blob(), meta };
}
// carica un Blob; rev = revisione di partenza (aggiorna solo se il file è ancora quello), null = file nuovo
export async function carica(percorso, blob, rev) {
  const commit = { path: percorso, mode: rev ? { '.tag': 'update', update: rev } : { '.tag': 'add' }, autorename: false, mute: true, strict_conflict: true };
  const binario = { 'Content-Type': 'application/octet-stream' };
  if (blob.size <= PEZZO) {
    const r = await richiesta(CONTENUTI + '/2/files/upload', { headers: { ...binario, 'Dropbox-API-Arg': argomento(commit) }, body: blob });
    return r.json();
  }
  const pezzo = async (rotta, arg, corpo) => {   // punto 163b: un pezzo fallito si riprova fino a 3 volte
    for (let i = 0; ; i++) {
      try { const r = await richiesta(CONTENUTI + '/2/' + rotta, { headers: { ...binario, 'Dropbox-API-Arg': argomento(arg) }, body: corpo }); return r.json(); }
      catch (e) { if (e.tipo !== 'rete' && e.tipo !== 'server' || i >= 2) throw e; await attendi(2000 * (i + 1)); }
    }
  };
  const { session_id } = await pezzo('files/upload_session/start', { close: false }, blob.slice(0, PEZZO));
  let pos = PEZZO;
  while (pos < blob.size) {
    const fine = Math.min(blob.size, pos + PEZZO);
    if (fine === blob.size) return pezzo('files/upload_session/finish', { cursor: { session_id, offset: pos }, commit }, blob.slice(pos, fine));
    await pezzo('files/upload_session/append_v2', { cursor: { session_id, offset: pos }, close: false }, blob.slice(pos, fine));
    pos = fine;
  }
  return pezzo('files/upload_session/finish', { cursor: { session_id, offset: pos }, commit }, new Blob([]));
}
export async function elimina(percorso) {
  try { await chiama('files/delete_v2', { path: percorso }); } catch (e) { if (e.tipo !== 'nonTrovato') throw e; }
}
export async function sposta(da, a) { return (await chiama('files/move_v2', { from_path: da, to_path: a, autorename: false })).metadata; }
export async function scollega() {
  try { await chiama('auth/token/revoke'); } catch {}
  await imposta('dropbox', null);
}
