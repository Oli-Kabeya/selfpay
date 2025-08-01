import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  base: '/',
  plugins: [
    react({
      jsxRuntime: 'automatic', // ✅ pour React 18
    }),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: ['logo.svg', 'icons/icon-192x192.png', 'icons/icon-512x512.png'],
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
    include: [
      'react',
      'react-dom',
      '@zxing/library',
      'lucide-react',     // ✅ ajouté pour éviter erreur build
    ],
  },
  cacheDir: '.vite_cache',
  build: {
    rollupOptions: {
      external: [],
      // Résout problème de modules ESM comme lucide-react
      output: {
        manualChunks: undefined, // évite erreurs de split inutile
      },
    },
    commonjsOptions: {
      include: [/node_modules/], // ✅ important pour modules CommonJS
    },
  },
});
