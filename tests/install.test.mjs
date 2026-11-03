import test from 'node:test';
import assert from 'node:assert/strict';
import { installMode, isIos, isStandalone, installMessage } from '../src/install.js';

test('mode tombol: sudah terpasang > jendela siap > iOS > belum siap', () => {
  assert.equal(installMode({ hasPrompt: true, standalone: true }), 'installed');
  assert.equal(installMode({ hasPrompt: true }), 'prompt');
  assert.equal(installMode({ ios: true }), 'ios');
  assert.equal(installMode({ hasPrompt: true, ios: true }), 'prompt');
  assert.equal(installMode({}), 'wait');
  assert.equal(installMode(), 'wait');
});

test('deteksi iPhone, iPad, dan iPadOS yang menyamar sebagai Mac', () => {
  assert.equal(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'iPhone', 5), true);
  assert.equal(isIos('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)', 'iPad', 5), true);
  assert.equal(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5), true);
  assert.equal(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0), false);
  assert.equal(isIos('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 'Linux armv8l', 5), false);
});

test('isStandalone membaca display-mode dan navigator.standalone', () => {
  const win = (matches, standalone) => ({ matchMedia: q => ({ matches: matches.some(m => q.includes(m)) }), navigator: { standalone } });
  assert.equal(isStandalone(win(['standalone'], undefined)), true);
  assert.equal(isStandalone(win(['minimal-ui'], undefined)), true);
  assert.equal(isStandalone(win([], true)), true);
  assert.equal(isStandalone(win([], undefined)), false);
  assert.equal(isStandalone({}), false);
  assert.equal(isStandalone({ matchMedia() { throw new Error('x'); } }), false);
});

test('pesan untuk mode tanpa jendela pemasangan', () => {
  assert.match(installMessage('installed'), /sudah terpasang/);
  assert.match(installMessage('ios'), /Bagikan/);
  assert.match(installMessage('wait'), /belum siap/);
});
