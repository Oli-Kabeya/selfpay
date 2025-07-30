import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true, // ✅ Active le service worker en développement
      },
      includeAssets: [
        'logo.svg',
        'icons/icon-192x192.png',
        'icons/icon-512x512.png',
      ], // ✅ Assure-toi que ces fichiers sont bien dans /public/icons/
      manifest: {
        name: 'SelfPay',
        short_name: 'SelfPay',
        description: 'Scan & Pay dans les supermarchés partenaires.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/logo.svg',
            sizes: '120x120',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
});
