import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex, search, fold, tokens, highlight, quickSuggestions } from '../src/search.js';
import { DOA } from '../src/data/doa.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const index = buildIndex(DOA);
const top = (q, n = 1) => search(q, index, n).map(i => i.title);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

test('tombol “+” (FAB) di navigasi HP sudah dihapus', () => {
  const app = readFileSync(join(root, 'src/app.js'), 'utf8');
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
  assert.equal(/class="fab"/.test(app), false);
  assert.equal(/\.fab\b/.test(css), false);
});

test('fold: huruf kecil, tanpa aksen/harakat/apostrof', () => {
  assert.equal(fold('Tilawah Al-Qur’an'), 'tilawah al quran');
  assert.equal(fold('Ramaḍān'), 'ramadan');
  assert.equal(fold('  '), '');
});

test('ejaan berbeda disatukan', () => {
  assert.deepEqual(tokens('sholat'), tokens('salat'));
  assert.deepEqual(tokens('dzikir'), tokens('zikir'));
  assert.deepEqual(tokens('itikaf'), tokens('iktikaf'));
});

test('indeks memuat semua doa dan fitur', () => {
  assert.equal(index.filter(i => i.kind === 'Doa').length, DOA.length);
  assert.ok(index.filter(i => i.kind === 'Fitur').length >= 30);
});

test('kata kunci umum menemukan fitur yang benar', () => {
  assert.equal(top('sholat')[0].includes('halat'), true);
  assert.equal(top('kalender')[0], 'Kalender ibadah');
  assert.equal(top('qadha')[0], 'Qadha puasa');
  assert.equal(top('backup')[0], 'Privasi dan cadangan');
  assert.equal(top('mode gelap')[0], 'Tema tampilan');
  assert.equal(top('kartu lebaran')[0], 'Generator kartu Lebaran');
  assert.equal(top('pasang')[0], 'Pasang aplikasi');
});

test('doa ditemukan lewat judul, transliterasi, dan teks Arab', () => {
  assert.equal(top('doa berbuka')[0], 'Doa berbuka puasa');
  assert.equal(top('nawaitu')[0], 'Niat puasa Ramadhan');
  const arab = DOA[1][1].split(' ')[0];
  assert.ok(search(arab, index, 3).some(i => i.kind === 'Doa'));
});

test('toleran salah ketik tanpa nyasar', () => {
  assert.ok(top('zakta', 2).some(t => /zakat/i.test(t)));
  assert.ok(top('gelap', 3).every(t => !/Hidrasi/.test(t)));
});

test('kueri kosong, satu huruf, atau tak dikenal tidak menghasilkan apa pun', () => {
  assert.deepEqual(search('', index), []);
  assert.deepEqual(search('a', index), []);
  assert.deepEqual(search('xyzzyq', index), []);
});

test('semua kata kueri harus cocok (AND)', () => {
  assert.deepEqual(search('doa zakat tarawih', index), []);
});

test('saran cepat dan sorotan aman dari HTML', () => {
  assert.ok(quickSuggestions(index).length >= 4);
  assert.equal(highlight('Jadwal shalat & imsak', 'sholat', esc), 'Jadwal <mark>shalat</mark> &amp; imsak');
  assert.equal(highlight('<b>x</b>', 'b', esc).includes('<b>'), false);
});
