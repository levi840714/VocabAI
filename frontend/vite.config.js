import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url' 

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    // 可選：明確列出可解析副檔名
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  }
})
