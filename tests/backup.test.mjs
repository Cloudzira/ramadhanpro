import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA_VERSION, validateBackup, pickNewer, backupReminderDue, formatBytes, dayHasActivity } from '../src/backup.js';

const DAY = 86_400_000;
const defaults = {
  settings: {
    ramadanStart: '2027-02-08', qadhaOwed: 0, qadhaDone: 0, qadhaDeadline: '2027-02-07', quranGoal: 30, sadaqahGoal: 0,
    zakatFitrah: 45000, nisab: 85000000, tarawihTarget: 30, theme: 'muslim', mode: 'dark', displayName: 'Sahabat', city: '',
    latitude: null, longitude: null, prayerMethod: 'kemenag', madhab: 'shafi', imsakOffset: 10, timezone: 'Asia/Jakarta',
    prayerAdjust: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, hijriOffset: 0, reminders: false,
  },
  days: {}, fasting: { preRamadan: [], syawal: [] }, prepDone: [], duas: [], family: [], kajian: [], infaq: [],
  card: { recipient: 'Keluarga dan sahabat', sender: '', message: 'Selamat Idulfitri.' },
  zakatFitrahPaid: false, habits: {}, iktikaf: false, schemaVersion: SCHEMA_VERSION, createdAt: 1_700_000_000_000,
};
const day = (extra = {}) => ({ prayers: [true, false, false, false, false], tasks: {}, pages: 0, sadaqah: 0, water: Array(8).fill(false), fast: false, mood: 0, note: '', dua: '', ...extra });
const valid = (extra = {}) => ({ settings: { displayName: 'Ani' }, days: { '2027-02-09': day() }, ...extra });

test('menolak berkas yang bukan cadangan', () => {
  assert.equal(validateBackup('bukan json {', defaults).reason, 'not_json');
  assert.equal(validateBackup('[]', defaults).reason, 'not_backup');
  assert.equal(validateBackup('null', defaults).reason, 'not_backup');
  assert.equal(validateBackup(JSON.stringify({ settings: {} }), defaults).reason, 'not_backup');
  assert.equal(validateBackup(JSON.stringify({ settings: {}, days: [] }), defaults).reason, 'not_backup');
});

test('menolak cadangan dari versi yang lebih baru', () => {
  const result = validateBackup(JSON.stringify(valid({ schemaVersion: SCHEMA_VERSION + 1 })), defaults);
  assert.deepEqual([result.ok, result.reason], [false, 'newer']);
});

test('menolak berkas terlalu besar', () => {
  assert.equal(validateBackup('x'.repeat(5 * 1024 * 1024 + 1), defaults).reason, 'too_big');
});

test('cadangan lama (tanpa schemaVersion) diterima dan dimigrasikan', () => {
  const result = validateBackup(JSON.stringify(valid()), defaults);
  assert.equal(result.ok, true);
  assert.equal(result.data.schemaVersion, SCHEMA_VERSION);
  assert.equal(result.data.settings.displayName, 'Ani');
  assert.equal(result.data.settings.ramadanStart, '2027-02-08');
  assert.equal(result.summary.activeDays, 1);
});

test('membersihkan tipe data yang salah', () => {
  const raw = valid({
    settings: { displayName: 42, theme: 'neon', mode: 'x', latitude: 999, longitude: 'abc', imsakOffset: 500, ramadanStart: 'kemarin', timezone: 'Bukan/Zona', madhab: 'lain', quranGoal: -4 },
    days: {
      '2027-02-09': { prayers: [true, 'ya'], water: 'banyak', pages: -5, mood: 99, note: 123, tasks: { 0: true, abc: true, 1: 'ya' } },
      'bukan-tanggal': day(),
      '2027-02-10': 'rusak',
    },
    infaq: [{ id: 'a', amount: 5000, date: '2027-02-09', purpose: 'masjid' }, { amount: -1 }, { amount: 'banyak' }, null],
    kajian: [{ title: 'Tema', note: 'Isi' }, { title: '', note: '' }],
    duas: ['Doa A', '', 5],
    family: [{ name: 'Ibu', done: 1 }, { name: '  ' }],
    fasting: { preRamadan: ['2027-02-01', '2027-02-01', 'x'], syawal: 'bukan array' },
    prepDone: [0, 2, 2, -1, 'a', 500],
    habits: { '2027-02-09-1': true, rusak: true },
  });
  const { ok, data, dropped } = validateBackup(JSON.stringify(raw), defaults);
  assert.equal(ok, true);
  assert.equal(data.settings.displayName, 'Sahabat');
  assert.equal(data.settings.theme, 'muslim');
  assert.equal(data.settings.mode, 'dark');
  assert.equal(data.settings.latitude, null);
  assert.equal(data.settings.longitude, null);
  assert.equal(data.settings.imsakOffset, 60);
  assert.equal(data.settings.ramadanStart, '2027-02-08');
  assert.equal(data.settings.timezone, 'Asia/Jakarta');
  assert.equal(data.settings.madhab, 'shafi');
  assert.equal(data.settings.quranGoal, 30);
  assert.deepEqual(Object.keys(data.days), ['2027-02-09']);
  const d = data.days['2027-02-09'];
  assert.deepEqual(d.prayers, [true, false, false, false, false]);
  assert.equal(d.water.length, 8);
  assert.equal(d.pages, 0);
  assert.equal(d.mood, 5);
  assert.equal(d.note, '');
  assert.deepEqual(d.tasks, { 0: true });
  assert.equal(data.infaq.length, 1);
  assert.equal(data.kajian.length, 1);
  assert.deepEqual(data.duas, ['Doa A']);
  assert.deepEqual(data.family, [{ name: 'Ibu', done: false }]);
  assert.deepEqual(data.fasting, { preRamadan: ['2027-02-01'], syawal: [] });
  assert.deepEqual(data.prepDone, [0, 2]);
  assert.deepEqual(data.habits, { '2027-02-09-1': true });
  assert.ok(dropped > 0);
});

test('menyimpan kunci pengaturan tambahan yang sederhana dan mengabaikan __proto__', () => {
  const text = '{"settings":{"dependents":4,"wealth":1000,"nested":{"a":1},"__proto__":{"polluted":true}},"days":{}}';
  const { data } = validateBackup(text, defaults);
  assert.equal(data.settings.dependents, 4);
  assert.equal(data.settings.wealth, 1000);
  assert.equal(data.settings.nested, undefined);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.getPrototypeOf(data.settings), Object.prototype);
});

test('dayHasActivity membedakan catatan kosong dan terisi', () => {
  assert.equal(dayHasActivity(day({ prayers: Array(5).fill(false) })), false);
  assert.equal(dayHasActivity(day()), true);
  assert.equal(dayHasActivity(day({ prayers: Array(5).fill(false), note: 'halo' })), true);
});

test('pickNewer: data lama tanpa cap waktu mempertahankan localStorage', () => {
  const local = { settings: {}, marker: 'lokal' };
  assert.equal(pickNewer(local, true, { updatedAt: 999, marker: 'idb' }).source, 'local');
});

test('pickNewer: IndexedDB menang jika localStorage kosong atau lebih lama', () => {
  assert.equal(pickNewer({}, false, { marker: 'idb' }).source, 'remote');
  assert.equal(pickNewer({ updatedAt: 100 }, true, { updatedAt: 200 }).source, 'remote');
  assert.equal(pickNewer({ updatedAt: 100 }, true, { updatedAt: 100 }).source, 'remote');
});

test('pickNewer: localStorage menang jika lebih baru atau IndexedDB kosong', () => {
  assert.equal(pickNewer({ updatedAt: 300 }, true, { updatedAt: 200 }).source, 'local');
  assert.equal(pickNewer({ updatedAt: 1 }, true, null).source, 'local');
});

test('pengingat cadangan', () => {
  const now = 1_800_000_000_000;
  const active = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [`2027-02-${String(i + 1).padStart(2, '0')}`, day()]));
  assert.equal(backupReminderDue({ days: active(2), createdAt: now - 30 * DAY }, now), false, 'catatan masih sedikit');
  assert.equal(backupReminderDue({ days: active(3), createdAt: now - 5 * DAY }, now), false, 'belum cukup lama');
  assert.equal(backupReminderDue({ days: active(3), createdAt: now - 20 * DAY }, now), true);
  assert.equal(backupReminderDue({ days: active(3), createdAt: now - 20 * DAY, lastBackupAt: now - 2 * DAY }, now), false, 'baru dicadangkan');
  assert.equal(backupReminderDue({ days: active(3), createdAt: now - 20 * DAY, backupSnoozeUntil: now + DAY }, now), false, 'ditunda');
  assert.equal(backupReminderDue({ days: { a: day({ prayers: Array(5).fill(false) }) }, createdAt: now - 99 * DAY }, now), false, 'catatan kosong tidak dihitung');
});

test('formatBytes', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
  assert.equal(formatBytes(null), '–');
});

test('pengaturan jadwal, Hijriah, dan pengingat dibersihkan saat impor', () => {
  const raw = valid({ settings: { prayerAdjust: { fajr: 2, isha: 99, dhuhr: 'x', asr: -99, maghrib: 1.6 }, hijriOffset: -9, reminders: 'ya', prayerMethod: 'kemenag' } });
  const { data } = validateBackup(JSON.stringify(raw), defaults);
  assert.deepEqual(data.settings.prayerAdjust, { fajr: 2, sunrise: 0, dhuhr: 0, asr: -30, maghrib: 2, isha: 30 });
  assert.equal(data.settings.hijriOffset, -2);
  assert.equal(data.settings.reminders, false);
  assert.equal(data.settings.prayerMethod, 'kemenag');
  const ok = validateBackup(JSON.stringify(valid({ settings: { reminders: true, hijriOffset: 1 } })), defaults).data.settings;
  assert.equal(ok.reminders, true);
  assert.equal(ok.hijriOffset, 1);
  assert.deepEqual(validateBackup(JSON.stringify(valid()), defaults).data.settings.prayerAdjust, defaults.settings.prayerAdjust);
});

test('keamanan: string bebas di kunci pengaturan tambahan ditolak (injeksi atribut HTML)', () => {
  const text = JSON.stringify({ settings: { dependents: '1" autofocus onfocus="alert(1)', wealth: '<img src=x onerror=alert(1)>', ok: 5, 'bad key"': 1 }, days: {} });
  const { data } = validateBackup(text, defaults);
  assert.equal(data.settings.dependents, undefined);
  assert.equal(data.settings.wealth, undefined);
  assert.equal(data.settings.ok, 5);
  assert.equal(data.settings['bad key"'], undefined);
});

test('keamanan: kunci yang ada di bawaan tetap dipaksa bertipe angka', () => {
  const withNumbers = { ...defaults, settings: { ...defaults.settings, dependents: 1, wealth: 0 } };
  const { data } = validateBackup(JSON.stringify({ settings: { dependents: '9" x="', wealth: 'abc' }, days: {} }), withNumbers);
  assert.equal(data.settings.dependents, 1);
  assert.equal(data.settings.wealth, 0);
});
