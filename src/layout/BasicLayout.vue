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

      <div class="border-b border-gray-100 px-2 py-3">
        <div class="px-3 pb-2 text-xs font-medium text-gray-400">功能</div>

        <div class="space-y-1">
          <div
            @click="navigateTo('/dashboard')"
            class="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors"
            :class="
              route.path === '/dashboard'
                ? 'bg-gray-200 text-gray-800 font-medium'
                : 'text-gray-600 hover:bg-gray-200'
            "
          >
            <span class="text-lg leading-none">📊</span>
            <span class="flex-1 text-[13px] leading-5">数据仪表盘</span>
          </div>

          <div
            @click="navigateTo('/review')"
            class="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors"
            :class="
              route.path === '/review'
                ? 'bg-gray-200 text-gray-800 font-medium'
                : 'text-gray-600 hover:bg-gray-200'
            "
          >
            <span class="text-lg leading-none">📅</span>
            <span class="flex-1 text-[13px] leading-5">周报回顾</span>
          </div>

          <div
            @click="navigateTo('/ai-planner')"
            class="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors"
            :class="
              route.path === '/ai-planner'
                ? 'bg-emerald-50 text-emerald-600 font-medium'
                : 'text-gray-600 hover:bg-gray-200'
            "
          >
            <span class="text-lg leading-none">✨</span>
            <span
              class="flex-1 text-[13px] font-semibold leading-5"
              :class="route.path === '/ai-planner' ? 'text-emerald-600' : 'text-emerald-500'"
              >AI 智能规划</span
            >
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-2 py-3">
        <div class="px-3 pb-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-400">清单</span>
            <button
              @click="openAddProjectInput"
              type="button"
              :disabled="isAddingProject"
              class="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors"
              :class="isAddingProject ? 'invisible' : 'hover:bg-gray-200 hover:text-gray-700'"
              aria-label="添加清单"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                ></path>
              </svg>
            </button>
          </div>
        </div>

        <div v-if="isAddingProject" class="mb-1 px-3">
          <div class="flex items-center overflow-hidden rounded border border-gray-300 bg-[#f7f7f5] shadow-sm">
            <input
              v-model="newProjectName"
              @keyup.enter="submitNewProject"
              @blur="isAddingProject = false"
              autofocus
              type="text"
              placeholder="清单名称 (按回车)"
              class="w-full px-3 py-2 text-sm text-gray-700 outline-none placeholder-gray-400"
            />
          </div>
        </div>

        <div class="space-y-1">
          <div
            v-for="project in projectList"
            :key="project.id"
            @click="handleProjectRowClick(project.id)"
            class="group flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors"
            :class="
              (route.path === '/tasks' || route.path === '/') && selectedProjectId === project.id
                ? 'bg-gray-200 text-gray-800 font-medium'
                : 'text-gray-600 hover:bg-gray-200'
            "
          >
            <span class="text-lg leading-none">{{ project.icon || '📁' }}</span>

            <input
              v-if="editingProjectId === project.id"
              :id="`project-rename-${project.id}`"
              v-model="editingProjectName"
              type="text"
              class="min-w-0 flex-1 rounded border border-blue-400 bg-white px-2 py-1 text-[13px] text-gray-800 outline-none"
              @click.stop
              @pointerdown.stop
              @keyup.enter="submitProjectRename(project)"
              @keyup.esc="cancelProjectRename"
              @blur="submitProjectRename(project)"
            />
            <span v-else class="flex-1 truncate text-[13px] leading-5">{{ project.name }}</span>

            <div
              class="relative flex items-center"
              data-project-action-root
              :data-project-id="project.id"
              @click.stop
              @pointerdown.stop
            >
              <button
                type="button"
                class="rounded p-1.5 text-gray-400 transition-all hover:bg-white hover:text-gray-700"
                :class="projectActionButtonClass(project.id)"
                :title="activeProjectActionId === project.id ? '关闭操作' : '更多操作'"
                @click.stop="toggleProjectActionMenu(project.id)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6h.01M12 12h.01M12 18h.01"
                  ></path>
                </svg>
              </button>

              <div
                v-if="activeProjectActionId === project.id"
                class="absolute right-0 top-9 z-50 w-36 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg"
              >
                <button
                  type="button"
                  class="flex w-full items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  @click="startRenameProject(project)"
                >
                  重命名
                </button>
                <button
                  type="button"
                  class="flex w-full items-center px-3 py-2 text-left text-sm"
                  :class="
                    isFirstProject(project.id)
                      ? 'cursor-not-allowed text-gray-300'
                      : 'text-gray-700 hover:bg-gray-50'
                  "
                  :disabled="isFirstProject(project.id)"
                  @click="moveProject(project.id, -1)"
                >
                  上移
                </button>
                <button
                  type="button"
                  class="flex w-full items-center px-3 py-2 text-left text-sm"
                  :class="
                    isLastProject(project.id)
                      ? 'cursor-not-allowed text-gray-300'
                      : 'text-gray-700 hover:bg-gray-50'
                  "
                  :disabled="isLastProject(project.id)"
                  @click="moveProject(project.id, 1)"
                >
                  下移
                </button>
                <div class="my-1 h-px bg-gray-100"></div>
                <button
                  type="button"
                  class="flex w-full items-center px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  @click="openDeleteProjectConfirm(project.id, project.name)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
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

    <AppConfirmDialog
      v-model="showDeleteProjectConfirm"
      variant="danger"
      icon="🗑️"
      :title="deleteProjectConfirmTitle"
      message="相关的任务可能会一并丢失，请确认后再继续。"
      confirm-text="确认删除"
      cancel-text="取消"
      @confirm="confirmDeleteProject"
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import {
  addProjectApi,
  deleteProjectApi,
  fetchProjectList,
  reorderProjectApi,
  updateProjectApi,
} from '@/api/project'
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
const showDeleteProjectConfirm = ref(false)
const pendingDeleteProject = ref<{ id: string; name: string } | null>(null)
const activeProjectActionId = ref('')
const editingProjectId = ref('')
const editingProjectName = ref('')
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

const projectActionButtonClass = (projectId: string) => {
  if (isCompactViewport.value || activeProjectActionId.value === projectId) {
    return 'opacity-100'
  }

  return 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
}

const closeProjectActionMenu = () => {
  activeProjectActionId.value = ''
}

const toggleProjectActionMenu = (projectId: string) => {
  activeProjectActionId.value = activeProjectActionId.value === projectId ? '' : projectId
}

const isFirstProject = (projectId: string) => {
  const index = projectList.value.findIndex((item) => item.id === projectId)
  return index <= 0
}

const isLastProject = (projectId: string) => {
  const index = projectList.value.findIndex((item) => item.id === projectId)
  return index === projectList.value.length - 1
}

const cloneProjectList = () => projectList.value.map((item) => ({ ...item }))

const navigateTo = async (path: string) => {
  await router.push(path)
  closeSidebar()
}

const handleProjectRowClick = async (id: string) => {
  if (editingProjectId.value) return
  await selectProject(id)
}

const cancelProjectRename = () => {
  editingProjectId.value = ''
  editingProjectName.value = ''
}

const startRenameProject = async (project: Project) => {
  editingProjectId.value = project.id
  editingProjectName.value = project.name
  closeProjectActionMenu()
  await nextTick()
  const input = document.getElementById(`project-rename-${project.id}`) as HTMLInputElement | null
  input?.focus()
  input?.select()
}

const submitProjectRename = async (project: Project) => {
  if (editingProjectId.value !== project.id) return

  const nextName = editingProjectName.value.trim()
  if (!nextName) {
    toast.warning('清单名称不能为空。')
    cancelProjectRename()
    return
  }

  if (nextName === project.name) {
    cancelProjectRename()
    return
  }

  const snapshot = cloneProjectList()
  const target = projectList.value.find((item) => item.id === project.id)
  if (!target) {
    cancelProjectRename()
    return
  }

  target.name = nextName
  cancelProjectRename()

  try {
    await updateProjectApi({ id: project.id, name: nextName, icon: project.icon })
  } catch {
    projectList.value = snapshot
    toast.error('重命名清单失败，请检查网络后重试。')
  }
}

const moveProject = async (projectId: string, direction: -1 | 1) => {
  const fromIndex = projectList.value.findIndex((item) => item.id === projectId)
  if (fromIndex < 0) return

  const toIndex = fromIndex + direction
  if (toIndex < 0 || toIndex >= projectList.value.length) return

  const snapshot = cloneProjectList()
  const next = cloneProjectList()
  const [moved] = next.splice(fromIndex, 1)
  if (!moved) return
  next.splice(toIndex, 0, moved)
  projectList.value = next
  closeProjectActionMenu()

  try {
    await reorderProjectApi(
      next.map((item, index) => ({
        id: item.id,
        orderNo: index,
      })),
    )
  } catch {
    projectList.value = snapshot
    toast.error('调整清单顺序失败，请检查网络后重试。')
  }
}

const handleDocumentPointerDown = (event: PointerEvent) => {
  const target = event.target as HTMLElement | null
  if (!target || !activeProjectActionId.value) return

  const selector = `[data-project-action-root][data-project-id="${activeProjectActionId.value}"]`
  if (!target.closest(selector)) {
    closeProjectActionMenu()
  }
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

const deleteProjectConfirmTitle = computed(() => {
  if (!pendingDeleteProject.value) return '确认删除清单？'
  return `确认删除清单“${pendingDeleteProject.value.name}”？`
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

    if (activeProjectActionId.value && !projectList.value.some((item) => item.id === activeProjectActionId.value)) {
      closeProjectActionMenu()
    }
    if (editingProjectId.value && !projectList.value.some((item) => item.id === editingProjectId.value)) {
      cancelProjectRename()
    }

    await ensureDefaultProject()
  } catch (error) {
    console.error('加载项目失败', error)
  }
}

const selectProject = async (id: string) => {
  closeProjectActionMenu()
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
  closeProjectActionMenu()
  cancelProjectRename()
  isAddingProject.value = true
  newProjectName.value = ''
  if (isCompactViewport.value) {
    isSidebarOpen.value = true
  }
}

const openDeleteProjectConfirm = (id: string, name: string) => {
  closeProjectActionMenu()
  pendingDeleteProject.value = { id, name }
  showDeleteProjectConfirm.value = true
}

const confirmDeleteProject = async () => {
  const target = pendingDeleteProject.value
  if (!target) return

  showDeleteProjectConfirm.value = false
  await deleteProject(target.id, target.name)
}

const deleteProject = async (id: string, name: string) => {
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
    closeProjectActionMenu()
    cancelProjectRename()
    closeSidebar()
  },
)

watch(showDeleteProjectConfirm, (next) => {
  if (!next) {
    pendingDeleteProject.value = null
  }
})

onMounted(() => {
  loadUserInfo()
  loadProjects()
  updateViewport()
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  window.addEventListener('resize', updateViewport)
})

onBeforeUnmount(() => {
  stopResizeLeft()
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  window.removeEventListener('resize', updateViewport)
})
</script>
