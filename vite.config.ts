import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite' // 👈 1. 引入 Tailwind 插件

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(), // 👈 2. 注册到 Vite 插件数组里
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // 👇👇👇 新增：开发服务器代理配置 👇👇👇
  server: {
    proxy: {
      // 意思是：只要前端请求的路径是以 /api 开头的，Vite 就帮你拦截下来，转发给后端的 8080 端口
      '/api': {
        // target: 'http://111.230.99.61:8080/',
        target: 'http://localhost:8123/',
        changeOrigin: true, // 允许跨域
      },
    },
  },
})
