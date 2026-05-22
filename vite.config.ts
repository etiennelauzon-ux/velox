import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';
import { resolve } from 'path';

const gitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim() || 'dev';
  } catch {
    return 'dev';
  }
})();

export default defineConfig({
  base: process.env.GITHUB_PAGES_BASE_PATH || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'VELOX',
        short_name: 'VELOX',
        description: 'Indoor cycling simulator',
        theme_color: '#0a0c10',
        background_color: '#0a0c10',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/velox-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/velox-icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /\/routes\/.+\.gpx$/,
            handler: 'CacheFirst',
            options: { cacheName: 'gpx-routes' },
          },
        ],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'simple-peer': resolve(__dirname, './node_modules/simple-peer/simplepeer.min.js'),
    },
  },
  define: {
    global: 'globalThis',
    __GIT_HASH__: JSON.stringify(gitHash),
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          'vendor-leaflet': ['leaflet'],
          'vendor-react': ['react', 'react-dom'],
          'vendor-socket': ['socket.io-client', 'simple-peer'],
          'vendor-misc': ['zustand', 'localforage'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': 'http://localhost:4000',
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
});
