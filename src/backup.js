// Logika murni (tanpa DOM) untuk skema data, validasi cadangan, pemilihan data
// terbaru, dan pengingat cadangan. Dipisah agar mudah diuji: `npm test`.

export const SCHEMA_VERSION = 2;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const BACKUP_REMIND_DAYS = 14;
export const BACKUP_SNOOZE_DAYS = 3;
export const MIN_ACTIVE_DAYS_FOR_REMINDER = 3;

const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HABIT_RE = /^\d{4}-\d{2}-\d{2}-\d{1,3}$/;
const INDEX_RE = /^\d{1,3}$/;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, fallback = '', max = 10_000) => (typeof value === 'string' ? value.slice(0, max) : fallback);
const number = (value, fallback = 0) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const isDate = value => typeof value === 'string' && DATE_RE.test(value);
const unique = list => [...new Set(list)];

function booleanList(value, length) {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length }, (_, index) => source[index] === true);
}

function booleanMap(value, keyPattern) {
  const result = {};
  if (!isObject(value)) return result;
  for (const [key, flag] of Object.entries(value)) {
    if (keyPattern.test(key) && typeof flag === 'boolean') result[key] = flag;
  }
  return result;
}

function validTimeZone(value) {
  if (typeof value !== 'string' || !value || value.length > 80) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function sanitizeSettings(raw, defaults) {
  const source = isObject(raw) ? raw : {};
  const result = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = source[key];
    if (key === 'latitude') result[key] = typeof value === 'number' && value >= -90 && value <= 90 ? value : null;
    else if (key === 'longitude') result[key] = typeof value === 'number' && value >= -180 && value <= 180 ? value : null;
    else if (key === 'ramadanStart' || key === 'qadhaDeadline') result[key] = isDate(value) ? value : fallback;
    else if (key === 'theme') result[key] = value === 'muslimah' ? 'muslimah' : 'muslim';
    else if (key === 'mode') result[key] = value === 'light' ? 'light' : 'dark';
    else if (key === 'madhab') result[key] = value === 'hanafi' ? 'hanafi' : 'shafi';
    else if (key === 'timezone') result[key] = validTimeZone(value) ? value : fallback;
    else if (key === 'imsakOffset') result[key] = clamp(number(value, fallback), 0, 60);
    else if (typeof fallback === 'number') result[key] = number(value, fallback) >= 0 ? number(value, fallback) : fallback;
    else if (typeof fallback === 'string') result[key] = text(value, fallback, 200);
    else result[key] = fallback;
  }
  // Kunci tambahan (mis. dependents, wealth): hanya nilai sederhana yang diterima.
  for (const [key, value] of Object.entries(source)) {
    if (key in defaults || key === '__proto__') continue;
    if (typeof value === 'number' && Number.isFinite(value)) result[key] = value;
    else if (typeof value === 'string') result[key] = value.slice(0, 200);
    else if (typeof value === 'boolean') result[key] = value;
  }
  return result;
}

function sanitizeDay(raw) {
  const day = {
    prayers: booleanList(raw.prayers, 5),
    tasks: booleanMap(raw.tasks, INDEX_RE),
    pages: Math.max(0, number(raw.pages)),
    sadaqah: Math.max(0, number(raw.sadaqah)),
    water: booleanList(raw.water, 8),
    fast: raw.fast === true,
    mood: clamp(Math.round(number(raw.mood)), 0, 5),
    note: text(raw.note),
    dua: text(raw.dua, '', 2000),
  };
  if (raw.juz !== undefined) day.juz = clamp(number(raw.juz), 0, 30);
  return day;
}

export function dayHasActivity(day) {
  if (!isObject(day)) return false;
  return Boolean(
    day.prayers?.some(Boolean) || Object.values(day.tasks || {}).some(Boolean) || day.pages > 0 ||
    day.sadaqah > 0 || day.water?.some(Boolean) || day.fast || day.mood > 0 || day.note || day.dua,
  );
}

function sanitizeSnapshot(raw, defaults) {
  const drop = { count: 0 };
  const dropped = () => { drop.count += 1; };

  const days = {};
  for (const [key, value] of Object.entries(raw.days)) {
    if (isDate(key) && isObject(value)) days[key] = sanitizeDay(value);
    else dropped();
  }

  const fasting = {};
  for (const kind of Object.keys(defaults.fasting)) {
    const list = Array.isArray(raw.fasting?.[kind]) ? raw.fasting[kind] : [];
    fasting[kind] = unique(list.filter(isDate)).slice(0, 400);
    drop.count += list.length - fasting[kind].length;
  }

  const family = [];
  for (const item of (Array.isArray(raw.family) ? raw.family : []).slice(0, 200)) {
    if (isObject(item) && text(item.name).trim()) family.push({ name: text(item.name, '', 100), done: item.done === true });
    else dropped();
  }

  const kajian = [];
  for (const item of (Array.isArray(raw.kajian) ? raw.kajian : []).slice(0, 1000)) {
    if (isObject(item) && (text(item.title).trim() || text(item.note).trim())) {
      kajian.push({
        id: text(item.id, `k-${kajian.length}`, 40),
        title: text(item.title, '', 200),
        date: isDate(item.date) ? item.date : '',
        note: text(item.note, '', 5000),
      });
    } else dropped();
  }

  const infaq = [];
  for (const item of (Array.isArray(raw.infaq) ? raw.infaq : []).slice(0, 5000)) {
    if (isObject(item) && number(item.amount) > 0) {
      infaq.push({
        id: text(item.id, `i-${infaq.length}`, 40),
        amount: number(item.amount),
        date: isDate(item.date) ? item.date : '',
        purpose: text(item.purpose, '', 200),
      });
    } else dropped();
  }

  const duas = (Array.isArray(raw.duas) ? raw.duas : []).filter(item => typeof item === 'string' && item.trim()).map(item => item.slice(0, 500)).slice(0, 500);
  const indexes = list => unique((Array.isArray(list) ? list : []).filter(n => Number.isInteger(n) && n >= 0 && n < 100));

  const data = {
    schemaVersion: SCHEMA_VERSION,
    settings: sanitizeSettings(raw.settings, defaults.settings),
    days,
    fasting,
    prepDone: indexes(raw.prepDone),
    duas,
    family,
    kajian,
    infaq,
    card: {
      recipient: text(raw.card?.recipient, defaults.card.recipient, 200),
      sender: text(raw.card?.sender, defaults.card.sender, 200),
      message: text(raw.card?.message, defaults.card.message, 600),
    },
    zakatFitrahPaid: raw.zakatFitrahPaid === true,
    habits: booleanMap(raw.habits, HABIT_RE),
    iktikaf: raw.iktikaf === true,
    iktikafDays: indexes(raw.iktikafDays),
    createdAt: number(raw.createdAt) > 0 ? number(raw.createdAt) : defaults.createdAt,
    lastBackupAt: Math.max(0, number(raw.lastBackupAt)),
    backupSnoozeUntil: 0,
    updatedAt: Date.now(),
  };
  return { data, dropped: drop.count };
}

/**
 * Memeriksa dan membersihkan isi berkas cadangan.
 * Mengembalikan { ok: true, data, dropped, summary, exportedAt } atau { ok: false, reason }.
 * reason: 'too_big' | 'not_json' | 'not_backup' | 'newer'
 */
export function validateBackup(input, defaults) {
  let raw = input;
  if (typeof input === 'string') {
    if (input.length > MAX_BACKUP_BYTES) return { ok: false, reason: 'too_big' };
    try { raw = JSON.parse(input); } catch { return { ok: false, reason: 'not_json' }; }
  }
  if (!isObject(raw) || !isObject(raw.settings) || !isObject(raw.days)) return { ok: false, reason: 'not_backup' };
  if (number(raw.schemaVersion) > SCHEMA_VERSION) return { ok: false, reason: 'newer' };

  const { data, dropped } = sanitizeSnapshot(raw, defaults);
  const exported = typeof raw.exportedAt === 'string' ? Date.parse(raw.exportedAt) : NaN;
  return {
    ok: true,
    data,
    dropped,
    exportedAt: Number.isFinite(exported) ? exported : null,
    summary: {
      activeDays: Object.values(data.days).filter(dayHasActivity).length,
      infaq: data.infaq.length,
      kajian: data.kajian.length,
      duas: data.duas.length,
    },
  };
}

/**
 * Memilih data terbaru antara salinan localStorage (sinkron) dan IndexedDB (async).
 * - Data lama tanpa cap waktu: pertahankan localStorage (perilaku sebelum skema v2).
 * - Keduanya bercap waktu: yang terbaru menang; IndexedDB menang jika sama.
 */
export function pickNewer(local, localExists, remote) {
  if (!remote) return { source: 'local', value: local };
  if (!localExists) return { source: 'remote', value: remote };
  const localTime = number(local?.updatedAt);
  const remoteTime = number(remote?.updatedAt);
  if (!localTime) return { source: 'local', value: local };
  return remoteTime >= localTime ? { source: 'remote', value: remote } : { source: 'local', value: local };
}

/** Pengingat unduh cadangan: ada catatan, belum pernah/lama tidak dicadangkan, tidak sedang ditunda. */
export function backupReminderDue(db, now = Date.now()) {
  const activeDays = Object.values(db?.days || {}).filter(dayHasActivity).length;
  if (activeDays < MIN_ACTIVE_DAYS_FOR_REMINDER) return false;
  if (now < number(db?.backupSnoozeUntil)) return false;
  const base = number(db?.lastBackupAt) || number(db?.createdAt) || now;
  return now - base >= BACKUP_REMIND_DAYS * DAY_MS;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '–';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
