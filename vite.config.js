import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion')) {
            return 'vendor-motion'
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase'
          }
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'vendor-map'
          }
        },
      },
    },
    target: 'es2020',
    cssCodeSplit: true,
  },
})
