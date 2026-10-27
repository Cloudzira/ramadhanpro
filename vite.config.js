import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  publicDir: 'public',
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    manifestFilename: 'manifest.webmanifest',
    includeAssets: ['icon.svg', 'apple-touch-icon.png'],
    manifest: {
      name: 'RamadhanPro — Pendamping Ibadah',
      short_name: 'RamadhanPro',
      description: 'Pendamping ibadah privat dari persiapan Ramadhan hingga istiqamah setelah Syawal.',
      lang: 'id',
      start_url: './',
      scope: './',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#070b14',
      theme_color: '#070b14',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{html,js,css,svg,png,json,webmanifest,woff2}'],
      navigateFallback: 'index.html',
      runtimeCaching: [{
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts',
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      }],
    },
    devOptions: { enabled: true, type: 'module' },
  })],
});
