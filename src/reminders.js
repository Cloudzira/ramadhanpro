// Logika murni pengingat waktu salat (tanpa DOM): menentukan pengingat mana yang jatuh tempo.
// Pengingat hanya berjalan saat aplikasi terbuka atau aktif di latar belakang.

export const REMINDER_WINDOW_MS = 90_000;
export const REMINDER_NAMES = ['Imsak', 'Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];

/** Pengingat yang waktunya tiba dalam jendela terakhir dan belum pernah dibunyikan. */
export function dueReminders(epoch, now, fired = [], { ramadan = false } = {}) {
  const due = [];
  for (const name of REMINDER_NAMES) {
    if (name === 'Imsak' && !ramadan) continue;
    const at = epoch?.[name];
    if (!Number.isFinite(at) || now < at || now - at >= REMINDER_WINDOW_MS) continue;
    const id = `${name}-${at}`;
    if (!fired.includes(id)) due.push({ id, name, at });
  }
  return due;
}

/** Hanya menyimpan penanda dalam 24 jam terakhir agar daftar tidak menumpuk. */
export function pruneFired(fired, now) {
  return (Array.isArray(fired) ? fired : []).filter(id => {
    const at = Number(String(id).split('-').pop());
    return Number.isFinite(at) && now - at < 86_400_000;
  });
}

export function reminderMessage(name, { ramadan = false } = {}) {
  if (name === 'Imsak') return { title: 'Waktu imsak', body: 'Mulai menahan diri dari makan dan minum. Semoga puasamu lancar.' };
  if (name === 'Maghrib' && ramadan) return { title: 'Waktu berbuka', body: 'Selamat berbuka puasa. Semoga Allah menerima puasamu.' };
  return { title: `Waktu ${name}`, body: 'Menurut jadwal yang dihitung di perangkatmu. Cocokkan dengan jadwal masjid setempat.' };
}
