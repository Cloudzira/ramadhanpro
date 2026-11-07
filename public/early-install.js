/* Simpan event pemasangan sedini mungkin, sebelum aplikasi selesai dimuat.
   Berkas terpisah (bukan skrip inline) agar Content-Security-Policy bisa melarang skrip inline. */
window.addEventListener('beforeinstallprompt', function (event) { event.preventDefault(); window.__installEvent = event; });
