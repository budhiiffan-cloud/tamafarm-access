import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execFileSync } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Saat development, request ke /api dan /storage diteruskan ke Laravel,
// jadi tidak perlu mengatur CORS di backend selama dev.
const BACKEND = process.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [
    {
      name: 'tamafarm-activation',
      config(_config, { command }) {
        if (command === 'build') return
        const checker = fileURLToPath(new URL('../backend/check-website-access.php', import.meta.url))
        try {
          execFileSync('php', [checker], { cwd: dirname(checker), stdio: 'pipe' })
        } catch {
          throw new Error('Website belum diaktifkan. Isi WEBSITE_ACCESS_PASSWORD di backend/.env dengan password dari pemilik proyek. Pastikan PHP dan dependensi backend tersedia.')
        }
      },
    },
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': BACKEND,
      '/storage': BACKEND,
    },
  },
})
