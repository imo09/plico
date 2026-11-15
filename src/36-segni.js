// Riferimento (puro, senza DOM): tratti, contorni, impacchettamento. Dipende solo da getStroke di perfect-freehand.
export function poligonoDi(s, getStroke) {
  // s.punti: Float32Array [x, y, pressione, ...] in punti PDF - s.scala: px per punto al momento della scrittura - s.spessore: punti PDF
  const k = s.scala, n = s.punti.length / 3, pts = new Array(n);
  for (let i = 0; i < n; i++) pts[i] = [s.punti[3 * i] * k, s.punti[3 * i + 1] * k, s.punti[3 * i + 2]];
  const penna = s.strumento === 'penna';
  const o = getStroke(pts, { size: (penna ? 0.755 : 1) * s.spessore * k, thinning: penna ? 0.63 : 0, smoothing: 0.5, streamline: 0.15, simulatePressure: false, last: true });
  const out = new Float32Array(o.length * 2);
  for (let i = 0; i < o.length; i++) { out[2 * i] = Math.round(o[i][0] / k * 100) / 100; out[2 * i + 1] = Math.round(o[i][1] / k * 100) / 100; }
  return out;
}
export function semplifica(p, tol) {
  // Ramer-Douglas-Peucker sul contorno [x, y, ...]: toglie i punti che spostano il bordo meno di "tol" punti PDF
  const n = p.length / 2; if (n < 8) return Array.from(p);
  const tieni = new Uint8Array(n); tieni[0] = tieni[n - 1] = 1;
  const pila = [[0, n - 1]];
  while (pila.length) {
    const [a, b] = pila.pop(); if (b - a < 2) continue;
    const ax = p[2 * a], ay = p[2 * a + 1], dx = p[2 * b] - ax, dy = p[2 * b + 1] - ay, l2 = dx * dx + dy * dy;
    let max = -1, im = -1;
    for (let i = a + 1; i < b; i++) {
      const ex = p[2 * i] - ax, ey = p[2 * i + 1] - ay;
      let t = l2 ? (ex * dx + ey * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d = Math.hypot(ex - t * dx, ey - t * dy);
      if (d > max) { max = d; im = i; }
    }
    if (max > tol) { tieni[im] = 1; pila.push([a, im], [im, b]); }
  }
  const out = []; for (let i = 0; i < n; i++) if (tieni[i]) out.push(p[2 * i], p[2 * i + 1]);
  return out;
}
export function asseDi(s, ogni = 4) {   // percorso della punta, alleggerito: finisce in /InkList
  const a = [], n = s.punti.length / 3;
  for (let i = 0; i < n; i += ogni) a.push(s.punti[3 * i], s.punti[3 * i + 1]);
  if ((n - 1) % ogni) a.push(s.punti[3 * (n - 1)], s.punti[3 * (n - 1) + 1]);
  return a;
}
export function impacchetta(segni) {    // segni in memoria -> oggetto per JSON (punti come interi a differenze, centesimi di punto)
  return { v: 1, app: 'plico', segni: segni.map(s => {
    const o = {}; for (const k in s) if (k[0] !== '_') o[k] = s[k];
    if (s.punti) { const a = s.punti, d = new Array(a.length); let px = 0, py = 0, pp = 0;
      for (let i = 0; i < a.length; i += 3) { const x = Math.round(a[i] * 100), y = Math.round(a[i + 1] * 100), p = Math.round(a[i + 2] * 100); d[i] = x - px; d[i + 1] = y - py; d[i + 2] = p - pp; px = x; py = y; pp = p; }
      o.punti = d; }
    return o; }) };
}
export function spacchetta(obj) {       // oggetto letto dal JSON -> segni in memoria
  if (!obj || obj.v !== 1 || !Array.isArray(obj.segni)) return [];
  return obj.segni.map(s => { const o = { ...s };
    if (Array.isArray(s.punti)) { const d = s.punti, a = new Float32Array(d.length); let x = 0, y = 0, p = 0;
      for (let i = 0; i < d.length; i += 3) { x += d[i]; y += d[i + 1]; p += d[i + 2]; a[i] = x / 100; a[i + 1] = y / 100; a[i + 2] = p / 100; }
      o.punti = a; }
    return o; });
}

// ---- aggiunte della 2.0 (non nell'appendice A1) ----
export function rettDi(s) {   // rettangolo [x0, y0, x1, y1] in punti PDF, con metà spessore
  if (s._rett) return s._rett;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  if (s.punti) for (let i = 0; i < s.punti.length; i += 3) { const x = s.punti[i], y = s.punti[i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  else if (s.riquadri) for (const [a, b, c, d] of s.riquadri) { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d); }
  else if (s.rett) [x0, y0, x1, y1] = s.rett;
  const m = (s.spessore || 0) / 2;
  return (s._rett = [x0 - m, y0 - m, x1 + m, y1 + m]);
}
function distanzaSegmento(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
// true se il punto (x, y), in punti PDF, è entro "raggio" dal segno
export function tocca(s, x, y, raggio) {
  if (s.eliminato) return false;
  const [x0, y0, x1, y1] = rettDi(s);
  if (x < x0 - raggio || x > x1 + raggio || y < y0 - raggio || y > y1 + raggio) return false;
  if (s.punti) {
    const p = s.punti, r = raggio + (s.spessore || 0) / 2, n = p.length / 3;
    if (n === 1) return Math.hypot(x - p[0], y - p[1]) <= r;
    for (let i = 0; i < n - 1; i++) if (distanzaSegmento(x, y, p[3 * i], p[3 * i + 1], p[3 * i + 3], p[3 * i + 4]) <= r) return true;
    return false;
  }
  if (s.riquadri) return s.riquadri.some(([a, b, c, d]) => x >= a - raggio && x <= c + raggio && y >= b - raggio && y <= d + raggio);
  return true;
}
// true se il segmento da (ax, ay) a (bx, by) passa entro "raggio" dal segno (gomma veloce)
export function toccaTratto(s, ax, ay, bx, by, raggio) {
  const passi = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / Math.max(0.5, raggio / 2)));
  for (let i = 0; i <= passi; i++) if (tocca(s, ax + (bx - ax) * i / passi, ay + (by - ay) * i / passi, raggio)) return true;
  return false;
}
// tratto dritto da "da" ad "a", con pressione costante: [x, y, p, ...]
export function linea(da, a, pressione, passo = 2) {
  const n = Math.max(2, Math.ceil(Math.hypot(a[0] - da[0], a[1] - da[1]) / passo) + 1), out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const t = i / (n - 1); out[3 * i] = da[0] + (a[0] - da[0]) * t; out[3 * i + 1] = da[1] + (a[1] - da[1]) * t; out[3 * i + 2] = pressione; }
  return out;
}
export function arrotonda(punti) { const o = new Float32Array(punti.length); for (let i = 0; i < punti.length; i++) o[i] = Math.round(punti[i] * 100) / 100; return o; }
export function pulito(s) { const o = {}; for (const k in s) if (k[0] !== '_') o[k] = s[k]; return o; }   // senza le cache (_poligono, _rett)

// ---- aggiunte della 2.2: forme, spostare e ridimensionare (strumento Seleziona) ----
// punti di una forma tracciata trascinando da "a" a "b" (punti PDF), pressione costante
export function forma(tipo, a, b, passo = 2) {
  const [x0, y0] = a, [x1, y1] = b, out = [];
  const tratto = (p, q) => { const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / passo)); for (let i = out.length ? 1 : 0; i <= n; i++) out.push(p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n, 0.5); };
  if (tipo === 'rettangolo') { tratto([x0, y0], [x1, y0]); tratto([x1, y0], [x1, y1]); tratto([x1, y1], [x0, y1]); tratto([x0, y1], [x0, y0]); }
  else if (tipo === 'ellisse') {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.abs(x1 - x0) / 2, ry = Math.abs(y1 - y0) / 2;
    const n = Math.max(24, Math.ceil(Math.PI * (rx + ry) / passo));
    for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2; out.push(cx + rx * Math.cos(t), cy + ry * Math.sin(t), 0.5); }
  } else if (tipo === 'freccia') {
    tratto([x0, y0], [x1, y1]);
    const ang = Math.atan2(y1 - y0, x1 - x0), l = Math.min(14, Math.max(6, Math.hypot(x1 - x0, y1 - y0) * 0.3));
    const p1 = [x1 - l * Math.cos(ang - 0.45), y1 - l * Math.sin(ang - 0.45)], p2 = [x1 - l * Math.cos(ang + 0.45), y1 - l * Math.sin(ang + 0.45)];
    tratto([x1, y1], p1); tratto(p1, [x1, y1]); tratto([x1, y1], p2);
  } else tratto([x0, y0], [x1, y1]);
  return arrotonda(new Float32Array(out));
}
// copia del segno spostata di (dx, dy) e ridimensionata di k attorno ad (ax, ay); spessore e corpo seguono la scala
export function trasforma(s, { dx = 0, dy = 0, k = 1, ax = 0, ay = 0 } = {}) {
  const X = x => Math.round((ax + (x - ax) * k + dx) * 100) / 100, Y = y => Math.round((ay + (y - ay) * k + dy) * 100) / 100;
  const o = pulito(s);
  if (s.punti) { const p = new Float32Array(s.punti.length); for (let i = 0; i < p.length; i += 3) { p[i] = X(s.punti[i]); p[i + 1] = Y(s.punti[i + 1]); p[i + 2] = s.punti[i + 2]; } o.punti = p; }
  if (s.spessore) o.spessore = Math.round(s.spessore * k * 100) / 100;
  if (s.rett) { const [a, b, c, d] = s.rett; o.rett = [X(a), Y(b), X(c), Y(d)]; }
  if (s.corpo) o.corpo = Math.round(s.corpo * k * 10) / 10;
  if (s.riquadri) o.riquadri = s.riquadri.map(([a, b, c, d]) => [X(a), Y(b), X(c), Y(d)]);
  return o;
}
export function rettDiTutti(lista) {   // rettangolo che contiene più segni
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of lista) { const r = rettDi(s); x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]); x1 = Math.max(x1, r[2]); y1 = Math.max(y1, r[3]); }
  return [x0, y0, x1, y1];
}
export function intersecano(a, b) { return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]; }
