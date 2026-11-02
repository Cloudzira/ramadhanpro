# RamadhanPro

PWA pendamping ibadah yang berjalan tanpa backend. Jurnal tetap di perangkat; jadwal salat dihitung lokal dengan Adhan JS. Font dipasang lokal, sehingga aplikasi tidak memanggil layanan pihak ketiga dan tetap tampil sempurna saat offline.

## Menjalankan

Butuh Node.js 20.19 atau lebih baru.

```sh
npm install
npm run dev
```

Untuk mengecek hasil produksi:

```sh
npm run build
npm run preview
```

Folder `dist/` dapat di-host sebagai situs statis, misalnya Cloudflare Pages, Vercel, atau GitHub Pages. Gunakan build command `npm run build` dan output directory `dist`. Paket, build, dan hosting dapat dimulai dengan layanan gratis; kuota serta ketentuan penyedia dapat berubah.

## Struktur proyek

| Berkas | Fungsi |
| --- | --- |
| `index.html` | Antarmuka, gaya, dan logika aplikasi (satu router event di bagian "EVENT ROUTER") |
| `src/prayer.js` | Perhitungan jadwal salat dan arah kiblat (Adhan JS) |
| `src/storage.js` | Penyimpanan IndexedDB, permintaan perlindungan penyimpanan, status ruang |
| `src/backup.js` | Skema data, validasi berkas cadangan, pemilihan data terbaru, pengingat cadangan |
| `src/dom-patch.js` | Pembaruan tampilan per bagian (ketikan dan fokus tidak hilang) |
| `tests/` | Tes otomatis (`npm test`) |
| `vite.config.js` | **Satu-satunya** konfigurasi PWA: manifest dan service worker dibuat otomatis saat build |
| `public/` | Ikon aplikasi |
| `docs/` | Contoh tampilan (tidak ikut di-build) |

Jangan menambahkan `sw.js` atau `manifest.json` manual di root; keduanya dihasilkan oleh `vite-plugin-pwa`.

## Menambah interaksi baru

Semua klik tombol diproses oleh `CLICK_ACTIONS` di `index.html`. Untuk tombol baru, beri atribut `data-action="nama-aksi"` lalu tambahkan satu entri `nama-aksi(tombol){ ... }` di objek tersebut. Perubahan input dan kolom diproses oleh `onChange` dan `onInput`.

## Pintasan aplikasi

Saat dipasang, aplikasi menyediakan pintasan "Mutabaah Harian" dan "Kalender Ramadhan". Halaman juga dapat dibuka langsung dengan `?view=daily`, `?view=calendar`, `?view=plan`, `?view=report`, atau `?view=settings`.

## Jadwal salat

Izinkan lokasi perangkat atau isi lintang dan bujur sendiri. RamadhanPro menghitung jadwal di browser menggunakan pustaka open-source Adhan JS, metode yang dipilih, mazhab untuk Ashar, zona waktu, dan offset Imsak. Tidak ada koordinat yang dikirim ke API. Periksa hasil dengan jadwal masjid atau otoritas agama setempat karena metode dan koreksi lokal dapat berbeda.

Kalender 30 hari mengikuti tanggal awal Ramadhan yang diatur pengguna. Tanggal awal dan konversi kalender tidak menetapkan rukyat resmi.

## Data & cadangan

- **Sumber utama** data adalah IndexedDB. `localStorage` menjadi cermin untuk tampilan pertama dan cadangan. Jika keduanya ada, yang bercap waktu (`updatedAt`) terbaru dipakai.
- **Skema data** bernomor (`schemaVersion`). Data lama otomatis dimigrasikan; cadangan dari versi yang lebih baru ditolak dengan pesan jelas.
- **Impor cadangan** divalidasi: tipe data diperiksa dan dibersihkan, entri tidak valid diabaikan, dan pengguna melihat ringkasan isi sebelum memulihkan.
- **Perlindungan penyimpanan**: aplikasi meminta browser (`navigator.storage.persist()`) agar tidak menghapus data saat memori menipis. Statusnya tampil di Pengaturan.
- **Pengingat cadangan** muncul di beranda jika ada catatan tetapi cadangan terakhir lebih dari 14 hari (dapat ditunda 3 hari).
- Ekspor cadangan sebelum menghapus data browser atau berpindah perangkat. Tidak ada akun, sinkronisasi cloud, analytics, atau backend.

## Tes

```sh
npm test
```

Tes memakai `node:test` bawaan Node (tanpa paket tambahan) dan dijalankan otomatis sebelum build di GitHub Actions.
