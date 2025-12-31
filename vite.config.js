import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 9222
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor-ui': ['lucide-react', 'qrcode.react', 'react-hot-toast', 'framer-motion'],
          'vendor-charts': ['recharts'],
          'vendor-calendar': ['react-day-picker', 'date-fns'],
          'vendor-editor': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-code-block-lowlight'],
          'vendor-dnd': ['react-dnd', 'react-dnd-html5-backend', 'react-dnd-touch-backend', 'react-dnd-multi-backend'],
          'vendor-utils': ['uuid', 'clsx', 'tailwind-merge'],
        }
      }
    }
  }
})
