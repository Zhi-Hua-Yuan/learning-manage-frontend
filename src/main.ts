import './assets/main.css' // 引入刚才创建的 Tailwind 样式文件

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { useTheme } from './composables/useTheme'
import router from './router'

const { initTheme } = useTheme()
initTheme()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
