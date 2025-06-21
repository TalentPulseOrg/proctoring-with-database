import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    },
    cors: true,
    hmr: {
      overlay: true,
    },
  },
  define: {
    // Make sure environment variables are properly defined
    __APP_ENV__: JSON.stringify(process.env.NODE_ENV || 'development'),
    global: 'window'
  },
})
