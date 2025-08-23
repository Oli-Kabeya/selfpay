import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';

const produitImagesDir = path.resolve(__dirname, 'public/icons'); // dossier où sont toutes les images des produits
let produitImages = [];
try {
  produitImages = fs.readdirSync(produitImagesDir).map(img => `icons/${img}`);
} catch (e) {
  console.warn('Impossible de lire les images produits, assurez-vous que public/icons existe.');
}

export default defineConfig({
  base: '/',
  plugins: [
    react({ jsxRuntime: 'automatic' }),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false }, // ⚠️ Désactive le SW en dev
      includeAssets: [
        'favicon.ico',
        'robots.txt',
        'logo.svg',
        'icons/icon-192x192.png',
        'icons/icon-512x512.png',
        'icons/logos-pwa.png',
        ...produitImages, // Pré-cache toutes les images produits sans codes
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
          { src: '/icons/logos-pwa.png', sizes: '256x256', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        runtimeCaching: [
          // Google Fonts
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

          // Firestore → toujours NetworkOnly
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },

          // Firebase Storage
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },

          // Firebase Auth iframe → toujours NetworkOnly
          {
            urlPattern: /^https:\/\/selfpay-olivier\.firebaseapp\.com\/.*/i,
            handler: 'NetworkOnly',
          },

          // Netlify & autres static assets
          {
            urlPattern: /^https:\/\/selfpay-pwa\.netlify\.app\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'netlify-static-assets',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
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
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  optimizeDeps: { include: ['react', 'react-dom', '@zxing/library', 'lucide-react'] },
  cacheDir: '.vite_cache',
  build: {
    rollupOptions: { output: { manualChunks: undefined } },
    commonjsOptions: { include: [/node_modules/] },
  },
});
