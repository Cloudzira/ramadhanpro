import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  publicDir: 'public',
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    manifestFilename: 'manifest.webmanifest',
    includeAssets: ['icon.svg'],
    manifest: {
      name: 'RamadhanPro — Pendamping Ibadah',
      short_name: 'RamadhanPro',
      description: 'Pendamping ibadah privat dari persiapan Ramadhan hingga istiqamah setelah Syawal.',
      lang: 'id',
      start_url: './',
      scope: './',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#151d1b',
      theme_color: '#151d1b',
      icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
    },
    workbox: {
      globPatterns: ['**/*.{html,js,css,svg,json,webmanifest,woff2}'],
      navigateFallback: 'index.html',
    },
    devOptions: { enabled: true, type: 'module' },
  })],
});
