const DATABASE_NAME = 'ramadhanpro-local';
const DATABASE_VERSION = 1;
const SNAPSHOT_STORE = 'snapshots';

let opening;

function openDatabase() {
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('IndexedDB tidak tersedia.'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SNAPSHOT_STORE)) {
        database.createObjectStore(SNAPSHOT_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      // Jika tab lain meminta pembaruan skema, tutup koneksi agar tidak menghalangi.
      database.onversionchange = () => { database.close(); opening = null; };
      resolve(database);
    };
    request.onerror = () => {
      opening = null;
      reject(request.error || new Error('Gagal membuka penyimpanan lokal.'));
    };
  });
  return opening;
}

/** Membaca catatan tersimpan: { key, value, updatedAt } atau null. */
export async function readSnapshot(key) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(SNAPSHOT_STORE, 'readonly').objectStore(SNAPSHOT_STORE).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSnapshot(key, value) {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(SNAPSHOT_STORE, 'readwrite');
    transaction.objectStore(SNAPSHOT_STORE).put({ key, value, updatedAt: Date.now() });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('Gagal menyimpan data lokal.'));
    transaction.onabort = () => reject(transaction.error || new Error('Penyimpanan lokal dibatalkan.'));
  });
}

/**
 * Meminta browser agar tidak menghapus data situs ini secara otomatis saat
 * penyimpanan perangkat menipis. Mengembalikan true/false, atau null jika tidak didukung.
 */
export async function requestPersistence() {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

/** Status penyimpanan: { persisted: boolean|null, usage: number|null, quota: number|null } */
export async function storageStatus() {
  const status = { persisted: null, usage: null, quota: null };
  try {
    if (navigator.storage?.persisted) status.persisted = await navigator.storage.persisted();
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      status.usage = estimate.usage ?? null;
      status.quota = estimate.quota ?? null;
    }
  } catch { /* biarkan null */ }
  return status;
}
