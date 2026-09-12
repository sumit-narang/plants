import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/plants/',
  plugins: [react()],
  server: {
    port: 5174,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/plants-api': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/plants-api/, '/api'),
      }
    }
  }
})
