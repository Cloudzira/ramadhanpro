import test from 'node:test';
import assert from 'node:assert/strict';
import { dueReminders, pruneFired, reminderMessage, REMINDER_WINDOW_MS } from '../src/reminders.js';

const at = 1_800_000_000_000;
const epoch = { Imsak: at - 600_000, Subuh: at, Terbit: at + 3_600_000, Dzuhur: at + 20_000_000, Ashar: at + 30_000_000, Maghrib: at + 40_000_000, Isya: at + 45_000_000 };

test('mengingatkan tepat waktu dalam jendela 90 detik', () => {
  assert.deepEqual(dueReminders(epoch, at + 10_000).map(d => d.name), ['Subuh']);
  assert.equal(dueReminders(epoch, at - 1).length, 0, 'belum waktunya');
  assert.equal(dueReminders(epoch, at + REMINDER_WINDOW_MS).length, 0, 'sudah lewat jendela');
});

test('tidak mengingatkan dua kali', () => {
  const [first] = dueReminders(epoch, at + 5_000);
  assert.equal(dueReminders(epoch, at + 25_000, [first.id]).length, 0);
});

test('imsak hanya saat Ramadhan dan Terbit tidak diingatkan', () => {
  assert.equal(dueReminders(epoch, epoch.Imsak + 1_000).length, 0);
  assert.deepEqual(dueReminders(epoch, epoch.Imsak + 1_000, [], { ramadan: true }).map(d => d.name), ['Imsak']);
  assert.equal(dueReminders(epoch, epoch.Terbit + 1_000, [], { ramadan: true }).length, 0);
});

test('epoch kosong atau tidak valid tidak menimbulkan error', () => {
  assert.deepEqual(dueReminders(undefined, at), []);
  assert.deepEqual(dueReminders({ Subuh: NaN }, at), []);
});

test('pruneFired membuang penanda lebih dari 24 jam', () => {
  const now = at + 90_000_000;
  assert.deepEqual(pruneFired([`Subuh-${at}`, `Isya-${now - 1000}`, 'rusak'], now), [`Isya-${now - 1000}`]);
  assert.deepEqual(pruneFired(null, now), []);
});

test('pesan pengingat', () => {
  assert.equal(reminderMessage('Maghrib', { ramadan: true }).title, 'Waktu berbuka');
  assert.equal(reminderMessage('Maghrib').title, 'Waktu Maghrib');
  assert.equal(reminderMessage('Imsak', { ramadan: true }).title, 'Waktu imsak');
});
