import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // Evita CORS em desenvolvimento: /api/n8n/* → https://n8n.srv1291896.hstgr.cloud/*
      '/api/n8n': {
        target: 'https://n8n.srv1291896.hstgr.cloud',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/n8n/, ''),
      },
    },
  },
})
