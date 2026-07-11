import { createRouter, createWebHistory } from 'vue-router'
import { readAuthToken } from '@/utils/authToken'

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
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/',
      component: () => import('@/layout/BasicLayout.vue'),
      children: [
        {
          path: 'tasks',
          name: 'tasks',
          component: () => import('@/views/task/TaskList.vue'),
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/dashboard/Dashboard.vue'),
        },
        {
          path: 'review',
          name: 'review',
          component: () => import('@/views/review/WeeklyReview.vue'),
        },
        {
          path: 'ai-planner',
          name: 'ai-planner',
          component: () => import('@/views/ai/AiPlanner.vue'),
        },
        {
          path: 'ai/draft/:draftId',
          name: 'ai-draft-detail',
          component: () => import('@/views/ai/AiDraftDetail.vue'),
          props: true,
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/setting/Settings.vue'),
        },
        {
          path: 'projects/archived',
          name: 'archived-projects',
          component: () => import('@/views/project/ArchivedProjects.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to, from, next) => {
  const hasToken = readAuthToken()

  if (to.path !== '/login' && !hasToken) {
    next('/login')
  } else if (to.path === '/login' && hasToken) {
    next('/tasks')
  } else {
    next()
  }
})

export default router
