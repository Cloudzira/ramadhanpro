# RamadhanPro

PWA pendamping ibadah yang berjalan tanpa backend. Jurnal tetap di perangkat; jadwal salat dihitung lokal dengan Adhan JS.

## Menjalankan

```sh
npm install
npm run dev
```

Untuk mengecek hasil produksi:

```sh
npm run build
npm run preview
```

Folder `dist/` dapat di-host sebagai situs statis, misalnya Cloudflare Pages atau GitHub Pages. Gunakan build command `npm run build` dan output directory `dist`. Paket, build, dan hosting dapat dimulai dengan layanan gratis; kuota serta ketentuan penyedia dapat berubah.

## Jadwal salat

Izinkan lokasi perangkat atau isi lintang dan bujur sendiri. RamadhanPro menghitung jadwal di browser menggunakan pustaka open-source Adhan JS, metode yang dipilih, mazhab untuk Ashar, zona waktu, dan offset Imsak. Tidak ada koordinat yang dikirim ke API. Periksa hasil dengan jadwal masjid atau otoritas agama setempat karena metode dan koreksi lokal dapat berbeda.

Kalender 30 hari mengikuti tanggal awal Ramadhan yang diatur pengguna. Tanggal awal dan konversi kalender tidak menetapkan rukyat resmi.

## Data & cadangan

Data lama di `localStorage` dimigrasikan ke IndexedDB pada perangkat yang mendukungnya. `localStorage` dipertahankan sebagai fallback. Ekspor cadangan sebelum menghapus data browser atau berpindah perangkat. Tidak ada akun, sinkronisasi cloud, analytics, atau backend.
