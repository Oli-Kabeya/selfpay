import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  base: '/',
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: [
        'favicon.ico',
        'robots.txt',
        'logo.svg',
        'icons/icon-192x192.png',
        'icons/icon-512x512.png',
        'icons/logos-pwa.png', // ✅ ton logo ajouté ici
      ],
      manifest: {
        name: 'SelfPay',
        short_name: 'SelfPay',
        description: 'Scan & Pay dans les supermarchés partenaires.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/logo.svg', sizes: '120x120', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: '/icons/logos-pwa.png', sizes: '256x256', type: 'image/png', purpose: 'any' }, // ✅ ajouté dans icons aussi
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-data',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/selfpay-olivier\.web\.app\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'selfpay-static',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@zxing/library', 'lucide-react'],
  },
  cacheDir: '.vite_cache',
  build: {
    rollupOptions: {
      output: { manualChunks: undefined },
    },
    commonjsOptions: { include: [/node_modules/] },
  },
});
