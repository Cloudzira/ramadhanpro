// Logika murni pemasangan aplikasi (PWA), tanpa DOM, agar mudah diuji.
//
// Cara kerja: di Chrome/Edge/Samsung Internet (Android dan desktop) browser memberi event
// `beforeinstallprompt`. Event itu disimpan, lalu tombol "Pasang" memanggil `prompt()` sehingga
// jendela pemasangan resmi browser langsung muncul. iPhone/iPad (Safari) tidak menyediakan
// pemasangan lewat kode, jadi di sana hanya bisa menampilkan petunjuk singkat.

/** Mode tombol: 'installed' | 'prompt' | 'ios' | 'wait'. */
export function installMode({ hasPrompt = false, standalone = false, ios = false } = {}) {
  if (standalone) return 'installed';
  if (hasPrompt) return 'prompt';
  if (ios) return 'ios';
  return 'wait';
}

export function isIos(userAgent = '', platform = '', maxTouchPoints = 0) {
  // iPadOS 13+ mengaku sebagai Mac; bedakan lewat layar sentuh.
  return /iphone|ipad|ipod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
}

export function isStandalone(win) {
  try {
    const modes = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'];
    return modes.some(mode => win.matchMedia?.(`(display-mode: ${mode})`).matches) || win.navigator?.standalone === true;
  } catch {
    return false;
  }
}

/** Pesan singkat untuk setiap mode (dipakai saat tombol ditekan tanpa jendela pemasangan). */
export function installMessage(mode) {
  switch (mode) {
    case 'installed': return 'RamadhanPro sudah terpasang di perangkat ini.';
    case 'ios': return 'Di iPhone/iPad: ketuk ikon Bagikan, lalu pilih “Tambah ke Layar Utama”.';
    default: return 'Pemasangan belum siap. Tunggu sebentar lalu coba lagi, atau buka lewat Chrome/Edge.';
  }
}
