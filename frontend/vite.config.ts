import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['simple-peer', 'buffer', 'events', 'util', 'stream-browserify', 'readable-stream'],
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      events: 'events',
      stream: 'stream-browserify',
      util: 'util',
      'readable-stream': 'readable-stream',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion'],
          'vendor-buffer': ['buffer', 'events', 'util', 'stream-browserify', 'readable-stream'],
          'vendor-http': ['axios'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
