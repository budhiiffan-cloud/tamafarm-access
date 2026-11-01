import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Saat development, request ke /api dan /storage diteruskan ke Laravel,
// jadi tidak perlu mengatur CORS di backend selama dev.
const BACKEND = process.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': BACKEND,
      '/storage': BACKEND,
    },
  },
})
