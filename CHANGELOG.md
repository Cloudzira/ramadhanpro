# Catatan perubahan

## 1.5.0 — Tema Lavender (mengikuti desain contoh)
- Tampilan baru: latar lavender, sidebar ungu melayang dengan avatar inisial + sapaan, area utama krem membulat, header dengan judul halaman, kolom cari, dan tombol bulat ungu.
- Beranda: banner hero (ilustrasi + sapaan sesuai jam + tombol), empat kartu statistik pastel (skor hari ini, hari konsisten, shalat tercatat, halaman Qur’an) lengkap dengan sparkline 7 hari dari data nyata.
- HP: bilah navigasi melayang berbentuk pil ungu dengan item aktif putih dan tombol “+” untuk langsung mencatat mutabaah.
- Kolom cari di header mengarahkan ke fitur yang cocok (mis. “zakat”, “kalender”, “tema”).
- Tema Muslim = lavender violet, Muslimah = orchid/rose; mode Gelap tetap tersedia dengan palet ungu tua. Tampilan bawaan kini **Terang**; pengguna lama dialihkan ke Terang satu kali (bisa diganti lagi di Akun → Tema).
- Efek kaca/aurora lama dihapus; semua warna kini berasal dari token di `src/styles.css` bagian 4.
- Kalender kini berupa kalender bulanan penuh yang mengikuti tanggal hari ini: bisa pindah bulan, tombol “Hari ini”, tanggal Hijriah di tiap kotak, dan 30 hari Ramadhan ditandai.
- Format tanggal di seluruh aplikasi: tanggal/bulan/tahun (contoh 20/2/2027), termasuk kolom isian tanggal (ketik langsung atau pilih lewat ikon kalender; tidak lagi bergantung bahasa browser).
- Urutan menu: Beranda, Rencana, Kalender, Mutabaah, Rapor, Akun.
- `tests/theme-contrast.test.mjs` ditulis ulang untuk desain baru (4 kombinasi tema × mode, WCAG AA).

## 1.4.3 — Perbaikan build Cloudflare Pages
- `package-lock.json` kini memuat `@fontsource/inter` dan `@fontsource/sora` (5.3.0). Sebelumnya lock tidak sinkron sehingga `npm clean-install` di Cloudflare gagal (`Missing: @fontsource/inter@5.3.0 from lock file`) dan situs terus menampilkan deploy lama.
- Tes baru memastikan `package-lock.json` selalu sinkron dengan `package.json`.
- README: pengaturan Cloudflare Pages disederhanakan; cara darurat `SKIP_DEPENDENCY_INSTALL` dipindah ke bagian pemecahan masalah.

## 1.4.2 — Tes lebih tahan terhadap kondisi repo
- Pemeriksaan "file lama sudah dihapus", `vercel.json`, dan `.node-version` kini hanya **peringatan**, bukan kegagalan. Mengunggah ke GitHub tidak menghapus file lama, dan file berawalan titik sering terlewat.
- `npm test` memakai reporter `spec`: log CI menampilkan nama tes yang gagal dengan jelas (✖).

## 1.4.1 — Penyesuaian Cloudflare Pages
- `vercel.json` diganti `public/_headers` (format header Cloudflare Pages).
- `.node-version` (22) agar build memakai Node yang cocok dengan Vite 7.
- README: panduan pengaturan build Cloudflare Pages, termasuk `SKIP_DEPENDENCY_INSTALL` untuk mengatasi `npm clean-install` yang gagal saat `package-lock.json` tidak sinkron.

## 1.4.0 — Pemasangan langsung dan tanggal Hijriah
- Tombol **Pasang** kini langsung memunculkan jendela pemasangan resmi browser (Chrome/Edge/Samsung Internet), bukan petunjuk. Tombol menonjol saat pemasangan siap, tersembunyi setelah aplikasi terpasang, dan ada juga di popup Panduan. Di iPhone/iPad, Safari memang tidak menyediakan pemasangan lewat kode, jadi hanya muncul petunjuk singkat.
- Event pemasangan ditangkap sedini mungkin (skrip kecil di `<head>`) agar tidak terlewat sebelum aplikasi selesai dimuat.
- Tanggal Hijriah tampil **di atas** tanggal Masehi pada header.
- Tes baru untuk logika pemasangan dan urutan tanggal.

## 1.3.0 — Pengemasan
- Skrip inline dipindah ke `src/app.js`; konten doa, kutipan, dan kota ke `src/data/` agar mudah diperiksa.
- Gambar pratinjau `og-image.png` dan tag Open Graph otomatis (alamat situs dibaca dari lingkungan build).
- Header keamanan dan cache (sekarang lewat `public/_headers`).
- Tes kesiapan build dan tes "tombol tanpa penangan".
- `.editorconfig`, CHANGELOG.

## 1.2.0 — Tampilan dan aksesibilitas
- Gaya dipindah ke `src/styles.css` (urutan lapisan tidak berubah).
- Aksen mode terang digelapkan: sebelumnya kontras hanya 1,6:1 (muslim) dan 2,1:1 (muslimah) pada fase Persiapan/Syawal.
- Fallback tanpa `backdrop-filter`, dukungan kontras tinggi, warna paksa, "kurangi transparansi"; efek hover tidak menempel di layar sentuh; blur lebih ringan di HP.
- Tes kontras WCAG AA untuk 20 kombinasi tema × mode × fase.

## 1.1.x — Akurasi ibadah, data, dan fondasi
- Preset Kemenag RI (Subuh 20°, Isya 18°, ihtiyath +2 menit) dan koreksi manual per waktu.
- Tanggal Hijriah (Umm al-Qura) dengan koreksi ±2 hari dan perkiraan awal Ramadhan.
- Pengingat waktu salat yang benar-benar bekerja (selama aplikasi terbuka) dengan penjelasan jujur.
- IndexedDB sebagai sumber utama, skema data bernomor, validasi impor cadangan, perlindungan penyimpanan, pengingat cadangan.
- Tampilan diperbarui per bagian: ketikan, fokus, dan posisi gulir tidak hilang.
- PWA dirapikan (satu konfigurasi), router event tunggal, font dipasang lokal (offline, tanpa Google Fonts).
- Perbaikan: tombol "location" yang memanggil fungsi tidak ada; penyimpanan lokal rusak yang bisa menimpa data sehat.
