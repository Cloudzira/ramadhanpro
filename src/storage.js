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
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Gagal membuka penyimpanan lokal.'));
  });
  return opening;
}

export async function loadSnapshot(key, legacySnapshot) {
  try {
    const database = await openDatabase();
    const saved = await new Promise((resolve, reject) => {
      const request = database.transaction(SNAPSHOT_STORE, 'readonly').objectStore(SNAPSHOT_STORE).get(key);
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
    if (saved) return saved;
    await saveSnapshot(key, legacySnapshot);
    return legacySnapshot;
  } catch {
    return legacySnapshot;
  }
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
