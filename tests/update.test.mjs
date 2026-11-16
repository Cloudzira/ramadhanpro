import test from 'node:test';
import assert from 'node:assert/strict';
import { watchForUpdates, applyUpdate } from '../src/update.js';

function emitter() {
  const map = {};
  return { addEventListener: (t, f) => (map[t] ||= []).push(f), emit: (t, e) => (map[t] || []).forEach(f => f(e)) };
}
function setup({ controller = {}, waiting = null } = {}) {
  const reg = Object.assign(emitter(), { waiting, installing: null, updates: 0, update() { this.updates++; return Promise.resolve(); } });
  const sw = Object.assign(emitter(), { controller, register: async () => reg });
  const doc = Object.assign(emitter(), { visibilityState: 'visible' });
  const intervals = [];
  const timers = { setInterval: (f, ms) => intervals.push([f, ms]), setTimeout: () => {} };
  return { reg, sw, doc, timers, intervals };
}

test('pembaruan yang sudah menunggu langsung diumumkan', async () => {
  const waiting = {}, s = setup({ waiting }), got = [];
  await watchForUpdates({ serviceWorker: s.sw, swUrl: 'sw.js', scope: './', onUpdate: w => got.push(w), doc: s.doc, timers: s.timers });
  assert.deepEqual(got, [waiting]);
  assert.equal(s.reg.updates, 1, 'cek pembaruan saat aplikasi dibuka');
});

test('pembaruan yang baru selesai diunduh diumumkan sekali', async () => {
  const s = setup(), got = [], worker = Object.assign(emitter(), { state: 'installing' });
  await watchForUpdates({ serviceWorker: s.sw, swUrl: 'sw.js', scope: './', onUpdate: w => got.push(w), doc: s.doc, timers: s.timers });
  s.reg.installing = worker; s.reg.emit('updatefound');
  worker.state = 'installed'; worker.emit('statechange'); worker.emit('statechange');
  assert.deepEqual(got, [worker]);
});

test('pemasangan pertama (belum ada controller) tidak memunculkan banner', async () => {
  const s = setup({ controller: null, waiting: {} }), got = [];
  await watchForUpdates({ serviceWorker: s.sw, swUrl: 'sw.js', scope: './', onUpdate: w => got.push(w), doc: s.doc, timers: s.timers });
  assert.deepEqual(got, []);
});

test('cek ulang saat tab terlihat kembali dan berkala', async () => {
  const s = setup();
  await watchForUpdates({ serviceWorker: s.sw, swUrl: 'sw.js', scope: './', onUpdate() {}, doc: s.doc, timers: s.timers });
  s.doc.visibilityState = 'hidden'; s.doc.emit('visibilitychange');
  assert.equal(s.reg.updates, 1);
  s.doc.visibilityState = 'visible'; s.doc.emit('visibilitychange');
  assert.equal(s.reg.updates, 2);
  assert.equal(s.intervals.length, 1);
  s.intervals[0][0]();
  assert.equal(s.reg.updates, 3);
});

test('tanpa dukungan service worker tidak error', async () => {
  assert.equal(await watchForUpdates({ serviceWorker: undefined, onUpdate() {} }), null);
});

test('applyUpdate mengirim SKIP_WAITING dan memuat ulang tepat sekali', () => {
  const sw = emitter(), sent = [], pending = [];
  let reloads = 0;
  applyUpdate({ worker: { postMessage: m => sent.push(m) }, serviceWorker: sw, reload: () => reloads++, timers: { setTimeout: f => pending.push(f) } });
  assert.deepEqual(sent, [{ type: 'SKIP_WAITING' }]);
  sw.emit('controllerchange'); sw.emit('controllerchange'); pending[0]();
  assert.equal(reloads, 1);
});
