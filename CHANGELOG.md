# Catatan perubahan

## 1.3.0 — Pengemasan
- Skrip inline dipindah ke `src/app.js`; konten doa, kutipan, dan kota ke `src/data/` agar mudah diperiksa.
- Gambar pratinjau `og-image.png` dan tag Open Graph otomatis (alamat situs dibaca dari lingkungan build).
- `vercel.json`: header keamanan dan cache.
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
