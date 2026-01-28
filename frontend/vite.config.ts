import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Custom plugin to disable host check
const disableHostCheckPlugin = () => ({
  name: 'disable-host-check',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      // Allow all hosts
      next()
    })
  },
})

export default defineConfig({
  plugins: [react(), disableHostCheckPlugin()],
  base: process.env.VITE_BASE_PATH || '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      clientPort: 443,
      protocol: 'wss',
    },
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
    fs: {
      strict: false,
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'antd-vendor': ['antd', '@ant-design/icons'],
          'i18n-vendor': ['i18next', 'react-i18next'],
        },
      },
    },
  },
})
