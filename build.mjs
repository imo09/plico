// build.mjs - unisce i sorgenti di src/ in un solo index.html. Uso: node build.mjs
// Regole per i sorgenti: moduli ES con nome numerato (20-base.js, 30-archivio.js, ...); un modulo importa solo
// da moduli con numero più basso, con la forma  import { a, b } from './NN-nome.js';  ed esporta con
// export function / export async function / export const / export class.
import fs from 'node:fs';
const SRC = 'src';
const conf = JSON.parse(fs.readFileSync(`${SRC}/versione.json`, 'utf8'));
const versione = conf.versione;
// Revisione 2: chiave dell'app Dropbox (punto 165b). Senza chiave la sincronizzazione non compare e la regola di sicurezza resta chiusa.
const chiave = (process.env.PLICO_DROPBOX ?? conf.dropbox ?? '').trim();
if (!/^[a-z0-9]*$/i.test(chiave)) throw new Error('La chiave Dropbox contiene caratteri non validi');
const cspDropbox = chiave ? ' https://api.dropboxapi.com https://content.dropboxapi.com' : '';
const file = fs.readdirSync(SRC).sort();

// 1. stile: tutti i .css in ordine, con i font incorporati
let css = file.filter(f => f.endsWith('.css')).map(f => fs.readFileSync(`${SRC}/${f}`, 'utf8')).join('\n');
css = css.replace(/url\((['"]?)(font\/[^'")]+\.woff2)\1\)/g, (_, __, p) => `url(data:font/woff2;base64,${fs.readFileSync(`${SRC}/${p}`).toString('base64')})`);

// 2. codice: ogni modulo diventa una funzione che restituisce ciò che esporta
const moduli = file.filter(f => f.endsWith('.js'));
let js = 'const __m = {};\n';
for (const f of moduli) {
  let t = fs.readFileSync(`${SRC}/${f}`, 'utf8');
  const nomi = [];
  t = t.replace(/^import\s*\{([^}]+)\}\s*from\s*['"]\.\/([^'"]+)['"];?[ \t]*$/gm, (_, lista, da) => {
    if (!moduli.includes(da) || da >= f) throw new Error(`${f}: può importare solo da moduli con numero più basso (trovato ${da})`);
    return `const {${lista.replace(/\s+as\s+/g, ': ')}} = __m[${JSON.stringify(da)}];`;
  });
  if (/^import[\s{]/m.test(t)) throw new Error(`${f}: import non riconosciuto. Usa: import { a, b } from './NN-nome.js';`);
  t = t.replace(/^export\s+(async\s+function\*?|function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (_, tipo, nome) => { nomi.push(nome); return `${tipo} ${nome}`; });
  if (/^export\s/m.test(t)) throw new Error(`${f}: export non riconosciuto. Usa: export function / const / class Nome`);
  js += `\n// ---- ${f} ----\n__m[${JSON.stringify(f)}] = await (async () => {\n${t}\nreturn { ${nomi.join(', ')} };\n})();\n`;
}
if (/<\/script/i.test(js)) throw new Error('Il codice contiene "</script": spezza la stringa in due');

// 3. guscio: stile e codice entrano nella pagina, il service worker riceve la versione
let html = fs.readFileSync(`${SRC}/00-guscio.html`, 'utf8');
for (const segno of ['<!--STILE-->', '<!--CODICE-->']) if (!html.includes(segno)) throw new Error(`Nel guscio manca ${segno}`);
html = html.replace('<!--STILE-->', () => `<style>\n${css}\n</style>`).replace('<!--CODICE-->', () => `<script type="module">\n${js}\n</script>`).replaceAll('{{VERSIONE}}', versione).replaceAll('{{CHIAVE_DROPBOX}}', chiave).replaceAll('{{CSP_DROPBOX}}', cspDropbox);
fs.writeFileSync('index.html', html);
fs.writeFileSync('sw.js', fs.readFileSync(`${SRC}/servizio/sw.js`, 'utf8').replaceAll('{{VERSIONE}}', versione));
console.log(`plico ${versione} - index.html ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, ${moduli.length} moduli, Dropbox ${chiave ? 'acceso' : 'spento'}`);
