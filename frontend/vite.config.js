import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      jspdf: path.resolve(__dirname, 'node_modules/jspdf/dist/jspdf.umd.min.js'),
      'jspdf-autotable': path.resolve(__dirname, 'node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js'),
    },
  },
  build: {
    rolldownOptions: {
      external: ['canvg', 'html2canvas', 'dompurify'],
    },
  },
})
