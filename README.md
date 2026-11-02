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
| `index.html` | Antarmuka dan logika aplikasi (satu router event di bagian "EVENT ROUTER") |
| `src/styles.css` | Seluruh gaya, berlapis dari 1 sampai 6; lapisan akhir menimpa lapisan awal |
| `src/prayer.js` | Perhitungan jadwal salat dan arah kiblat (Adhan JS), preset Kemenag RI, koreksi manual |
| `src/hijri.js` | Tanggal Hijriah perkiraan (Umm al-Qura) dan perkiraan awal Ramadhan |
| `src/reminders.js` | Logika pengingat waktu salat (siapa yang jatuh tempo, tanpa duplikat) |
| `src/storage.js` | Penyimpanan IndexedDB, permintaan perlindungan penyimpanan, status ruang |
| `src/backup.js` | Skema data, validasi berkas cadangan, pemilihan data terbaru, pengingat cadangan |
| `src/dom-patch.js` | Pembaruan tampilan per bagian (ketikan dan fokus tidak hilang) |
| `tests/` | Tes otomatis (`npm test`) |
| `vite.config.js` | **Satu-satunya** konfigurasi PWA: manifest dan service worker dibuat otomatis saat build |
| `public/` | Ikon aplikasi |
| `docs/` | Contoh tampilan (tidak ikut di-build) |

Jangan menambahkan `sw.js` atau `manifest.json` manual di root; keduanya dihasilkan oleh `vite-plugin-pwa`.

## Tampilan dan aksesibilitas

- Tema **Muslim** dan **Muslimah** punya palet aurora, pola latar (garis vs titik), dan aksen berbeda. Setiap tema punya mode gelap dan terang, serta warna per fase (Persiapan, Ramadhan, 10 malam terakhir, Idulfitri, Syawal).
- Kontras teks dijaga **WCAG AA (≥ 4,5:1)** untuk 20 kombinasi tema × mode × fase, termasuk saat latar aurora paling terang menembus panel kaca. Ini diperiksa otomatis oleh `tests/theme-contrast.test.mjs`. Jika Anda mengubah warna di `src/styles.css` dan tes gagal, pesan error menyebut warna dan rasio kontrasnya.
- Peramban tanpa `backdrop-filter`, atau pengguna yang memilih "kurangi transparansi", mendapat permukaan solid. Mode kontras tinggi, warna paksa, dan "kurangi gerakan" juga didukung.
- Warna bilah status browser (`theme-color`) mengikuti tema dan mode.

## Menambah interaksi baru

Semua klik tombol diproses oleh `CLICK_ACTIONS` di `index.html`. Untuk tombol baru, beri atribut `data-action="nama-aksi"` lalu tambahkan satu entri `nama-aksi(tombol){ ... }` di objek tersebut. Perubahan input dan kolom diproses oleh `onChange` dan `onInput`.

## Pintasan aplikasi

Saat dipasang, aplikasi menyediakan pintasan "Mutabaah Harian" dan "Kalender Ramadhan". Halaman juga dapat dibuka langsung dengan `?view=daily`, `?view=calendar`, `?view=plan`, `?view=report`, atau `?view=settings`.

## Jadwal salat

Izinkan lokasi perangkat atau pilih kota/isi lintang dan bujur sendiri. RamadhanPro menghitung jadwal di browser dengan pustaka open-source Adhan JS. Tidak ada koordinat yang dikirim ke API.

- **Kemenag RI** (disarankan untuk Indonesia): Subuh 20°, Isya 18°, ihtiyath +2 menit (Terbit dikurangi 2 menit).
- Metode lain tersedia, termasuk Singapura/Adhan, Karachi (18°/18°), dan Umm al-Qura.
- **Koreksi manual per waktu** (−30 sampai +30 menit) ditambahkan di atas metode yang dipilih, berguna bila jadwal masjid setempat berbeda beberapa menit.

Periksa hasil dengan jadwal masjid atau Kementerian Agama setempat, karena metode dan koreksi lokal dapat berbeda.

## Tanggal Hijriah

Tanggal Hijriah di header memakai kalender Umm al-Qura bawaan browser sebagai **perkiraan**, dengan koreksi ±2 hari. Awal Ramadhan dan Syawal di Indonesia mengikuti sidang isbat Kemenag atau ketetapan ormas, jadi tombol "Isi perkiraan awal Ramadhan" hanya mengisi tanggal sementara; perbarui setelah penetapan resmi.

## Pengingat waktu salat

Pengingat memakai Notification API dan hanya berbunyi **selama aplikasi terbuka atau berjalan di latar belakang**. Browser dapat menghentikannya saat layar terkunci atau baterai dihemat, dan aplikasi web tidak bisa menggantikan adzan. Untuk jadwal yang andal, tetap gunakan alarm perangkat atau aplikasi adzan.

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
