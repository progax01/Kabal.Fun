// 2. In your vite.config.js:
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [react(), nodePolyfills({
    include: ['buffer', 'process']
  })],
  define: {
    'global': 'globalThis',
  },
  resolve: {
    alias: {
      process: "process/browser",
      stream: "stream-browserify",
      buffer: "buffer"
    }
  },
  server: {
    allowedHosts: ['9a88-103-46-200-68.ngrok-free.app']
  }
});
