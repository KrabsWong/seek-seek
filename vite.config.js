import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import fs from 'fs-extra'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'copy-files',
      async writeBundle() {
        // 复制manifest.json
        await fs.copy(resolve(__dirname, 'manifest.json'), resolve(__dirname, 'dist/manifest.json'))
        // 复制_locales目录
        await fs.copy(resolve(__dirname, '_locales'), resolve(__dirname, 'dist/_locales'))
        // 复制styles.css
        await fs.copy(resolve(__dirname, 'src/styles.css'), resolve(__dirname, 'dist/styles.css'))
        // 复制popup.html
        await fs.copy(resolve(__dirname, 'popup.html'), resolve(__dirname, 'dist/popup.html'))
      }
    }
  ],
  base: '',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      vue: 'vue/dist/vue.esm-bundler.js'
    }
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/main.js'),
        content: resolve(__dirname, 'content.js'),
        background: resolve(__dirname, 'background.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: true
  }
})