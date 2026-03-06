import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/Frontend-Final/',
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
  },
  plugins: [react()],
})
