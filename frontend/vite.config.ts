import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,      // usamos 3002 para que no choque con nada
    host: true,      // accesible desde la red local / Docker
    allowedHosts: true, // permite que ngrok acceda

    // 🔁 Proxy: todo lo que empiece con /api va al backend en :8000
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // /api/x -> /x
      },
    },
  },
})
