<template>
  <div class="relative flex h-screen w-screen overflow-hidden bg-[#f6f6f4] text-gray-800">
    <button
      v-if="isCompactViewport"
      @click="isSidebarOpen = true"
      class="fixed left-3 top-3 z-40 rounded-lg border border-gray-200 bg-white/95 p-2 text-gray-700 shadow-sm"
      aria-label="打开侧栏"
    >
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isCompactViewport && isSidebarOpen"
        class="fixed inset-0 z-30 bg-gray-900/35 backdrop-blur-[1px]"
        @click="isSidebarOpen = false"
      ></div>
    </transition>

    <aside
      class="z-40 flex flex-col border-r border-gray-200 bg-gray-50 transition-transform duration-200"
      :class="
        isCompactViewport
          ? `fixed inset-y-0 left-0 w-[280px] max-w-[85vw] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
          : 'relative translate-x-0'
      "
      :style="sidebarStyle"
    >
      <div class="flex items-center justify-center gap-3 border-b border-gray-100 p-6">
        <img
          src="@/assets/logo.png"
          alt="SmartPath Logo"
          class="w-8 h-8 rounded-lg shadow-sm object-cover"
        />
        <span class="text-xl font-black text-gray-800 tracking-wider">智 径</span>
      </div>

      <div class="px-2 py-3 border-b border-gray-100">
        <div
          @click="navigateTo('/dashboard')"
          class="flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors"
          :class="
            route.path === '/dashboard'
              ? 'bg-gray-200 text-gray-800 font-medium'
              : 'text-gray-600 hover:bg-gray-200'
          "
        >
          <span class="text-xl">📊</span>
          <span class="flex-1 text-sm">数据仪表盘</span>
        </div>

        <div
          @click="navigateTo('/review')"
          class="flex items-center gap-3 px-4 py-2 mt-1 rounded-lg cursor-pointer transition-colors"
          :class="
            route.path === '/review'
              ? 'bg-gray-200 text-gray-800 font-medium'
              : 'text-gray-600 hover:bg-gray-200'
          "
        >
          <span class="text-xl">📅</span>
          <span class="flex-1 text-sm">周报回顾</span>
        </div>

        <div
          @click="navigateTo('/ai-planner')"
          class="flex items-center gap-3 px-4 py-2 mt-1 rounded-lg cursor-pointer transition-colors"
          :class="
            route.path === '/ai-planner'
              ? 'bg-emerald-50 text-emerald-600 font-medium'
              : 'text-gray-600 hover:bg-gray-200'
          "
        >
          <span class="text-xl">✨</span>
          <span class="flex-1 text-sm font-semibold text-emerald-500">AI 智能规划</span>
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
              ? 'bg-gray-200 text-gray-800 font-medium'
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
            class="flex items-center overflow-hidden rounded border border-gray-300 bg-[#f7f7f5] shadow-sm"
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
          class="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
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
              class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-sm shadow-sm"
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
          class="absolute bottom-16 left-4 w-[calc(100%-2rem)] bg-white border border-gray-100 rounded-lg shadow-lg z-50 py-1 overflow-hidden"
        >
          <div
            @click="goToSettings"
            class="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors text-gray-700"
          >
            <span>⚙️</span> 个人设置
          </div>
          <div class="h-px bg-gray-100 my-1"></div>
          <div
            @click="openLogoutModal"
            class="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer hover:bg-red-50 transition-colors text-red-600 font-medium"
          >
            <span>🚪</span> 退出登录
          </div>
        </div>
      </div>

      <div
        v-if="!isCompactViewport"
        class="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-400 active:bg-blue-500 transition-all z-20"
        @mousedown="startResizeLeft"
      ></div>
    </aside>

    <router-view
      class="flex-1 overflow-y-auto bg-gray-50"
      :class="isCompactViewport ? 'pt-14' : ''"
      @refresh-projects="loadProjects"
    />

    <transition
      enter-active-class="ease-out duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showLogoutModal"
        class="fixed inset-0 z-[100] flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none"
      >
        <div
          class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
          @click="showLogoutModal = false"
        ></div>

        <div class="relative w-auto max-w-sm mx-auto my-6 z-[101] transform transition-all">
          <div
            class="relative flex flex-col w-full bg-white border-0 rounded-2xl shadow-xl outline-none focus:outline-none overflow-hidden"
          >
            <div class="h-1 w-full bg-red-500"></div>
            <div class="p-6 pb-0 flex flex-col items-center text-center">
              <div class="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <span class="text-2xl">🚪</span>
              </div>
              <h3 class="text-xl font-black text-gray-800 mb-2">准备离开？</h3>
              <p class="text-sm text-gray-500 leading-relaxed px-4">
                确定要退出当前账号吗？未保存的草稿可能会丢失。
              </p>
            </div>
            <div class="flex items-center justify-center p-6 gap-3 rounded-b mt-2">
              <button
                class="btn-secondary flex-1 rounded-xl outline-none focus:outline-none"
                type="button"
                @click="showLogoutModal = false"
              >
                取消
              </button>
              <button
                class="btn-danger flex-1 rounded-xl outline-none focus:outline-none"
                type="button"
                @click="executeLogout"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addProjectApi, deleteProjectApi, fetchProjectList } from '@/api/project'
import { getUserMeApi, logoutApi } from '@/api/user'
import { useToast } from '@/composables/useToast'
import { useUndoDelete } from '@/composables/useUndoDelete'

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
const toast = useToast()
const undoDelete = useUndoDelete()

const projectList = ref<Project[]>([])
const isAddingProject = ref(false)
const newProjectName = ref('')
const isUserMenuOpen = ref(false)
const showLogoutModal = ref(false)
const currentUserInfo = ref<CurrentUserInfo>({})
const sidebarWidth = ref(Number(localStorage.getItem('tick_sidebarWidth')) || 256)
const isResizingLeft = ref(false)
const viewportWidth = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)
const isSidebarOpen = ref(false)

const isCompactViewport = computed(() => viewportWidth.value < 1024)
const sidebarStyle = computed(() =>
  isCompactViewport.value ? undefined : { width: `${sidebarWidth.value}px` },
)

const updateViewport = () => {
  viewportWidth.value = window.innerWidth
  if (!isCompactViewport.value) {
    isSidebarOpen.value = false
  }
}

const closeSidebar = () => {
  if (isCompactViewport.value) {
    isSidebarOpen.value = false
  }
}

const navigateTo = async (path: string) => {
  await router.push(path)
  closeSidebar()
}

const startResizeLeft = () => {
  if (isCompactViewport.value) return
  isResizingLeft.value = true
  document.addEventListener('mousemove', handleMouseMoveLeft)
  document.addEventListener('mouseup', stopResizeLeft)
  document.body.style.userSelect = 'none'
}

const handleMouseMoveLeft = (e: MouseEvent) => {
  if (!isResizingLeft.value) return
  const newWidth = e.clientX
  if (newWidth > 200 && newWidth < 400) {
    sidebarWidth.value = newWidth
  }
}

const stopResizeLeft = () => {
  isResizingLeft.value = false
  document.removeEventListener('mousemove', handleMouseMoveLeft)
  document.removeEventListener('mouseup', stopResizeLeft)
  document.body.style.userSelect = ''
  localStorage.setItem('tick_sidebarWidth', sidebarWidth.value.toString())
}

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
  closeSidebar()
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
  } catch {
    toast.error('创建清单失败，请检查网络后重试。')
  }
}

const openAddProjectInput = () => {
  isAddingProject.value = true
  newProjectName.value = ''
  if (isCompactViewport.value) {
    isSidebarOpen.value = true
  }
}

const deleteProject = async (id: string, name: string) => {
  const isConfirm = window.confirm(`确定要删除清单 "${name}" 吗？相关的任务可能会一并丢失！`)
  if (!isConfirm) return

  const snapshot = [...projectList.value]
  const removedIndex = snapshot.findIndex((item) => item.id === id)
  const removedProject = snapshot.find((item) => item.id === id)
  if (!removedProject) return

  const wasSelected = selectedProjectId.value === id
  projectList.value = snapshot.filter((item) => item.id !== id)

  if (wasSelected) {
    localStorage.removeItem('tick_selectedProjectId')
    await router.push('/tasks')
  }

  undoDelete.scheduleUndoDelete({
    label: `清单「${name}」`,
    pendingMessage: `清单「${name}」已移除，5 秒内可撤销。`,
    onCommit: async () => {
      await deleteProjectApi(id)
    },
    onCommitSuccess: async () => {
      await loadProjects()
    },
    onRollback: async () => {
      if (!projectList.value.some((item) => item.id === id)) {
        const next = [...projectList.value]
        const insertIndex = removedIndex >= 0 && removedIndex <= next.length ? removedIndex : next.length
        next.splice(insertIndex, 0, removedProject)
        projectList.value = next
      }

      if (wasSelected) {
        localStorage.setItem('tick_selectedProjectId', id)
        if (route.path === '/tasks') {
          await router.push({ path: '/tasks', query: { projectId: id } })
        }
      }
    },
  })
}

const goToSettings = async () => {
  isUserMenuOpen.value = false
  await navigateTo('/settings')
}

const openLogoutModal = () => {
  showLogoutModal.value = true
  isUserMenuOpen.value = false
}

const executeLogout = async () => {
  showLogoutModal.value = false
  try {
    await logoutApi()
  } catch {
    // force logout even when API request fails
  }
  localStorage.removeItem('token')
  router.push('/login')
}

watch(
  () => route.fullPath,
  () => {
    isUserMenuOpen.value = false
    closeSidebar()
  },
)

onMounted(() => {
  loadUserInfo()
  loadProjects()
  updateViewport()
  window.addEventListener('resize', updateViewport)
})

onBeforeUnmount(() => {
  stopResizeLeft()
  window.removeEventListener('resize', updateViewport)
})
</script>
