// Deteksi pembaruan aplikasi (service worker). Tanpa dependensi, mudah diuji.
// Alur: versi baru diunduh diam-diam di latar belakang → berstatus "waiting" → aplikasi
// menampilkan banner → pengguna memilih "Perbarui" → worker baru diaktifkan → halaman dimuat ulang.

export const UPDATE_CHECK_MS = 60 * 60 * 1000;

/**
 * Mendaftarkan service worker dan memanggil onUpdate(worker) saat versi baru siap dipakai.
 * Banner tidak muncul pada pemasangan pertama (belum ada worker yang mengendalikan halaman).
 */
export async function watchForUpdates({ serviceWorker, swUrl, scope, onUpdate, doc = globalThis.document, timers = globalThis, intervalMs = UPDATE_CHECK_MS }) {
  if (!serviceWorker) return null;
  const registration = await serviceWorker.register(swUrl, { scope });
  const announced = new Set();
  const announce = worker => {
    if (!worker || announced.has(worker) || !serviceWorker.controller) return;
    announced.add(worker);
    onUpdate(worker);
  };
  announce(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => { if (worker.state === 'installed') announce(worker); });
  });
  const check = () => { try { Promise.resolve(registration.update()).catch(() => {}); } catch { /* offline: abaikan */ } };
  check();
  doc?.addEventListener?.('visibilitychange', () => { if (doc.visibilityState === 'visible') check(); });
  timers.setInterval(check, intervalMs);
  return registration;
}

/** Mengaktifkan worker baru lalu memuat ulang halaman sekali saja. */
export function applyUpdate({ worker, serviceWorker, reload, timers = globalThis, fallbackMs = 3000 }) {
  let done = false;
  const go = () => { if (done) return; done = true; reload(); };
  serviceWorker.addEventListener('controllerchange', go);
  worker.postMessage({ type: 'SKIP_WAITING' });
  timers.setTimeout(go, fallbackMs);
}
