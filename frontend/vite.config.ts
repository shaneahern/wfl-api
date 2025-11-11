import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Ensure base path is root
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    hmr: {
      overlay: true,
    },
    proxy: {
      '/wfl': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // Don't follow redirects - let frontend handle them
        followRedirects: false,
      },
      '/streets': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Note: /admin routes are handled by React Router, not proxied to backend
    },
  },
})
