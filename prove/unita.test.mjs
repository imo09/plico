// Prove dei moduli puri: node --test prove/
import test from 'node:test';
import assert from 'node:assert/strict';
import { impacchetta, spacchetta, poligonoDi, semplifica, tocca, linea, arrotonda, pulito } from '../src/36-segni.js';
import { unisciSegni, unisciSchede, unisciRecord, potaLapidi, pubblica } from '../src/37-unione.js';
import { pdfVuoto } from '../src/41-vuoto.js';
import { creaZip, leggiZip } from '../src/42-zip.js';
import { getStroke } from '../src/35-freehand.js';

const segno = (id, mod, extra = {}) => ({ id, doc: 'aaaaaaaa', chiave: 'aaaaaaaa:' + id, tipo: 'tratto', pagina: 0, modificato: mod, eliminato: false,
  strumento: 'penna', colore: '#2E5E9E', spessore: 1.8, scala: 1.6, punti: new Float32Array([10, 10, 0.5, 20.25, 12.5, 0.6, 30, 15, 0.7]), ...extra });

test('impacchetta e spacchetta: andata e ritorno', () => {
  const s = [segno('m1', 1), segno('m2', 2, { eliminato: true })];
  const r = spacchetta(JSON.parse(JSON.stringify(impacchetta(s))));
  assert.equal(r.length, 2);
  assert.deepEqual(Array.from(r[0].punti), Array.from(s[0].punti));
  assert.equal(r[1].eliminato, true);
});
test('poligono e semplificazione', () => {
  const p = poligonoDi(segno('m1', 1), getStroke);
  assert.ok(p.length > 10);
  assert.ok(semplifica(p, 0.03).length <= p.length);
});
test('tocca: vicino sì, lontano no, eliminato no', () => {
  const s = segno('m1', 1);
  assert.equal(tocca(s, 20, 12.5, 1), true);
  assert.equal(tocca(s, 200, 200, 1), false);
  assert.equal(tocca({ ...s, eliminato: true }, 20, 12.5, 1), false);
});
test('linea, arrotonda, pulito', () => {
  const l = linea([0, 0], [10, 0], 0.5, 2);
  assert.equal(l[l.length - 3], 10);
  assert.equal(arrotonda(new Float32Array([1.234567]))[0].toFixed(2), '1.23');
  assert.equal('_poligono' in pulito({ a: 1, _poligono: 2 }), false);
});
test('unione dei segni: vince il più recente, le lapidi contano', () => {
  const qui = [segno('m1', 5), segno('m2', 1)], la = [segno('m1', 3, { eliminato: true }), segno('m2', 9, { eliminato: true }), segno('m3', 2)];
  const u = unisciSegni(qui, la);
  const per = Object.fromEntries(u.tutti.map(s => [s.id, s]));
  assert.equal(per.m1.eliminato, false);
  assert.equal(per.m2.eliminato, true);
  assert.ok(per.m3);
  assert.deepEqual(u.perLocale.map(s => s.id).sort(), ['m2', 'm3']);
  assert.equal(u.perRemoto, true);
});
test('unione dei segni identici: nulla da scrivere', () => {
  const u = unisciSegni([segno('m1', 5)], [segno('m1', 5)]);
  assert.equal(u.perLocale.length, 0); assert.equal(u.perRemoto, false);
});
test('unione delle schede: campi del dispositivo restano', () => {
  const qui = [{ id: 'd1', nome: 'A', modificato: 1, aperto: 99, pagina: 7, segniModificato: 50 }], la = [{ id: 'd1', nome: 'B', modificato: 2 }];
  const u = unisciSchede(qui, la);
  assert.equal(u.tutti[0].nome, 'B'); assert.equal(u.tutti[0].pagina, 7); assert.equal(u.tutti[0].aperto, 99);
  assert.equal(pubblica(u.tutti[0]).pagina, undefined);
});
test('parità di modificato: tutti scelgono lo stesso', () => {
  const a = { id: 'x', nome: 'A', modificato: 5 }, b = { id: 'x', nome: 'B', modificato: 5 };
  assert.equal(unisciRecord([a], [b]).tutti[0].nome, unisciRecord([b], [a]).tutti[0].nome);
});
test('lapidi vecchie via', () => {
  const ora = Date.now(), giorno = 86400000;
  const l = potaLapidi([segno('a', ora - 100 * giorno, { eliminato: true }), segno('b', ora - 10 * giorno, { eliminato: true }), segno('c', ora - 100 * giorno)], ora);
  assert.deepEqual(l.map(s => s.id), ['b', 'c']);
});
test('pdf vuoto: struttura valida', () => {
  for (const st of ['bianco', 'righe', 'quadretti']) {
    const b = pdfVuoto(3, st), t = new TextDecoder('latin1').decode(b);
    assert.ok(t.startsWith('%PDF-1.7')); assert.ok(t.trimEnd().endsWith('%%EOF')); assert.match(t, /\/Count 3/);
    const x = Number(/startxref\n(\d+)/.exec(t)[1]); assert.equal(t.slice(x, x + 4), 'xref');
  }
});
test('zip: andata e ritorno, nomi con accenti', async () => {
  const z = await creaZip([{ nome: 'libreria.json', dati: new TextEncoder().encode('{"a":1}') }, { nome: 'Documenti/Perché è così - abcdefgh.pdf', dati: new Blob([new Uint8Array([1, 2, 3])]) }]);
  const v = await leggiZip(z);
  assert.deepEqual(v.map(x => x.nome), ['libreria.json', 'Documenti/Perché è così - abcdefgh.pdf']);
  assert.deepEqual(Array.from(await v[1].leggi()), [1, 2, 3]);
});
