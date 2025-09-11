import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        admin: resolve('./src/admin.tsx'),
      },
      output: {
        format: 'iife',
        name: 'CF7DB',
        entryFileNames: 'js/leadsync-[name].js',
        chunkFileNames: 'js/leadsync-[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.names && assetInfo.names[0] && assetInfo.names[0].endsWith('.css')) {
            return 'css/leadsync-admin.css'
          }
          return 'assets/[name].[ext]'
        }
      }
    },
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    target: 'es2015',
    cssCodeSplit: false
  },
  resolve: {
    alias: {
      '@': resolve('./src'),
    },
  },
  server: {
    port: 3000,
    open: true
  }
})
