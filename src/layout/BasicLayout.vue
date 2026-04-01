<template>
  <div class="flex h-screen w-screen bg-white overflow-hidden text-gray-800">
    <aside class="w-64 bg-gray-50 border-r border-gray-200 flex flex-col z-10">
      <div class="p-4 font-bold text-lg border-b border-gray-200 flex items-center gap-2">
        <span class="text-blue-500">✅</span> 我的滴答清单
      </div>

      <div class="px-2 py-3 border-b border-gray-100">
        <div
          @click="router.push('/dashboard')"
          class="flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors"
          :class="
            route.path === '/dashboard'
              ? 'bg-indigo-100 text-indigo-700 font-medium'
              : 'text-gray-600 hover:bg-gray-200'
          "
        >
          <span class="text-xl">📊</span>
          <span class="flex-1 text-sm">数据仪表盘</span>
        </div>

        <div
          @click="router.push('/review')"
          class="flex items-center gap-3 px-4 py-2 mt-1 rounded-lg cursor-pointer transition-colors"
          :class="
            route.path === '/review'
              ? 'bg-indigo-100 text-indigo-700 font-medium'
              : 'text-gray-600 hover:bg-gray-200'
          "
        >
          <span class="text-xl">📅</span>
          <span class="flex-1 text-sm">周报回顾</span>
        </div>

        <div
          @click="router.push('/ai-planner')"
          class="flex items-center gap-3 px-4 py-2 mt-1 rounded-lg cursor-pointer transition-colors"
          :class="
            route.path === '/ai-planner'
              ? 'bg-indigo-100 text-indigo-700 font-medium'
              : 'text-gray-600 hover:bg-gray-200'
          "
        >
          <span class="text-xl">✨</span>
          <span
            class="flex-1 text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-500"
          >
            AI 智能规划
          </span>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto py-2">
        <div
          v-for="project in projectList"
          :key="project.id"
          @click="selectProject(project.id)"
          class="flex items-center gap-3 px-4 py-2 mx-2 rounded-lg cursor-pointer transition-colors group"
          :class="
            (route.path === '/tasks' || route.path === '/') && selectedProjectId === project.id
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-200'
          "
        >
          <span class="text-xl">{{ project.icon || '📁' }}</span>
          <span class="flex-1 text-sm truncate">{{ project.name }}</span>

          <button
            @click.stop="deleteProject(project.id, project.name)"
            class="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 transition-all rounded hover:bg-white"
            title="删除清单"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              ></path>
            </svg>
          </button>
        </div>

        <div v-if="isAddingProject" class="px-4 py-2 mx-2 mt-1">
          <div
            class="flex items-center bg-white rounded border border-blue-400 overflow-hidden shadow-sm"
          >
            <input
              v-model="newProjectName"
              @keyup.enter="submitNewProject"
              @blur="isAddingProject = false"
              autofocus
              type="text"
              placeholder="清单名称 (按回车)"
              class="w-full text-sm px-3 py-1.5 outline-none text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      <div class="p-3 border-t border-gray-200">
        <button
          v-if="!isAddingProject"
          @click="openAddProjectInput"
          class="w-full flex items-center gap-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
          添加清单
        </button>
      </div>

      <div class="mt-auto p-4 border-t border-gray-200 bg-gray-50 group relative">
        <div
          class="flex items-center justify-between cursor-pointer"
          @click="isUserMenuOpen = !isUserMenuOpen"
        >
          <div class="flex items-center gap-2 overflow-hidden">
            <div
              class="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm"
            >
              {{
                currentUserInfo.username ? currentUserInfo.username.charAt(0).toUpperCase() : 'U'
              }}
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-bold text-gray-700 truncate">{{
                currentUserInfo.username || '加载中...'
              }}</span>
              <span class="text-xs text-gray-400 truncate">{{
                currentUserInfo.account || '@user'
              }}</span>
            </div>
          </div>
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 15l7-7 7 7"
            ></path>
          </svg>
        </div>

        <div
          v-if="isUserMenuOpen"
          class="absolute bottom-16 left-4 w-[calc(100%-2rem)] bg-white border border-gray-100 rounded-lg shadow-xl z-50 py-1 overflow-hidden"
        >
          <div
            @click="goToSettings"
            class="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors text-gray-700"
          >
            <span>⚙️</span> 个人设置
          </div>
          <div class="h-px bg-gray-100 my-1"></div>
          <div
            @click="handleLogout"
            class="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer hover:bg-red-50 transition-colors text-red-600 font-medium"
          >
            <span>🚪</span> 退出登录
          </div>
        </div>
      </div>
    </aside>

    <router-view class="flex-1 overflow-y-auto bg-gray-50" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addProjectApi, deleteProjectApi, fetchProjectList } from '@/api/project'
import { getUserMeApi, logoutApi } from '@/api/user'

interface Project {
  id: string
  name: string
  icon: string
}

interface CurrentUserInfo {
  username?: string
  account?: string
}

const router = useRouter()
const route = useRoute()

const projectList = ref<Project[]>([])
const isAddingProject = ref(false)
const newProjectName = ref('')
const isUserMenuOpen = ref(false)
const currentUserInfo = ref<CurrentUserInfo>({})

const selectedProjectId = computed(() => {
  const routeId = route.query.projectId
  if (typeof routeId === 'string' && routeId) return routeId
  return localStorage.getItem('tick_selectedProjectId') || ''
})

const loadUserInfo = async () => {
  try {
    const res = await getUserMeApi()
    currentUserInfo.value = res && typeof res === 'object' ? (res as CurrentUserInfo) : {}
  } catch (error) {
    console.error('获取用户信息失败', error)
  }
}

const ensureDefaultProject = async () => {
  if (selectedProjectId.value || projectList.value.length === 0) return

  const firstProject = projectList.value[0]
  if (!firstProject) return
  const firstProjectId = firstProject.id
  localStorage.setItem('tick_selectedProjectId', firstProjectId)

  if (route.path === '/tasks') {
    await router.replace({ path: '/tasks', query: { projectId: firstProjectId } })
  }
}

const loadProjects = async () => {
  try {
    const res = await fetchProjectList()
    const records = (res as unknown as { records?: Project[] })?.records
    projectList.value = records || []
    await ensureDefaultProject()
  } catch (error) {
    console.error('加载项目失败', error)
  }
}

const selectProject = async (id: string) => {
  localStorage.setItem('tick_selectedProjectId', id)
  await router.push({ path: '/tasks', query: { projectId: id } })
}

const submitNewProject = async () => {
  const name = newProjectName.value.trim()
  if (!name) {
    isAddingProject.value = false
    return
  }

  try {
    await addProjectApi({ name, icon: '📁' })
    newProjectName.value = ''
    isAddingProject.value = false
    await loadProjects()
  } catch (error) {
    alert('创建清单失败，请检查控制台')
  }
}

const openAddProjectInput = () => {
  isAddingProject.value = true
  newProjectName.value = ''
}

const deleteProject = async (id: string, name: string) => {
  const isConfirm = window.confirm(`确定要删除清单 "${name}" 吗？相关的任务可能会一并丢失！`)
  if (!isConfirm) return

  try {
    await deleteProjectApi(id)

    if (selectedProjectId.value === id) {
      localStorage.removeItem('tick_selectedProjectId')
      await router.push('/tasks')
    }

    await loadProjects()
  } catch (error) {
    alert('删除清单失败，请检查控制台报错')
  }
}

const goToSettings = async () => {
  isUserMenuOpen.value = false
  await router.push('/settings')
}

const handleLogout = async () => {
  if (!window.confirm('确定要退出登录吗？')) return
  try {
    await logoutApi()
  } catch {
    // keep frontend logout behavior even if API call fails
  }
  localStorage.removeItem('token')
  await router.push('/login')
}

watch(
  () => route.fullPath,
  () => {
    isUserMenuOpen.value = false
  },
)

onMounted(() => {
  loadUserInfo()
  loadProjects()
})
</script>
