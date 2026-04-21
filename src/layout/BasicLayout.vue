<template>
  <div class="relative flex h-screen w-screen overflow-hidden bg-[var(--color-bg-page)] text-[var(--color-text-body)]">
    <button
      v-if="isCompactViewport"
      @click="isSidebarOpen = true"
      class="fixed left-3 top-3 z-[var(--z-popover)] rounded-lg border border-[var(--color-sidebar-border)] bg-[var(--color-popover-bg)] p-2 text-[var(--color-text-body)] shadow-[var(--shadow-card)]"
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
        class="fixed inset-0 z-[var(--z-popover)] bg-[var(--color-bg-mask)] backdrop-blur-[1px]"
        @click="isSidebarOpen = false"
      ></div>
    </transition>

    <aside
      class="z-[var(--z-drawer)] flex flex-col border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-bg)] transition-transform duration-200"
      :class="
        isCompactViewport
          ? `fixed inset-y-0 left-0 w-[280px] max-w-[85vw] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
          : 'relative translate-x-0'
      "
      :style="sidebarStyle"
    >
      <div class="flex items-center justify-center gap-3 border-b border-[var(--color-sidebar-border)] p-6">
        <img
          src="@/assets/logo.png"
          alt="SmartPath Logo"
          class="w-8 h-8 rounded-lg shadow-sm object-cover"
        />
        <span class="text-xl font-black text-[var(--color-text-primary)] tracking-wider">智 径</span>
      </div>

      <div class="border-b border-[var(--color-sidebar-border)] px-2 py-3">
        <div class="px-3 pb-2 text-xs font-medium text-[var(--color-text-tertiary)]">功能</div>

        <div class="space-y-1">
          <div
            @click="navigateTo('/dashboard')"
            class="interactive-row flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2"
            :class="
              route.path === '/dashboard'
                ? 'is-active font-medium'
                : 'text-[var(--color-text-secondary)]'
            "
          >
            <AppIcon name="dashboard" class="h-4 w-4" />
            <span class="flex-1 text-[13px] leading-5">数据仪表盘</span>
          </div>

          <div
            @click="navigateToToday"
            class="interactive-row flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2"
            :class="
              isTodayRoute
                ? 'is-active font-medium'
                : 'text-[var(--color-text-secondary)]'
            "
          >
            <AppIcon name="sun" class="h-4 w-4" />
            <span class="flex-1 text-[13px] leading-5">今天截止</span>
          </div>

          <div
            @click="navigateToWeek"
            class="interactive-row flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2"
            :class="
              isWeekRoute
                ? 'is-active font-medium'
                : 'text-[var(--color-text-secondary)]'
            "
          >
            <AppIcon name="calendar" class="h-4 w-4" />
            <span class="flex-1 text-[13px] leading-5">本周截止</span>
          </div>

          <div
            @click="navigateTo('/review')"
            class="interactive-row flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2"
            :class="
              route.path === '/review'
                ? 'is-active font-medium'
                : 'text-[var(--color-text-secondary)]'
            "
          >
            <AppIcon name="clipboard-list" class="h-4 w-4" />
            <span class="flex-1 text-[13px] leading-5">周报回顾</span>
          </div>

          <div
            @click="navigateTo('/ai-planner')"
            class="interactive-row flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2"
            :class="
              route.path === '/ai-planner'
                ? 'bg-[var(--color-success-soft)] text-[var(--color-ai)] font-medium'
                : 'text-[var(--color-text-secondary)]'
            "
          >
            <AppIcon name="sparkles" class="h-4 w-4" />
            <span
              class="flex-1 text-[13px] font-semibold leading-5"
              :class="
                route.path === '/ai-planner'
                  ? 'text-[var(--color-ai)]'
                  : 'text-[var(--color-success)]'
              "
              >AI 智能规划</span
            >
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-2 py-3">
        <div class="px-3 pb-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-[var(--color-text-tertiary)]">清单</span>
            <button
              @click="openAddProjectInput"
              type="button"
              class="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-body)]"
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

        <div class="space-y-1">
          <div
            v-for="project in projectList"
            :key="project.id"
            @click="handleProjectRowClick(project.id)"
            class="interactive-row group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2"
            :class="
              (route.path === '/tasks' || route.path === '/') && !isTodayRoute && !isWeekRoute && selectedProjectId === project.id
                ? 'is-active font-medium'
                : 'text-[var(--color-text-secondary)]'
            "
          >
            <AppIcon :name="getProjectIconName(project.icon)" class="h-4 w-4" />
            <span class="flex-1 truncate text-[13px] leading-5">{{ project.name }}</span>
            <span
              v-if="getProjectColor(project.color)"
              class="h-2.5 w-2.5 shrink-0 rounded-full border border-white/70"
              :style="{ backgroundColor: getProjectColor(project.color) }"
            ></span>

            <div
              class="relative flex items-center"
              data-project-action-root
              :data-project-id="project.id"
              @click.stop
              @pointerdown.stop
            >
              <button
                type="button"
                class="rounded p-1.5 text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-body)]"
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

              <Teleport
                v-if="activeProjectActionId === project.id"
                to="body"
              >
                <div
                  class="surface-panel z-[var(--z-overlay)] w-36 overflow-hidden rounded-lg py-1"
                  :style="getActionMenuStyle(project.id)"
                  data-project-action-menu
                  :data-project-id="project.id"
                  @pointerdown.stop
                  @click.stop
                >
                <button
                  type="button"
                  class="interactive-row flex w-full items-center px-3 py-2 text-left text-sm text-[var(--color-text-body)]"
                  @click="openProjectSettings(project)"
                >
                  自定义
                </button>
                <button
                  type="button"
                  class="flex w-full items-center px-3 py-2 text-left text-sm"
                  :class="
                    isFirstProject(project.id)
                      ? 'cursor-not-allowed text-[var(--color-text-tertiary)] opacity-60'
                      : 'interactive-row text-[var(--color-text-body)]'
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
                      ? 'cursor-not-allowed text-[var(--color-text-tertiary)] opacity-60'
                      : 'interactive-row text-[var(--color-text-body)]'
                  "
                  :disabled="isLastProject(project.id)"
                  @click="moveProject(project.id, 1)"
                >
                  下移
                </button>
                <div class="my-1 h-px bg-[var(--color-popover-border)]"></div>
                <button
                  type="button"
                  class="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--color-text-body)] hover:bg-[var(--color-menu-hover)]"
                  @click="archiveProject(project.id)"
                >
                  归档
                </button>
                <button
                  type="button"
                  class="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger-soft)]"
                  @click="openDeleteProjectConfirm(project.id, project.name)"
                >
                  删除
                </button>
                </div>
              </Teleport>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-body)]"
        @click="router.push('/projects/archived')"
      >
        <AppIcon name="archive" class="h-4 w-4" />
        归档清单
      </button>

      <div class="group relative mt-auto border-t border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-bg)] p-4">
        <div
          class="flex items-center justify-between cursor-pointer"
          @click="isUserMenuOpen = !isUserMenuOpen"
        >
          <div class="flex items-center gap-2 overflow-hidden">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-[var(--color-text-on-accent)] shadow-[var(--shadow-card)]"
            >
              {{
                currentUserInfo.username ? currentUserInfo.username.charAt(0).toUpperCase() : 'U'
              }}
            </div>
            <div class="flex flex-col">
              <span class="truncate text-sm font-bold text-[var(--color-text-body)]">{{
                currentUserInfo.username || '加载中...'
              }}</span>
              <span class="truncate text-xs text-[var(--color-text-tertiary)]">{{
                currentUserInfo.account || '@user'
              }}</span>
            </div>
          </div>
          <svg class="h-4 w-4 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          class="surface-panel absolute bottom-16 left-4 z-[var(--z-popover)] w-[calc(100%-2rem)] overflow-hidden rounded-lg py-1"
        >
          <div
            @click="goToSettings"
            class="interactive-row flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-body)]"
          >
            <AppIcon name="settings" class="h-4 w-4" /> 个人设置
          </div>
          <div class="my-1 h-px bg-[var(--color-popover-border)]"></div>
          <div
            @click="openLogoutModal"
            class="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger-soft)]"
          >
            <AppIcon name="logout" class="h-4 w-4" /> 退出登录
          </div>
        </div>
      </div>

      <div
        v-if="!isCompactViewport"
        class="absolute top-0 right-0 z-[var(--z-resizer)] h-full w-1 cursor-col-resize bg-transparent transition-all hover:bg-[var(--color-primary-soft-2)] active:bg-[var(--color-primary)]"
        @mousedown="startResizeLeft"
      ></div>
    </aside>

    <router-view v-slot="{ Component }">
      <Transition name="content-fade" mode="out-in">
        <component
          :is="Component"
          :key="pageTransitionKey"
          class="flex-1 overflow-y-auto bg-[var(--color-bg-page)]"
          :class="isCompactViewport ? 'pt-14' : ''"
          @refresh-projects="loadProjects"
        />
      </Transition>
    </router-view>

    <AppConfirmDialog
      v-model="showDeleteProjectConfirm"
      variant="danger"
      icon-name="trash"
      :title="deleteProjectConfirmTitle"
      message="相关的任务可能会一并丢失，请确认后再继续。"
      confirm-text="确认删除"
      cancel-text="取消"
      @confirm="confirmDeleteProject"
    />

    <transition name="project-settings-overlay">
      <div
        v-if="showProjectSettingsModal"
        class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center overflow-x-hidden overflow-y-auto px-4 outline-none focus:outline-none"
      >
        <div
          class="project-settings-backdrop fixed inset-0 bg-[var(--color-backdrop-strong)] backdrop-blur-sm"
          @click="closeProjectSettingsModal"
        ></div>

        <div class="project-settings-panel relative z-[var(--z-modal-panel)] mx-auto my-6 w-full max-w-lg transform">
          <div class="surface-panel relative flex w-full flex-col overflow-hidden rounded-2xl border-0 outline-none focus:outline-none">
            <div class="h-1 w-full bg-[var(--color-primary)]"></div>
            <div class="space-y-5 p-5 sm:p-6">
              <div>
                <h3 class="text-lg font-black text-[var(--color-text-primary)]">{{ projectSettingsTitle }}</h3>
                <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
                  配置清单名称、图标和颜色展示。
                </p>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-semibold text-[var(--color-text-body)]">清单名称</label>
                <input
                  ref="projectNameInputRef"
                  v-model="projectSettingsForm.name"
                  type="text"
                  maxlength="100"
                  placeholder="请输入清单名称"
                  class="input-base w-full px-3 py-2 text-sm"
                  @keyup.enter="submitProjectSettings"
                />
              </div>

              <div class="space-y-2">
                <label class="text-sm font-semibold text-[var(--color-text-body)]">图标</label>
                <div class="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  <button
                    type="button"
                    class="flex h-10 items-center justify-center rounded-lg border transition-colors"
                    :class="
                      projectSettingsForm.icon === ''
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                        : 'border-[var(--color-input-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-body)]'
                    "
                    @click="selectProjectIcon('')"
                    title="默认文件夹"
                  >
                    <AppIcon name="folder" class="h-4 w-4" />
                  </button>
                  <button
                    v-for="option in projectIconOptions"
                    :key="option.value"
                    type="button"
                    class="flex h-10 items-center justify-center rounded-lg border transition-colors"
                    :class="
                      projectSettingsForm.icon === option.value
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                        : 'border-[var(--color-input-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-body)]'
                    "
                    :title="option.label"
                    @click="selectProjectIcon(option.value)"
                  >
                    <AppIcon :name="option.icon" class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-semibold text-[var(--color-text-body)]">颜色</label>
                <div class="grid grid-cols-5 gap-2">
                  <button
                    type="button"
                    class="flex h-9 items-center justify-center rounded-lg border text-xs font-medium transition-colors"
                    :class="
                      projectSettingsForm.color === ''
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                        : 'border-[var(--color-input-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-body)]'
                    "
                    @click="selectProjectColor('')"
                  >
                    无
                  </button>
                  <button
                    v-for="option in projectColorOptions"
                    :key="option.value"
                    type="button"
                    class="flex h-9 items-center justify-center rounded-lg border transition-colors"
                    :class="
                      projectSettingsForm.color === option.value
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                        : 'border-[var(--color-input-border)] hover:border-[var(--color-border-strong)]'
                    "
                    :title="option.label"
                    @click="selectProjectColor(option.value)"
                  >
                    <span
                      class="h-4 w-4 rounded-full border border-white/70"
                      :style="{ backgroundColor: option.value }"
                    ></span>
                  </button>
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 pt-1">
                <button
                  class="btn-secondary rounded-xl px-4 py-2"
                  type="button"
                  :disabled="isProjectSettingsSubmitting"
                  @click="closeProjectSettingsModal"
                >
                  取消
                </button>
                <button
                  class="btn-primary rounded-xl px-5 py-2"
                  type="button"
                  :disabled="isProjectSettingsSubmitting"
                  @click="submitProjectSettings"
                >
                  {{ projectSettingsSubmitText }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

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
        class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none"
      >
        <div
          class="fixed inset-0 bg-[var(--color-backdrop-strong)] backdrop-blur-sm transition-opacity"
          @click="showLogoutModal = false"
        ></div>

        <div class="relative w-auto max-w-sm mx-auto my-6 z-[var(--z-modal-panel)] transform transition-all">
          <div
            class="surface-panel relative flex w-full flex-col overflow-hidden rounded-2xl border-0 outline-none focus:outline-none"
          >
            <div class="h-1 w-full bg-[var(--color-danger-strong)]"></div>
            <div class="p-6 pb-0 flex flex-col items-center text-center">
              <div class="danger-soft mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                <AppIcon name="logout" class="h-7 w-7" />
              </div>
              <h3 class="mb-2 text-xl font-black text-[var(--color-text-primary)]">准备离开？</h3>
              <p class="px-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
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
import AppIcon, { type IconName } from '@/components/AppIcon.vue'
import {
  addProjectApi,
  archiveProjectApi,
  deleteProjectApi,
  fetchProjectList,
  reorderProjectApi,
  updateProjectApi,
} from '@/api/project'
import { getUserMeApi, logoutApi } from '@/api/user'
import { useToast } from '@/composables/useToast'
import { useUndoDelete } from '@/composables/useUndoDelete'
import {
  clearSelectedProjectIdCache,
  readSelectedProjectIdCache,
  writeSelectedProjectIdCache,
} from '@/utils/appCache'
import { clearAuthToken } from '@/utils/authToken'
import {
  clearProjectProgressCache,
  readProjectListCache,
  writeProjectListCache,
} from '@/utils/projectCache'
import {
  emitProjectListUpdated,
  offProjectListUpdated,
  onProjectListUpdated,
  type ProjectListUpdatedDetail,
} from '@/utils/projectEvents'
import { removeProjectTaskCaches } from '@/utils/taskCache'

interface Project {
  id: string
  name: string
  icon: string
  color?: string
}

interface CurrentUserInfo {
  username?: string
  account?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const extractListPayload = <T>(payload: unknown): T[] | null => {
  if (Array.isArray(payload)) return payload as T[]
  if (!isRecord(payload)) return null

  if (Array.isArray(payload.records)) return payload.records as T[]
  if (!('data' in payload)) return null

  const nested = payload.data
  if (Array.isArray(nested)) return nested as T[]
  if (isRecord(nested) && Array.isArray(nested.records)) return nested.records as T[]
  return null
}

const extractObjectPayload = <T>(payload: unknown): T | null => {
  if (!isRecord(payload)) return null

  if ('data' in payload && isRecord(payload.data)) {
    return payload.data as T
  }

  return payload as T
}

const USER_INFO_UPDATED_EVENT = 'tick:user-updated'
const PROJECT_LIST_EVENT_SOURCE = 'basic-layout'
const PROJECT_ICON_FALLBACK: IconName = 'folder'

const PROJECT_ICON_COMPAT_MAP: Record<string, IconName> = {
  folder: 'folder',
  '📁': 'folder',
  sparkles: 'sparkles',
  '✨': 'sparkles',
  flag: 'flag',
  '🏁': 'flag',
  star: 'star',
  '⭐': 'star',
  '🌟': 'star',
  book: 'book',
  '📚': 'book',
  target: 'target',
  '🎯': 'target',
  heart: 'heart',
  '❤️': 'heart',
  '❤': 'heart',
  work: 'work',
  '💼': 'work',
  rocket: 'rocket',
  '🚀': 'rocket',
}

const projectIconOptions: Array<{ value: string; label: string; icon: IconName }> = [
  { value: 'sparkles', label: '灵感', icon: 'sparkles' },
  { value: 'flag', label: '阶段', icon: 'flag' },
  { value: 'book', label: '学习', icon: 'book' },
  { value: 'target', label: '目标', icon: 'target' },
  { value: 'star', label: '重点', icon: 'star' },
  { value: 'heart', label: '兴趣', icon: 'heart' },
  { value: 'work', label: '工作', icon: 'work' },
  { value: 'rocket', label: '冲刺', icon: 'rocket' },
]

const projectColorOptions: Array<{ value: string; label: string }> = [
  { value: '#2563EB', label: '蓝色' },
  { value: '#10B981', label: '绿色' },
  { value: '#F59E0B', label: '橙色' },
  { value: '#EF4444', label: '红色' },
  { value: '#8B5CF6', label: '紫色' },
  { value: '#EC4899', label: '粉色' },
  { value: '#14B8A6', label: '青绿' },
  { value: '#6B7280', label: '灰色' },
]

const router = useRouter()
const route = useRoute()
const toast = useToast()
const undoDelete = useUndoDelete()

const projectList = ref<Project[]>([])
const isUserMenuOpen = ref(false)
const showLogoutModal = ref(false)
const showDeleteProjectConfirm = ref(false)
const pendingDeleteProject = ref<{ id: string; name: string } | null>(null)
const activeProjectActionId = ref('')
const showProjectSettingsModal = ref(false)
const projectSettingsMode = ref<'create' | 'update'>('create')
const projectSettingsProjectId = ref('')
const pendingProjectDeleteIds = new Set<string>()
const projectSettingsForm = ref({
  name: '',
  icon: '',
  color: '',
})
const isProjectSettingsSubmitting = ref(false)
const projectNameInputRef = ref<HTMLInputElement | null>(null)
const currentUserInfo = ref<CurrentUserInfo>({})
const sidebarWidth = ref(Number(localStorage.getItem('tick_sidebarWidth')) || 256)
const isResizingLeft = ref(false)
const viewportWidth = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)
const isSidebarOpen = ref(false)

const isCompactViewport = computed(() => viewportWidth.value < 1024)
const isTodayRoute = computed(() => route.path === '/tasks' && route.query.view === 'today')
const isWeekRoute = computed(() => route.path === '/tasks' && route.query.view === 'week')
const pageTransitionKey = computed(() => route.path)
const sidebarStyle = computed(() =>
  isCompactViewport.value ? undefined : { width: `${sidebarWidth.value}px` },
)
const projectSettingsTitle = computed(() =>
  projectSettingsMode.value === 'create' ? '创建清单' : '自定义清单',
)
const projectSettingsSubmitText = computed(() =>
  projectSettingsMode.value === 'create' ? '创建' : '保存',
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

const normalizeProjectColorValue = (color?: string | null) => {
  if (!color) return ''
  const normalized = color.trim()
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized : ''
}

const normalizeProjectIconValue = (icon?: string | null) => {
  if (!icon) return ''
  const mapped = PROJECT_ICON_COMPAT_MAP[icon] || null
  if (!mapped || mapped === PROJECT_ICON_FALLBACK) return ''
  return mapped
}

const getProjectIconName = (icon: string | undefined): IconName => {
  return PROJECT_ICON_COMPAT_MAP[icon || ''] || PROJECT_ICON_FALLBACK
}

const getProjectColor = (color?: string | null) => {
  return normalizeProjectColorValue(color)
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

const syncProjectListCache = () => {
  writeProjectListCache(0, projectList.value)
}

const filterPendingDeletedProjects = (records: Project[]) =>
  records.filter((item) => !pendingProjectDeleteIds.has(item.id))

const toggleProjectActionMenu = (projectId: string) => {
  activeProjectActionId.value = activeProjectActionId.value === projectId ? '' : projectId
}

const ACTION_MENU_GAP_PX = 4
const ACTION_MENU_VIEWPORT_PADDING_PX = 8
const ACTION_MENU_MIN_VISIBLE_HEIGHT_PX = 120
const ACTION_MENU_PREFER_DOWN_MIN_SPACE_PX = 180

const getActionMenuStyle = (projectId: string): Record<string, string> => {
  const el = document.querySelector(`[data-project-action-root][data-project-id="${projectId}"]`)
  if (!el) return { display: 'none' }

  const rect = el.getBoundingClientRect()
  const right = Math.max(ACTION_MENU_VIEWPORT_PADDING_PX, window.innerWidth - rect.right)
  const availableBelow = window.innerHeight - rect.bottom - ACTION_MENU_VIEWPORT_PADDING_PX
  const availableAbove = rect.top - ACTION_MENU_VIEWPORT_PADDING_PX

  const openUpward =
    availableBelow < ACTION_MENU_PREFER_DOWN_MIN_SPACE_PX && availableAbove > availableBelow

  const availableHeight = Math.max(
    ACTION_MENU_MIN_VISIBLE_HEIGHT_PX,
    (openUpward ? availableAbove : availableBelow) - ACTION_MENU_GAP_PX,
  )

  if (openUpward) {
    const bottom = Math.max(
      ACTION_MENU_VIEWPORT_PADDING_PX,
      window.innerHeight - rect.top + ACTION_MENU_GAP_PX,
    )
    return {
      position: 'fixed',
      right: `${right}px`,
      bottom: `${bottom}px`,
      maxHeight: `${availableHeight}px`,
      overflowY: 'auto',
    }
  }

  const maxTop = window.innerHeight - ACTION_MENU_VIEWPORT_PADDING_PX - ACTION_MENU_MIN_VISIBLE_HEIGHT_PX
  const top = Math.max(
    ACTION_MENU_VIEWPORT_PADDING_PX,
    Math.min(rect.bottom + ACTION_MENU_GAP_PX, maxTop),
  )

  return {
    position: 'fixed',
    right: `${right}px`,
    top: `${top}px`,
    maxHeight: `${availableHeight}px`,
    overflowY: 'auto',
  }
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

const navigateToToday = async () => {
  await router.push({ path: '/tasks', query: { view: 'today' } })
  closeSidebar()
}

const navigateToWeek = async () => {
  await router.push({ path: '/tasks', query: { view: 'week' } })
  closeSidebar()
}

const handleProjectRowClick = async (id: string) => {
  await selectProject(id)
}

const resetProjectSettingsForm = () => {
  projectSettingsForm.value = {
    name: '',
    icon: '',
    color: '',
  }
}

const closeProjectSettingsModal = () => {
  if (isProjectSettingsSubmitting.value) return
  showProjectSettingsModal.value = false
  projectSettingsProjectId.value = ''
  resetProjectSettingsForm()
}

const openProjectSettings = async (project: Project) => {
  projectSettingsMode.value = 'update'
  projectSettingsProjectId.value = project.id
  projectSettingsForm.value = {
    name: project.name || '',
    icon: normalizeProjectIconValue(project.icon),
    color: normalizeProjectColorValue(project.color),
  }
  closeProjectActionMenu()
  await nextTick()
  showProjectSettingsModal.value = true
  await nextTick()
  projectNameInputRef.value?.focus()
  projectNameInputRef.value?.select()
}

const openCreateProjectSettings = async () => {
  projectSettingsMode.value = 'create'
  projectSettingsProjectId.value = ''
  resetProjectSettingsForm()
  closeProjectActionMenu()
  showProjectSettingsModal.value = true
  if (isCompactViewport.value) {
    isSidebarOpen.value = true
  }
  await nextTick()
  projectNameInputRef.value?.focus()
}

const selectProjectIcon = (icon: string) => {
  projectSettingsForm.value.icon = icon
}

const selectProjectColor = (color: string) => {
  projectSettingsForm.value.color = color
}

const resolveProjectId = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number') {
    const normalized = String(value).trim()
    return normalized && normalized !== 'true' ? normalized : ''
  }

  if (!isRecord(value)) return ''
  const idCandidates = [value.id, value.projectId]
  for (const candidate of idCandidates) {
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      const normalized = String(candidate).trim()
      if (normalized && normalized !== 'true') return normalized
    }
  }

  return ''
}

const pinProjectToTop = async (projectId: string) => {
  await loadProjects()

  const ids = projectList.value.map((item) => item.id)
  if (!ids.includes(projectId)) return

  const reorderedIds = [projectId, ...ids.filter((id) => id !== projectId)]
  await reorderProjectApi(
    reorderedIds.map((id, index) => ({
      id,
      orderNo: index,
    })),
  )

  await loadProjects()
}

const submitProjectSettings = async () => {
  const name = projectSettingsForm.value.name.trim()
  if (!name) {
    toast.warning('清单名称不能为空。')
    return
  }

  const normalizedIcon = projectSettingsForm.value.icon || ''
  const normalizedColor = normalizeProjectColorValue(projectSettingsForm.value.color)

  isProjectSettingsSubmitting.value = true
  try {
    if (projectSettingsMode.value === 'create') {
      const created = await addProjectApi({
        name,
        icon: normalizedIcon,
        color: normalizedColor,
      })
      const newProjectId = resolveProjectId(created)

      if (newProjectId) {
        try {
          await pinProjectToTop(newProjectId)
        } catch (error) {
          console.error('新建清单置顶失败', error)
          await loadProjects()
          toast.warning('清单已创建，但置顶失败。')
        }
      } else {
        await loadProjects()
      }
    } else {
      const id = projectSettingsProjectId.value
      if (!id) return
      await updateProjectApi({
        id,
        name,
        icon: normalizedIcon,
        color: normalizedColor,
      })
      await loadProjects()
    }

    showProjectSettingsModal.value = false
    projectSettingsProjectId.value = ''
    resetProjectSettingsForm()
    emitProjectListUpdated(PROJECT_LIST_EVENT_SOURCE)
  } catch {
    toast.error(projectSettingsMode.value === 'create' ? '创建清单失败，请检查网络后重试。' : '保存清单设置失败，请检查网络后重试。')
  } finally {
    isProjectSettingsSubmitting.value = false
  }
}

const archiveProject = async (id: string) => {
  closeProjectActionMenu()
  try {
    await archiveProjectApi([id])
    toast.success('清单已归档。')
    await loadProjects()
    emitProjectListUpdated(PROJECT_LIST_EVENT_SOURCE)
  } catch {
    toast.error('归档失败，请重试。')
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
    emitProjectListUpdated(PROJECT_LIST_EVENT_SOURCE)
  } catch {
    projectList.value = snapshot
    toast.error('调整清单顺序失败，请检查网络后重试。')
  }
}

const handleDocumentPointerDown = (event: PointerEvent) => {
  const target = event.target as HTMLElement | null
  if (!target || !activeProjectActionId.value) return

  const rootSelector = `[data-project-action-root][data-project-id="${activeProjectActionId.value}"]`
  const menuSelector = `[data-project-action-menu][data-project-id="${activeProjectActionId.value}"]`
  if (!target.closest(rootSelector) && !target.closest(menuSelector)) {
    closeProjectActionMenu()
  }
}

const handleProjectListUpdated: EventListener = (event) => {
  const customEvent = event as CustomEvent<ProjectListUpdatedDetail>
  if (customEvent.detail?.source === PROJECT_LIST_EVENT_SOURCE) return
  void loadProjects()
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
  return readSelectedProjectIdCache()
})

const deleteProjectConfirmTitle = computed(() => {
  if (!pendingDeleteProject.value) return '确认删除清单？'
  return `确认删除清单“${pendingDeleteProject.value.name}”？`
})

const loadUserInfo = async () => {
  try {
    const res = await getUserMeApi()
    const parsed = extractObjectPayload<CurrentUserInfo>(res)
    currentUserInfo.value = parsed || {}
  } catch (error) {
    console.error('获取用户信息失败', error)
  }
}

const handleUserInfoUpdated = (event: Event) => {
  const customEvent = event as CustomEvent<CurrentUserInfo>
  const nextUserInfo = customEvent.detail
  if (!nextUserInfo || typeof nextUserInfo !== 'object') return
  currentUserInfo.value = { ...currentUserInfo.value, ...nextUserInfo }
}

const ensureDefaultProject = async () => {
  if (selectedProjectId.value || projectList.value.length === 0) return

  const firstProject = projectList.value[0]
  if (!firstProject) return
  const firstProjectId = firstProject.id
  writeSelectedProjectIdCache(firstProjectId)

  if (route.path === '/tasks') {
    const view = typeof route.query.view === 'string' ? route.query.view : ''
    if (view === 'today' || view === 'week') {
      return
    }
    await router.replace({
      path: '/tasks',
      query: { ...route.query, projectId: firstProjectId },
    })
  }
}

const loadProjects = async () => {
  const cachedRecords = readProjectListCache<Project>(0)
  if (cachedRecords && cachedRecords.length > 0) {
    projectList.value = filterPendingDeletedProjects(cachedRecords)
    await ensureDefaultProject()
  }

  try {
    const res = await fetchProjectList({ status: 0 })
    const records = extractListPayload<Project>(res)
    if (!records) {
      console.error('加载项目失败：响应结构异常', res)
      return
    }
    projectList.value = filterPendingDeletedProjects(records)
    syncProjectListCache()

    if (activeProjectActionId.value && !projectList.value.some((item) => item.id === activeProjectActionId.value)) {
      closeProjectActionMenu()
    }

    await ensureDefaultProject()
  } catch (error) {
    if (!cachedRecords) {
      console.error('加载项目失败', error)
    }
  }
}

const selectProject = async (id: string) => {
  closeProjectActionMenu()
  writeSelectedProjectIdCache(id)
  await router.push({ path: '/tasks', query: { projectId: id } })
  closeSidebar()
}

const openAddProjectInput = () => {
  void openCreateProjectSettings()
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

  pendingProjectDeleteIds.add(id)
  const wasSelected = selectedProjectId.value === id
  projectList.value = snapshot.filter((item) => item.id !== id)
  syncProjectListCache()

  if (wasSelected) {
    clearSelectedProjectIdCache()
    await router.push('/tasks')
  }

  undoDelete.scheduleUndoDelete({
    label: `清单「${name}」`,
    pendingMessage: `清单「${name}」已移除，5 秒内可撤销。`,
    onCommit: async () => {
      await deleteProjectApi(id)
    },
    onCommitSuccess: async () => {
      pendingProjectDeleteIds.delete(id)
      removeProjectTaskCaches(id)
      clearProjectProgressCache(id)
      syncProjectListCache()
      emitProjectListUpdated(PROJECT_LIST_EVENT_SOURCE)
    },
    onRollback: async () => {
      pendingProjectDeleteIds.delete(id)
      if (!projectList.value.some((item) => item.id === id)) {
        const next = [...projectList.value]
        const insertIndex = removedIndex >= 0 && removedIndex <= next.length ? removedIndex : next.length
        next.splice(insertIndex, 0, removedProject)
        projectList.value = next
      }
      syncProjectListCache()

      if (wasSelected) {
        writeSelectedProjectIdCache(id)
        if (route.path === '/tasks') {
          await router.push({ path: '/tasks', query: { projectId: id } })
        }
      }
      emitProjectListUpdated(PROJECT_LIST_EVENT_SOURCE)
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
  clearAuthToken()
  router.push('/login')
}

watch(
  () => route.fullPath,
  () => {
    isUserMenuOpen.value = false
    closeProjectActionMenu()
    showProjectSettingsModal.value = false
    projectSettingsProjectId.value = ''
    resetProjectSettingsForm()
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
  onProjectListUpdated(handleProjectListUpdated)
  window.addEventListener('resize', updateViewport)
  window.addEventListener(USER_INFO_UPDATED_EVENT, handleUserInfoUpdated as EventListener)
})

onBeforeUnmount(() => {
  stopResizeLeft()
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  offProjectListUpdated(handleProjectListUpdated)
  window.removeEventListener('resize', updateViewport)
  window.removeEventListener(USER_INFO_UPDATED_EVENT, handleUserInfoUpdated as EventListener)
})
</script>

<style scoped>
.project-settings-backdrop {
  transition: opacity 220ms var(--ease-standard);
}

.project-settings-panel {
  transition:
    opacity 260ms var(--ease-emphasized),
    transform 260ms var(--ease-emphasized);
  transform-origin: center;
}

.project-settings-overlay-enter-from .project-settings-backdrop,
.project-settings-overlay-leave-to .project-settings-backdrop {
  opacity: 0;
}

.project-settings-overlay-enter-from .project-settings-panel,
.project-settings-overlay-leave-to .project-settings-panel {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}
</style>
