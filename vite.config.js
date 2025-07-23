import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg'], // Assure-toi que logo.svg est dans /public
      manifest: {
        name: 'SelfPay',
        short_name: 'SelfPay',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: '/logo.svg',
            sizes: '120x120',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
});
