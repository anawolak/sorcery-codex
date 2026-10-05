import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base + hash routing: works at any path, e.g. https://<user>.github.io/<repo>/
  base: './',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        id: './',
        name: 'Sorcery Codex',
        short_name: 'Codex',
        description: 'Offline Sorcery: Contested Realm cards, Codex, rulebook and FAQ.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f0e0c',
        theme_color: '#0f0e0c',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        // Card images are cached by the app's own downloader (src/offline.ts) with progress UI.
        globIgnores: ['cards/**', 'splash/**'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Take control on first install so the very first session already works offline.
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/cards/') && url.pathname.endsWith('.webp'),
            handler: 'CacheFirst',
            options: { cacheName: 'card-images' },
          },
          {
            urlPattern: ({ url }) => url.hostname.endsWith('cloudfront.net'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'printings',
              expiration: { maxEntries: 400 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/splash/'),
            handler: 'CacheFirst',
            options: { cacheName: 'splash' },
          },
        ],
      },
    }),
  ],
  server: { host: true },
});
