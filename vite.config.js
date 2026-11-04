import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolveSiteUrl, siteMetaTags } from './config/site-url.js';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Satu-satunya sumber konfigurasi PWA (manifest + service worker).
// Jangan menambah sw.js / manifest.json manual di root: keduanya dibuat otomatis saat build.
export default defineConfig({
  base: './',
  publicDir: 'public',
  // Nomor versi di popup Tentang selalu mengikuti package.json.
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    // Menambahkan og:url, og:image, dan canonical bila alamat situs diketahui (lihat config/site-url.js).
    {
      name: 'ramadhanpro-site-meta',
      transformIndexHtml: () => siteMetaTags(resolveSiteUrl(process.env)),
    },
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.webmanifest',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'RamadhanPro — Pendamping Ibadah',
        short_name: 'RamadhanPro',
        description: 'Pendamping ibadah privat dari persiapan Ramadhan hingga istiqamah setelah Syawal.',
        lang: 'id',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        // Tanpa "orientation": aplikasi boleh dipakai di tablet dan desktop (tata letak sidebar).
        background_color: '#d3c8f5',
        theme_color: '#6a55cf',
        categories: ['lifestyle', 'productivity', 'education'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
        shortcuts: [
          {
            name: 'Mutabaah Harian',
            short_name: 'Mutabaah',
            description: 'Catat ibadah hari ini',
            url: './?view=daily',
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Kalender Ramadhan',
            short_name: 'Kalender',
            description: 'Lihat kalender dan jadwal salat',
            url: './?view=calendar',
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // woff2 ikut di-cache, jadi font tampil sempurna saat offline.
        globPatterns: ['**/*.{html,js,css,svg,png,json,webmanifest,woff2}'],
        // Gambar pratinjau hanya untuk crawler (WhatsApp, X, dll.), tidak perlu diunduh pengguna.
        globIgnores: ['og-image.png'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      // Service worker mode dev dimatikan agar tidak menyisakan cache lama saat pengembangan.
      devOptions: { enabled: false },
    }),
  ],
});
