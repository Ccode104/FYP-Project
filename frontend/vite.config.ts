import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['simple-peer', 'buffer', 'events', 'util', 'stream-browserify'],
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      events: 'events',
      stream: 'stream-browserify',
      util: 'util',
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
})
