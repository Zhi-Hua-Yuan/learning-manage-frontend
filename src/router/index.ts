import { createRouter, createWebHistory } from 'vue-router'
import BasicLayout from '@/layout/BasicLayout.vue'
import LoginView from '@/views/LoginView.vue'
import TaskList from '@/views/task/TaskList.vue'
import Dashboard from '@/views/dashboard/Dashboard.vue'
import WeeklyReview from '@/views/review/WeeklyReview.vue'
import AiPlanner from '@/views/ai/AiPlanner.vue'
import Settings from '@/views/setting/Settings.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/tasks',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/',
      component: BasicLayout,
      children: [
        {
          path: 'tasks',
          name: 'tasks',
          component: TaskList,
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: Dashboard,
        },
        {
          path: 'review',
          name: 'review',
          component: WeeklyReview,
        },
        {
          path: 'ai-planner',
          name: 'ai-planner',
          component: AiPlanner,
        },
        {
          path: 'settings',
          name: 'settings',
          component: Settings,
        },
      ],
    },
  ],
})

router.beforeEach((to, from, next) => {
  const hasToken = localStorage.getItem('token')

  if (to.path !== '/login' && !hasToken) {
    next('/login')
  } else if (to.path === '/login' && hasToken) {
    next('/tasks')
  } else {
    next()
  }
})

export default router
