import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, hijriParts, formatHijri, estimateRamadanStart, HIJRI_MONTHS } from '../src/hijri.js';

test('addDays melewati batas bulan dan tahun', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2027-03-01', -1), '2027-02-28');
  assert.equal(addDays('2027-02-08', 0), '2027-02-08');
});

test('hijriParts: 1 Ramadhan 1448 jatuh pada 8 Februari 2027 (Umm al-Qura)', () => {
  assert.deepEqual(hijriParts('2027-02-08'), { day: 1, month: 9, year: 1448 });
  assert.deepEqual(hijriParts('2027-02-07'), { day: 30, month: 8, year: 1448 });
});

test('koreksi hari menggeser tanggal Hijriah dan dibatasi ±2', () => {
  assert.equal(hijriParts('2027-02-08', 1).day, 2);
  assert.equal(hijriParts('2027-02-08', -1).month, 8);
  assert.deepEqual(hijriParts('2027-02-08', 99), hijriParts('2027-02-08', 2));
});

test('formatHijri memakai nama bulan Indonesia', () => {
  assert.equal(formatHijri('2027-02-08'), '1 Ramadhan 1448 H');
  assert.equal(HIJRI_MONTHS.length, 12);
});

test('estimateRamadanStart: berikutnya, sedang berjalan, dan setelahnya', () => {
  assert.equal(estimateRamadanStart('2026-11-02'), '2027-02-08');
  assert.equal(estimateRamadanStart('2027-02-20'), '2027-02-08');
  assert.match(estimateRamadanStart('2027-04-01'), /^2028-01-/);
});

test('estimateRamadanStart mengikuti koreksi hari', () => {
  assert.equal(estimateRamadanStart('2026-11-02', 1), '2027-02-07');
  assert.equal(estimateRamadanStart('2026-11-02', -1), '2027-02-09');
});
