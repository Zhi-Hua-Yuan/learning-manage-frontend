<template>
  <div class="relative flex min-h-full flex-1 bg-gray-50">
    <main class="flex min-w-0 flex-1 flex-col bg-gray-50">
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-5"
      >
        <span class="text-lg font-semibold text-gray-900 sm:text-xl">
          {{ projectList.find((p) => p.id === selectedProjectId)?.icon }}
          {{ projectList.find((p) => p.id === selectedProjectId)?.name || '请选择清单' }}
        </span>

        <div
          v-if="selectedProjectId && taskList.length > 0"
          class="flex w-full items-center gap-3 sm:w-56"
        >
          <span class="mono text-xs text-gray-500">完成度 {{ projectProgress }}%</span>
          <div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              class="h-full bg-emerald-500 transition-all duration-500"
              :style="{ width: projectProgress + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <div class="border-b border-gray-200 px-4 py-3 sm:px-5">
        <div class="card-base flex flex-col gap-2 bg-white p-3 sm:flex-row sm:items-center">
          <div class="flex min-w-0 flex-1 items-center">
            <span class="mr-2 text-lg font-bold text-gray-400">+</span>
            <input
              v-model="newTaskTitle"
              @keyup.enter="addTask"
              type="text"
              placeholder="输入任务标题，按回车保存"
              class="w-full min-w-0 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>

          <select
            v-model="newTaskMilestoneId"
            class="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-400"
          >
            <option value="">默认列表</option>
            <option v-for="m in milestoneList" :key="m.id" :value="m.id">阶段：{{ m.name }}</option>
          </select>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-3 sm:p-4">
        <div class="space-y-4">
          <section v-if="groupedTasks.unassigned.length > 0" class="space-y-2">
            <h3 class="px-1 text-xs font-semibold tracking-wide text-gray-500">默认列表</h3>
            <div class="space-y-2">
              <div
                v-for="task in groupedTasks.unassigned"
                :key="task.id"
                @click="selectTask(task)"
                class="card-base group flex cursor-pointer items-center gap-3 bg-white px-3 py-3"
                :class="
                  selectedTask?.id === task.id
                    ? 'bg-gray-100 ring-2 ring-blue-200 ring-offset-1 ring-offset-gray-50'
                    : ''
                "
                :style="{ borderColor: getTaskItemBorderColor(task.priority) }"
              >
                <div
                  class="flex h-5 w-5 items-center justify-center rounded border transition-colors"
                  :class="
                    task.status === 2
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-gray-300 group-hover:border-gray-500'
                  "
                  @click.stop="toggleTaskStatus(task)"
                >
                  <svg
                    v-if="task.status === 2"
                    class="h-3 w-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </div>

                <span
                  class="min-w-0 flex-1 text-sm transition-colors"
                  :class="task.status === 2 ? 'text-gray-400 line-through' : 'text-gray-800'"
                >
                  {{ task.title }}
                </span>

                <span
                  class="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium"
                  :class="getPriorityOption(task.priority).textClass"
                >
                  <span class="priority-dot" :class="getPriorityOption(task.priority).dotClass"></span>
                  {{ getPriorityOption(task.priority).text }}
                </span>
              </div>
            </div>
          </section>

          <section
            v-for="group in groupedTasks.milestones"
            :key="group.milestone.id"
            class="card-base space-y-3 bg-white p-3 sm:p-4"
          >
            <div class="group relative flex flex-wrap items-center justify-between gap-3">
              <div
                v-if="editingMilestoneId === group.milestone.id"
                class="flex min-w-0 flex-1 items-center gap-2"
              >
                <span class="text-gray-500">🚩</span>
                <input
                  v-model="editMilestoneName"
                  @keyup.enter="saveMilestone(group.milestone)"
                  @blur="saveMilestone(group.milestone)"
                  v-focus
                  type="text"
                  class="w-full rounded border border-blue-400 px-2 py-1 text-sm font-semibold text-gray-800 outline-none"
                />
              </div>

              <h3 v-else class="flex min-w-0 flex-1 items-center gap-2 text-base font-semibold text-gray-800">
                <span class="text-gray-500">🚩</span>
                <span class="truncate">{{ group.milestone.name }}</span>

                <div
                  class="ml-1 flex items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                >
                  <button
                    @click="startEditMilestone(group.milestone)"
                    class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    title="重命名"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      ></path>
                    </svg>
                  </button>
                  <button
                    @click="requestDeleteMilestone(group.milestone.id, group.milestone.name)"
                    class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                    title="删除阶段"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                  </button>
                </div>
              </h3>

              <div class="flex w-full items-center gap-2 sm:w-28">
                <span class="mono text-xs text-gray-500">{{ group.progress }}%</span>
                <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <div
                    class="h-full bg-blue-400 transition-all duration-500"
                    :style="{ width: group.progress + '%' }"
                  ></div>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <div
                v-if="group.tasks.length === 0"
                class="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-sm text-gray-500"
              >
                该阶段暂无任务
              </div>

              <div
                v-for="task in group.tasks"
                :key="task.id"
                @click="selectTask(task)"
                class="card-base group flex cursor-pointer items-center gap-3 bg-white px-3 py-3"
                :class="
                  selectedTask?.id === task.id
                    ? 'bg-gray-100 ring-2 ring-blue-200 ring-offset-1 ring-offset-gray-50'
                    : ''
                "
                :style="{ borderColor: getTaskItemBorderColor(task.priority) }"
              >
                <div
                  class="flex h-5 w-5 items-center justify-center rounded border transition-colors"
                  :class="
                    task.status === 2
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-gray-300 group-hover:border-gray-500'
                  "
                  @click.stop="toggleTaskStatus(task)"
                >
                  <svg
                    v-if="task.status === 2"
                    class="h-3 w-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </div>

                <span
                  class="min-w-0 flex-1 text-sm transition-colors"
                  :class="task.status === 2 ? 'text-gray-400 line-through' : 'text-gray-800'"
                >
                  {{ task.title }}
                </span>

                <span
                  class="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium"
                  :class="getPriorityOption(task.priority).textClass"
                >
                  <span class="priority-dot" :class="getPriorityOption(task.priority).dotClass"></span>
                  {{ getPriorityOption(task.priority).text }}
                </span>
              </div>
            </div>
          </section>

          <div class="pt-1">
            <div v-if="isAddingMilestone" class="card-base border-gray-400 bg-white p-1">
              <input
                v-model="newMilestoneName"
                @keyup.enter="submitNewMilestone"
                @blur="isAddingMilestone = false"
                autofocus
                type="text"
                placeholder="输入阶段名称，按回车保存"
                class="w-full bg-transparent px-3 py-2 text-sm text-gray-700 outline-none"
              />
            </div>

            <button
              v-else
              @click="openAddMilestoneInput"
              class="card-base w-full border-dashed border-gray-300 bg-[#f7f7f5] py-3 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-[#ecece8]"
            >
              + 添加阶段
            </button>
          </div>
        </div>
      </div>
    </main>

    <div
      v-if="!isMobile"
      class="-ml-1 z-20 w-1 cursor-col-resize bg-transparent transition-all hover:w-1.5 hover:bg-gray-400"
      @mousedown="startResizeRight"
    ></div>

    <aside
      v-if="selectedTask || !isMobile"
      class="z-30 flex flex-col bg-white"
      :class="isMobile ? 'fixed inset-0 w-full border-l-0' : 'border-l border-gray-200 shadow-sm'"
      :style="isMobile ? undefined : { width: detailWidth + 'px' }"
    >
      <template v-if="selectedTask">
        <div class="flex items-center justify-between border-b border-gray-100 p-4 text-gray-600">
          <div class="flex items-center gap-2">
            <button
              v-if="isMobile"
              @click="closeDetail"
              class="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              title="返回列表"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span class="text-sm font-semibold">任务详情</span>
          </div>

          <div class="flex items-center gap-1">
            <button
              @click="requestDeleteTask"
              class="rounded p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
              title="删除任务"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                ></path>
              </svg>
            </button>

            <button
              @click="closeDetail"
              class="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
              title="关闭详情"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 space-y-4 overflow-y-auto p-4">
          <input
            v-model="selectedTask.title"
            @blur="onTextBlur"
            type="text"
            class="w-full bg-transparent text-xl font-bold text-gray-800 outline-none placeholder:text-gray-300"
            placeholder="输入任务标题"
          />

          <div
            ref="priorityRowRef"
            class="relative flex cursor-pointer items-center gap-3 border-y border-gray-100 py-3"
            @click="togglePriorityMenuFromRow"
          >
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-1 6-1 1H11.5l-1-1H5v12"
              ></path>
            </svg>
            <label class="w-20 text-sm font-medium text-gray-600">优先级</label>

            <button
              type="button"
              @click.stop="togglePriorityMenu"
              class="flex items-center gap-2 px-1 py-1"
            >
              <span class="priority-dot" :class="currentPriorityObj.dotClass"></span>
              <span class="text-sm font-medium" :class="currentPriorityObj.textClass">
                {{ currentPriorityObj.text }}
              </span>
            </button>

            <div
              v-if="isPriorityMenuOpen"
              @click.stop
              class="absolute left-24 top-12 z-20 w-40 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg"
            >
              <button
                v-for="option in priorityOptions"
                :key="option.value"
                @click="selectPriority(option.value)"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span class="priority-dot" :class="option.dotClass"></span>
                <span class="font-medium" :class="option.textClass">{{ option.text }}</span>
                <svg
                  v-if="selectedTask.priority === option.value"
                  class="ml-auto h-4 w-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </button>
            </div>
          </div>

          <div
            ref="dueDateRowRef"
            class="flex cursor-pointer items-center gap-3 border-b border-gray-100 py-3"
            @click="openDueDatePicker"
          >
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
            <label class="w-20 text-sm font-medium text-gray-600">截止日期</label>

            <div class="relative flex min-w-0 flex-1 items-center justify-between gap-2 pr-1 text-sm">
              <span class="truncate" :class="selectedTask.dueDate ? 'text-gray-700' : 'text-gray-400'">
                {{ selectedTask.dueDate || '设置截止日期' }}
              </span>
              <svg
                class="pointer-events-none h-4 w-4 shrink-0 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                ></path>
              </svg>
              <input
                ref="dueDateInputRef"
                type="date"
                tabindex="-1"
                :value="selectedTask.dueDate || ''"
                @change="onDueDateChange"
                @focus="onDueDateFocus"
                @blur="onDueDateBlur"
                class="pointer-events-none absolute h-0 w-0 opacity-0"
              />
            </div>
          </div>

          <div
            class="relative flex cursor-pointer items-center gap-3 border-b border-gray-100 py-3"
          >
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              ></path>
            </svg>
            <label class="w-20 text-sm font-medium text-gray-600">所属阶段</label>

            <div class="flex min-w-0 flex-1 items-center justify-between text-sm text-gray-700">
              <span class="truncate">{{ currentMilestoneLabel }}</span>
              <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>

            <select
              :value="selectedTask.milestoneId || ''"
              @change="onMilestoneChange"
              class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            >
              <option value="">默认列表（未分配）</option>
              <option v-for="m in milestoneList" :key="m.id" :value="m.id">🚩 {{ m.name }}</option>
            </select>
          </div>

          <textarea
            v-model="selectedTask.description"
            @blur="onTextBlur"
            class="min-h-[140px] w-full resize-none rounded-lg border border-gray-200 bg-[#f7f7f5] p-3 text-sm text-gray-700 outline-none transition-all focus:border-blue-300 focus:bg-white"
            placeholder="补充任务说明"
          ></textarea>
        </div>
      </template>

      <template v-else>
        <div class="flex h-full flex-col items-center justify-center px-4 text-gray-400">
          <svg class="mb-4 h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            ></path>
          </svg>
          <p class="text-sm">请选择任务查看详情</p>
        </div>
      </template>
    </aside>

    <AppConfirmDialog
      v-model="showDeleteTaskConfirm"
      variant="danger"
      icon="🗑️"
      :title="deleteTaskConfirmTitle"
      message="删除后可在 5 秒内撤销。"
      confirm-text="确认删除"
      cancel-text="取消"
      @confirm="confirmDeleteTask"
    />

    <AppConfirmDialog
      v-model="showDeleteMilestoneConfirm"
      variant="danger"
      icon="🗑️"
      :title="deleteMilestoneConfirmTitle"
      message="该阶段下的任务不会被删除，但会变回未分配状态。"
      confirm-text="确认删除"
      cancel-text="取消"
      @confirm="confirmDeleteMilestone"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import { fetchProjectList } from '@/api/project'
import { addTaskApi, deleteTaskApi, fetchTaskList, updateTaskApi } from '@/api/task'
import {
  addMilestoneApi,
  deleteMilestoneApi,
  fetchMilestoneList,
  updateMilestoneApi,
} from '@/api/milestone'
import { useToast } from '@/composables/useToast'
import { useUndoDelete } from '@/composables/useUndoDelete'

interface Task {
  id: string
  title: string
  description?: string
  status: number
  priority: number
  projectId: string
  dueDate?: string | null
  milestoneId?: string | null
}

interface Milestone {
  id: string
  name: string
  projectId: string
  orderNo: number
  status: number
}

interface Project {
  id: string
  name: string
  icon: string
}

interface PriorityOption {
  value: number
  text: string
  dotClass: string
  textClass: string
}

const route = useRoute()
const router = useRouter()
const toast = useToast()
const undoDelete = useUndoDelete()

const projectList = ref<Project[]>([])
const taskList = ref<Task[]>([])
const selectedTask = ref<Task | null>(null)
const milestoneList = ref<Milestone[]>([])
const selectedProjectId = ref('')

const newTaskTitle = ref('')
const newTaskMilestoneId = ref('')
const isAddingMilestone = ref(false)
const newMilestoneName = ref('')
const editingMilestoneId = ref('')
const editMilestoneName = ref('')

const isPriorityMenuOpen = ref(false)
const isDueDatePickerOpen = ref(false)
const showDeleteTaskConfirm = ref(false)
const showDeleteMilestoneConfirm = ref(false)
const pendingDeleteTask = ref<Task | null>(null)
const pendingDeleteMilestone = ref<{ id: string; name: string } | null>(null)
const priorityRowRef = ref<HTMLElement | null>(null)
const dueDateRowRef = ref<HTMLElement | null>(null)
const dueDateInputRef = ref<HTMLInputElement | null>(null)
const detailWidth = ref(Number(localStorage.getItem('tick_detailWidth')) || 340)
const isResizingRight = ref(false)
const viewportWidth = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)

const isMobile = computed(() => viewportWidth.value < 768)

const priorityOptions: PriorityOption[] = [
  { value: 3, text: '高', dotClass: 'priority-dot--urgent', textClass: 'priority-text--urgent' },
  { value: 2, text: '中', dotClass: 'priority-dot--high', textClass: 'priority-text--high' },
  { value: 1, text: '低', dotClass: 'priority-dot--low', textClass: 'priority-text--low' },
  { value: 0, text: '无', dotClass: 'priority-dot--medium', textClass: 'priority-text--medium' },
]

const getPriorityOption = (priority: number) =>
  priorityOptions.find((option) => option.value === priority) || priorityOptions[priorityOptions.length - 1]!

const taskItemPriorityBorderColorMap: Record<number, string> = {
  3: 'var(--color-danger)',
  2: 'var(--color-warning)',
  1: 'var(--color-success)',
  0: 'var(--color-text-primary)',
}

const getTaskItemBorderColor = (priority: number) =>
  taskItemPriorityBorderColorMap[priority] || taskItemPriorityBorderColorMap[0]

const updateViewport = () => {
  viewportWidth.value = window.innerWidth
}

const startResizeRight = () => {
  if (isMobile.value) return
  isResizingRight.value = true
  document.addEventListener('mousemove', handleMouseMoveRight)
  document.addEventListener('mouseup', stopResizeRight)
  document.body.style.userSelect = 'none'
}

const handleMouseMoveRight = (e: MouseEvent) => {
  if (!isResizingRight.value || isMobile.value) return
  const newWidth = document.body.clientWidth - e.clientX
  if (newWidth > 260 && newWidth < 640) {
    detailWidth.value = newWidth
  }
}

const stopResizeRight = () => {
  isResizingRight.value = false
  document.removeEventListener('mousemove', handleMouseMoveRight)
  document.removeEventListener('mouseup', stopResizeRight)
  document.body.style.userSelect = ''
  localStorage.setItem('tick_detailWidth', detailWidth.value.toString())
}

const vFocus = {
  mounted(el: HTMLElement) {
    el.focus()
  },
}

const syncSelectedProject = () => {
  const queryId = route.query.projectId
  if (typeof queryId === 'string' && queryId) {
    selectedProjectId.value = queryId
    localStorage.setItem('tick_selectedProjectId', queryId)
    return
  }

  selectedProjectId.value = localStorage.getItem('tick_selectedProjectId') || ''
}

const loadProjects = async () => {
  try {
    const res = await fetchProjectList()
    const records = (res as unknown as { records?: Project[] })?.records
    projectList.value = records || []

    if (!selectedProjectId.value && projectList.value.length > 0) {
      const firstProject = projectList.value[0]
      if (!firstProject) return
      const firstId = firstProject.id
      selectedProjectId.value = firstId
      localStorage.setItem('tick_selectedProjectId', firstId)
      await router.replace({ path: '/tasks', query: { projectId: firstId } })
    }
  } catch (error) {
    console.error('加载项目失败', error)
  }
}

const loadTasks = async () => {
  if (!selectedProjectId.value) {
    taskList.value = []
    selectedTask.value = null
    return
  }

  try {
    const res = await fetchTaskList({
      projectId: selectedProjectId.value,
      current: 1,
      size: 100,
    })
    const records = (res as unknown as { records?: Task[] })?.records
    taskList.value = records || []

    if (selectedTask.value) {
      selectedTask.value = taskList.value.find((task) => task.id === selectedTask.value?.id) || null
    }
  } catch (error) {
    console.error('加载任务失败', error)
  }
}

const loadMilestones = async () => {
  if (!selectedProjectId.value) {
    milestoneList.value = []
    return
  }

  try {
    const res = await fetchMilestoneList({ projectId: selectedProjectId.value })
    const milestones = Array.isArray(res) ? (res as Milestone[]) : []
    milestoneList.value = milestones.sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
  } catch (error) {
    console.error('加载里程碑失败', error)
  }
}

const addTask = async () => {
  if (!newTaskTitle.value.trim() || !selectedProjectId.value) return

  try {
    await addTaskApi({
      title: newTaskTitle.value.trim(),
      projectId: selectedProjectId.value,
      priority: 0,
      milestoneId: newTaskMilestoneId.value || undefined,
    })
    newTaskTitle.value = ''
    await loadTasks()
  } catch {
    toast.error('添加任务失败，请检查网络后重试。')
  }
}

const toggleTaskStatus = async (task: Task) => {
  const oldStatus = task.status
  const newStatus = oldStatus === 2 ? 0 : 2

  try {
    task.status = newStatus
    await updateTaskApi({ ...task, status: newStatus })
  } catch {
    task.status = oldStatus
    toast.error('更新状态失败，请检查网络后重试。')
  }
}

const selectTask = (task: Task) => {
  selectedTask.value = task
  isPriorityMenuOpen.value = false
  isDueDatePickerOpen.value = false
}

const closeDetail = () => {
  closeDueDatePicker()
  selectedTask.value = null
  isPriorityMenuOpen.value = false
}

const currentPriorityObj = computed(() => {
  if (!selectedTask.value) return priorityOptions[priorityOptions.length - 1]!
  return getPriorityOption(selectedTask.value.priority)
})

const currentMilestoneLabel = computed(() => {
  const milestoneId = selectedTask.value?.milestoneId
  if (!milestoneId || String(milestoneId) === '0') return '默认列表（未分配）'

  const milestone = milestoneList.value.find((item) => item.id === String(milestoneId))
  if (!milestone) return '默认列表（未分配）'

  return `🚩 ${milestone.name}`
})

const deleteTaskConfirmTitle = computed(() => {
  if (!pendingDeleteTask.value) return '确认删除任务？'
  return `确认删除任务“${pendingDeleteTask.value.title}”？`
})

const deleteMilestoneConfirmTitle = computed(() => {
  if (!pendingDeleteMilestone.value) return '确认删除阶段？'
  return `确认删除阶段“${pendingDeleteMilestone.value.name}”？`
})

const togglePriorityMenuFromRow = () => {
  isPriorityMenuOpen.value = !isPriorityMenuOpen.value
}

const togglePriorityMenu = () => {
  isPriorityMenuOpen.value = !isPriorityMenuOpen.value
}

const closeDueDatePicker = () => {
  isDueDatePickerOpen.value = false
  dueDateInputRef.value?.blur()
}

const openDueDatePicker = () => {
  const input = dueDateInputRef.value
  if (!input) return

  if (isDueDatePickerOpen.value) {
    closeDueDatePicker()
    return
  }

  isDueDatePickerOpen.value = true

  const openNativePickerByClick = () => {
    input.focus()
    input.click()
  }

  const inputWithPicker = input as HTMLInputElement & { showPicker?: () => void }
  if (typeof inputWithPicker.showPicker === 'function') {
    try {
      inputWithPicker.showPicker()
      return
    } catch {
      // no-op and fallback to native click
    }
  }

  openNativePickerByClick()
}

const onDueDateFocus = () => {
  isDueDatePickerOpen.value = true
}

const onDueDateBlur = () => {
  isDueDatePickerOpen.value = false
}

const handleDocumentPointerDown = (event: PointerEvent) => {
  const targetNode = event.target as Node | null
  if (!targetNode) return

  if (isPriorityMenuOpen.value && priorityRowRef.value && !priorityRowRef.value.contains(targetNode)) {
    isPriorityMenuOpen.value = false
  }

  if (isDueDatePickerOpen.value && dueDateRowRef.value && !dueDateRowRef.value.contains(targetNode)) {
    closeDueDatePicker()
  }
}

const selectPriority = async (val: number) => {
  if (!selectedTask.value) return

  const oldPriority = selectedTask.value.priority
  selectedTask.value.priority = val
  isPriorityMenuOpen.value = false

  try {
    await updateTaskApi({ ...selectedTask.value, priority: val })
  } catch {
    selectedTask.value.priority = oldPriority
    toast.error('更新优先级失败，请检查网络后重试。')
  }
}

const onDueDateChange = async (event: Event) => {
  if (!selectedTask.value) return

  const target = event.target as HTMLInputElement
  const finalDate = target.value === '' ? null : target.value
  const oldDate = selectedTask.value.dueDate
  selectedTask.value.dueDate = finalDate
  isDueDatePickerOpen.value = false

  try {
    await updateTaskApi({ ...selectedTask.value, dueDate: finalDate })
    await loadTasks()
  } catch {
    selectedTask.value.dueDate = oldDate
    toast.error('更新日期失败，请检查网络后重试。')
  }
}

const onMilestoneChange = async (event: Event) => {
  if (!selectedTask.value) return

  const target = event.target as HTMLSelectElement
  const finalMilestoneId = target.value === '' ? null : target.value
  const oldMilestoneId = selectedTask.value.milestoneId
  selectedTask.value.milestoneId = finalMilestoneId

  try {
    await updateTaskApi({ ...selectedTask.value, milestoneId: finalMilestoneId })
    await loadTasks()
  } catch {
    selectedTask.value.milestoneId = oldMilestoneId
    toast.error('更新所属阶段失败，请检查网络后重试。')
  }
}

const onTextBlur = async () => {
  if (!selectedTask.value) return

  try {
    await updateTaskApi({ ...selectedTask.value })
    await loadTasks()
  } catch (error) {
    console.error('保存任务失败', error)
    toast.error('保存失败，请检查网络后重试。')
  }
}

const requestDeleteTask = () => {
  if (!selectedTask.value) return
  pendingDeleteTask.value = { ...selectedTask.value }
  showDeleteTaskConfirm.value = true
}

const confirmDeleteTask = async () => {
  const taskToDelete = pendingDeleteTask.value
  if (!taskToDelete) return

  showDeleteTaskConfirm.value = false

  const originalIndex = taskList.value.findIndex((task) => task.id === taskToDelete.id)
  taskList.value = taskList.value.filter((task) => task.id !== taskToDelete.id)
  selectedTask.value = null

  undoDelete.scheduleUndoDelete({
    label: `任务「${taskToDelete.title}」`,
    pendingMessage: `任务「${taskToDelete.title}」已移除，5 秒内可撤销。`,
    onCommit: async () => {
      await deleteTaskApi(taskToDelete.id)
    },
    onCommitSuccess: async () => {
      await loadTasks()
    },
    onRollback: async () => {
      if (!taskList.value.some((task) => task.id === taskToDelete.id)) {
        const nextTasks = [...taskList.value]
        const insertIndex =
          originalIndex >= 0 && originalIndex <= nextTasks.length ? originalIndex : nextTasks.length
        nextTasks.splice(insertIndex, 0, taskToDelete)
        taskList.value = nextTasks
      }
    },
  })
}

const submitNewMilestone = async () => {
  const name = newMilestoneName.value.trim()
  if (!name || !selectedProjectId.value) {
    isAddingMilestone.value = false
    return
  }

  try {
    await addMilestoneApi({
      name,
      projectId: selectedProjectId.value,
      orderNo: milestoneList.value.length,
    })
    newMilestoneName.value = ''
    isAddingMilestone.value = false
    await loadMilestones()
  } catch {
    toast.error('创建阶段失败，请检查网络后重试。')
  }
}

const openAddMilestoneInput = () => {
  isAddingMilestone.value = true
  newMilestoneName.value = ''
}

const startEditMilestone = (milestone: Milestone) => {
  editingMilestoneId.value = milestone.id
  editMilestoneName.value = milestone.name
}

const saveMilestone = async (milestone: Milestone) => {
  const newName = editMilestoneName.value.trim()

  if (!newName || newName === milestone.name) {
    editingMilestoneId.value = ''
    return
  }

  try {
    await updateMilestoneApi({ ...milestone, name: newName })
    editingMilestoneId.value = ''
    await loadMilestones()
  } catch {
    toast.error('重命名失败，请检查网络后重试。')
  }
}

const requestDeleteMilestone = (id: string, name: string) => {
  pendingDeleteMilestone.value = { id, name }
  showDeleteMilestoneConfirm.value = true
}

const confirmDeleteMilestone = async () => {
  const target = pendingDeleteMilestone.value
  if (!target) return

  showDeleteMilestoneConfirm.value = false
  await deleteMilestone(target.id, target.name)
}

const deleteMilestone = async (id: string, name: string) => {

  const snapshot = [...milestoneList.value]
  const removedIndex = snapshot.findIndex((milestone) => milestone.id === id)
  const removedMilestone = snapshot.find((milestone) => milestone.id === id)
  if (!removedMilestone) return
  milestoneList.value = snapshot.filter((milestone) => milestone.id !== id)

  undoDelete.scheduleUndoDelete({
    label: `阶段「${name}」`,
    pendingMessage: `阶段「${name}」已移除，5 秒内可撤销。`,
    onCommit: async () => {
      await deleteMilestoneApi(id)
    },
    onCommitSuccess: async () => {
      await Promise.all([loadMilestones(), loadTasks()])
    },
    onRollback: () => {
      if (!milestoneList.value.some((milestone) => milestone.id === id)) {
        const next = [...milestoneList.value]
        const insertIndex = removedIndex >= 0 && removedIndex <= next.length ? removedIndex : next.length
        next.splice(insertIndex, 0, removedMilestone)
        milestoneList.value = next.sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
      }
    },
  })
}

const projectProgress = computed(() => {
  if (taskList.value.length === 0) return 0
  const completedCount = taskList.value.filter((t) => t.status === 2).length
  return Math.round((completedCount / taskList.value.length) * 100)
})

const groupedTasks = computed(() => {
  const result = {
    unassigned: [] as Task[],
    milestones: [] as { milestone: Milestone; tasks: Task[]; progress: number }[],
  }

  milestoneList.value.forEach((m) => {
    result.milestones.push({ milestone: m, tasks: [], progress: 0 })
  })

  taskList.value.forEach((task) => {
    if (task.milestoneId && String(task.milestoneId) !== '0') {
      const group = result.milestones.find((g) => g.milestone.id === String(task.milestoneId))
      if (group) {
        group.tasks.push(task)
      } else {
        result.unassigned.push(task)
      }
    } else {
      result.unassigned.push(task)
    }
  })

  result.milestones.forEach((g) => {
    if (g.tasks.length === 0) {
      g.progress = 0
    } else {
      const completedCount = g.tasks.filter((t) => t.status === 2).length
      g.progress = Math.round((completedCount / g.tasks.length) * 100)
    }
  })

  return result
})

watch(
  () => route.query.projectId,
  async () => {
    syncSelectedProject()
    closeDueDatePicker()
    selectedTask.value = null
    isPriorityMenuOpen.value = false
    await Promise.all([loadProjects(), loadMilestones(), loadTasks()])
  },
)

watch(showDeleteTaskConfirm, (next) => {
  if (!next) {
    pendingDeleteTask.value = null
  }
})

watch(showDeleteMilestoneConfirm, (next) => {
  if (!next) {
    pendingDeleteMilestone.value = null
  }
})

onMounted(async () => {
  updateViewport()
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  window.addEventListener('resize', updateViewport)
  syncSelectedProject()
  await Promise.all([loadProjects(), loadMilestones(), loadTasks()])
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  stopResizeRight()
  window.removeEventListener('resize', updateViewport)
})
</script>
