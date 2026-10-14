// Convertitore Office in PDF (office2pdf in WebAssembly), eseguito fuori dal thread della pagina.
import init, { Office2PdfConverter } from './office2pdf.js';

const FONTS = [
  'Carlito-Regular', 'Carlito-Bold', 'Carlito-Italic', 'Carlito-BoldItalic',
  'LiberationSans-Regular', 'LiberationSans-Bold', 'LiberationSans-Italic', 'LiberationSans-BoldItalic',
  'LiberationSerif-Regular', 'LiberationSerif-Bold', 'LiberationSerif-Italic', 'LiberationSerif-BoldItalic',
  'Caladea-Regular', 'Caladea-Bold', 'Caladea-Italic', 'Caladea-BoldItalic'
];
let ready = null;
let conv = null;
let initMs = 0;
let initReported = false;

async function loadWasm() {
  // Il convertitore è compresso e diviso in parti (limite di 15 MB per file nell'anteprima in chat).
  const meta = await (await fetch(new URL('size.json', import.meta.url))).json();
  const parts = await Promise.all(meta.parts.map(async name => {
    const r = await fetch(new URL(name, import.meta.url));
    if (!r.ok) throw new Error('Convertitore non trovato (' + r.status + ')');
    return r.blob();
  }));
  const stream = new Blob(parts).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

function start() {
  if (!ready) {
    ready = (async () => {
      const t0 = performance.now();
      await init({ module_or_path: await loadWasm() });
      conv = new Office2PdfConverter();
      initMs = performance.now() - t0;
    })();
    ready.catch(() => { ready = null; });
  }
  return ready;
}

self.onmessage = async ({ data }) => {
  const { id, cmd } = data;
  try {
    await start();
    if (cmd === 'fonts') {
      conv.clearFonts();
      if (data.on) {
        for (const name of FONTS) {
          const r = await fetch(new URL('../../fonts/' + name + '.ttf', import.meta.url));
          if (r.ok) conv.registerFont(new Uint8Array(await r.arrayBuffer()));
        }
      }
      self.postMessage({ id, ok: true });
      return;
    }
    if (cmd === 'convert') {
      const t0 = performance.now();
      const result = conv.convertToPdf(new Uint8Array(data.data), data.format);
      const ms = performance.now() - t0;
      const pdf = result.pdf;
      const warnings = [];
      for (let i = 0; i < result.warningCount; i++) {
        const w = result.warningAt(i);
        if (w) { warnings.push({ kind: w.kind, message: w.message }); w.free?.(); }
      }
      result.free?.();
      const first = !initReported; initReported = true;
      self.postMessage({ id, ok: true, pdf, ms, initMs: first ? initMs : 0, warnings }, [pdf.buffer]);
    }
  } catch (e) {
    self.postMessage({ id, ok: false, error: String(e && e.message ? e.message : e) });
  }
};
