import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../views/MainLayout.vue'
import LoginView from '../views/LoginView.vue' // 引入登录页

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView, // 登录页面
    },
    {
      path: '/',
      name: 'home',
      component: MainLayout, // 你的滴答清单主布局
    },
  ],
})

// 👇👇👇 新增：全局前置路由守卫
router.beforeEach((to, from, next) => {
  // 1. 检查本地有没有 token
  const hasToken = localStorage.getItem('token')

  // 2. 如果要去的地方不是登录页，而且没有 token，就强制跳回登录页
  if (to.path !== '/login' && !hasToken) {
    next('/login')
  }
  // 3. 如果已经登录了还想去登录页，就强制跳回首页
  else if (to.path === '/login' && hasToken) {
    next('/')
  }
  // 4. 其他情况，正常放行
  else {
    next()
  }
})

export default router
