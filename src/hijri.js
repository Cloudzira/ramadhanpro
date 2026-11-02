// Tanggal Hijriah (perkiraan) memakai kalender Umm al-Qura bawaan browser.
// Penetapan resmi di Indonesia mengikuti sidang isbat Kemenag atau ketetapan ormas,
// sehingga hasilnya bisa selisih 1–2 hari. Karena itu tersedia koreksi (offset) hari.

export const HIJRI_MONTHS = [
  'Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir', 'Jumadil Awal', 'Jumadil Akhir',
  'Rajab', 'Sya’ban', 'Ramadhan', 'Syawal', 'Dzulqa’dah', 'Dzulhijjah',
];
export const RAMADHAN = 9;

const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
  day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC',
});

function utcNoon(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** Menambah (atau mengurangi) hari pada kunci tanggal 'YYYY-MM-DD'. */
export function addDays(key, days) {
  const date = utcNoon(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** { day, month (1–12), year } Hijriah untuk tanggal Masehi `key`, setelah koreksi `offset` hari. */
export function hijriParts(key, offset = 0) {
  const shift = Math.max(-2, Math.min(2, Math.round(Number(offset) || 0)));
  const parts = formatter.formatToParts(utcNoon(addDays(key, shift)));
  const pick = type => Number(parts.find(part => part.type === type)?.value);
  const result = { day: pick('day'), month: pick('month'), year: pick('year') };
  return Object.values(result).every(Number.isFinite) ? result : null;
}

export function formatHijri(key, offset = 0) {
  try {
    const parts = hijriParts(key, offset);
    return parts ? `${parts.day} ${HIJRI_MONTHS[parts.month - 1]} ${parts.year} H` : '';
  } catch {
    return '';
  }
}

/**
 * Perkiraan 1 Ramadhan terdekat: Ramadhan yang sedang berjalan jika `fromKey` berada di dalamnya,
 * jika tidak, Ramadhan berikutnya. Mengembalikan 'YYYY-MM-DD' atau null.
 */
export function estimateRamadanStart(fromKey, offset = 0) {
  try {
    const now = hijriParts(fromKey, offset);
    if (!now) return null;
    if (now.month === RAMADHAN) return addDays(fromKey, -(now.day - 1));
    for (let i = 1; i <= 400; i += 1) {
      const key = addDays(fromKey, i);
      const parts = hijriParts(key, offset);
      if (parts && parts.month === RAMADHAN && parts.day === 1) return key;
    }
  } catch { /* Intl tanpa kalender Islam */ }
  return null;
}
