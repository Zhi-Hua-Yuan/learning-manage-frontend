<template>
  <div class="flex-1 flex bg-white min-h-full">
    <main class="flex-1 flex flex-col relative bg-white">
      <div class="p-4 border-b border-gray-200 font-bold text-xl flex items-center justify-between">
        <span>
          {{ projectList.find((p) => p.id === selectedProjectId)?.icon }}
          {{ projectList.find((p) => p.id === selectedProjectId)?.name || '请选择清单' }}
        </span>

        <div class="flex items-center gap-3 w-48" v-if="selectedProjectId && taskList.length > 0">
          <span class="text-xs text-gray-500 font-normal">完成度 {{ projectProgress }}%</span>
          <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-green-500 transition-all duration-500"
              :style="{ width: projectProgress + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <div class="px-4 py-3 border-b border-gray-100">
        <div
          class="flex items-center bg-gray-50 rounded px-3 py-2 border border-transparent focus-within:border-blue-400 focus-within:bg-white transition-all shadow-sm"
        >
          <span class="text-gray-400 mr-2 font-bold text-lg">+</span>
          <input
            v-model="newTaskTitle"
            @keyup.enter="addTask"
            type="text"
            placeholder="输入任务标题，按回车键保存"
            class="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
          />

          <div class="border-l border-gray-200 pl-3 ml-2 flex items-center">
            <select
              v-model="newTaskMilestoneId"
              class="bg-transparent text-sm outline-none cursor-pointer text-blue-600 font-medium hover:text-blue-700 transition-colors max-w-[120px] truncate"
            >
              <option value="" class="text-gray-600">📥 默认列表</option>
              <option v-for="m in milestoneList" :key="m.id" :value="m.id" class="text-gray-800">
                🚩 {{ m.name }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <div v-if="groupedTasks.unassigned.length > 0" class="flex flex-col">
          <div
            v-for="task in groupedTasks.unassigned"
            :key="task.id"
            @click="selectTask(task)"
            class="flex items-center group py-3 border-b border-gray-100 cursor-pointer rounded px-2 transition-colors"
            :class="selectedTask?.id === task.id ? 'bg-blue-50' : 'hover:bg-gray-50'"
          >
            <div
              class="w-5 h-5 rounded border mr-3 flex items-center justify-center cursor-pointer transition-colors"
              :class="task.status === 2 ? 'bg-blue-500 border-blue-500' : 'border-gray-400'"
              @click.stop="toggleTaskStatus(task)"
            >
              <svg
                v-if="task.status === 2"
                class="w-3 h-3 text-white"
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
              class="flex-1 text-sm transition-all"
              :class="task.status === 2 ? 'text-gray-400 line-through' : 'text-gray-800'"
            >
              {{ task.title }}
            </span>
          </div>
        </div>

        <div
          v-for="group in groupedTasks.milestones"
          :key="group.milestone.id"
          class="bg-gray-50 rounded-xl p-4 border border-gray-100"
        >
          <div class="flex items-center justify-between mb-3 px-1 group relative">
            <div
              v-if="editingMilestoneId === group.milestone.id"
              class="flex-1 flex items-center gap-2 mr-4"
            >
              <span class="text-blue-500">🚩</span>
              <input
                v-model="editMilestoneName"
                @keyup.enter="saveMilestone(group.milestone)"
                @blur="saveMilestone(group.milestone)"
                v-focus
                type="text"
                class="flex-1 bg-white border border-blue-400 rounded px-2 py-0.5 text-sm font-bold text-gray-800 outline-none shadow-sm"
              />
            </div>

            <h3 v-else class="font-bold text-gray-800 flex items-center gap-2 flex-1">
              <span class="text-blue-500">🚩</span> {{ group.milestone.name }}

              <div
                class="opacity-0 group-hover:opacity-100 flex items-center ml-2 transition-opacity duration-200"
              >
                <button
                  @click="startEditMilestone(group.milestone)"
                  class="p-1 text-gray-400 hover:text-blue-500 hover:bg-white rounded"
                  title="重命名"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    ></path>
                  </svg>
                </button>
                <button
                  @click="deleteMilestone(group.milestone.id, group.milestone.name)"
                  class="p-1 text-gray-400 hover:text-red-500 hover:bg-white rounded"
                  title="删除阶段"
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
            </h3>

            <div class="flex items-center gap-2 w-28">
              <span class="text-xs text-gray-500">{{ group.progress }}%</span>
              <div class="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  class="h-full bg-blue-400 transition-all duration-500"
                  :style="{ width: group.progress + '%' }"
                ></div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
            <div
              v-if="group.tasks.length === 0"
              class="p-4 text-sm text-gray-400 text-center bg-gray-50/50"
            >
              该阶段暂无任务
            </div>

            <div
              v-for="task in group.tasks"
              :key="task.id"
              @click="selectTask(task)"
              class="flex items-center group py-3 border-b border-gray-50 cursor-pointer px-3 transition-colors hover:bg-blue-50"
              :class="selectedTask?.id === task.id ? 'bg-blue-50' : ''"
            >
              <div
                class="w-5 h-5 rounded border mr-3 flex items-center justify-center cursor-pointer transition-colors"
                :class="task.status === 2 ? 'bg-blue-500 border-blue-500' : 'border-gray-400'"
                @click.stop="toggleTaskStatus(task)"
              >
                <svg
                  v-if="task.status === 2"
                  class="w-3 h-3 text-white"
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
                class="flex-1 text-sm transition-all"
                :class="task.status === 2 ? 'text-gray-400 line-through' : 'text-gray-800'"
              >
                {{ task.title }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-2 mb-8">
          <div
            v-if="isAddingMilestone"
            class="bg-white rounded-lg border border-blue-400 overflow-hidden shadow-sm p-1"
          >
            <input
              v-model="newMilestoneName"
              @keyup.enter="submitNewMilestone"
              @blur="isAddingMilestone = false"
              autofocus
              type="text"
              placeholder="里程碑名称 (例如: V1.0 核心功能) - 按回车保存"
              class="w-full text-sm px-3 py-2 outline-none text-gray-700 bg-transparent"
            />
          </div>

          <button
            v-else
            @click="openAddMilestoneInput"
            class="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-all font-medium text-sm"
          >
            <span class="text-lg font-bold">+</span> 添加阶段 (Milestone)
          </button>
        </div>
      </div>
    </main>

    <div
      class="w-1 hover:w-1.5 cursor-col-resize bg-transparent hover:bg-blue-400 active:bg-blue-500 transition-all z-20 -ml-1"
      @mousedown="startResizeRight"
    ></div>

    <aside
      v-if="selectedTask"
      class="bg-white border-l border-gray-200 flex flex-col shadow-sm z-10"
      :style="{ width: detailWidth + 'px' }"
    >
      <div class="p-4 border-b border-gray-100 flex justify-between items-center text-gray-500">
        <span class="text-sm font-medium">任务详情</span>

        <div class="flex items-center gap-1">
          <button
            @click="deleteTask"
            class="hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
            title="删除任务"
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

          <button
            @click="closeDetail"
            class="hover:text-gray-800 p-1.5 rounded hover:bg-gray-100 transition-colors"
            title="关闭详情"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
        <input
          v-model="selectedTask.title"
          @blur="onTextBlur"
          type="text"
          class="text-xl font-bold text-gray-800 outline-none w-full bg-transparent placeholder-gray-300"
          placeholder="准备做什么？"
        />

        <div class="flex items-center gap-3 border-y border-gray-100 py-3 relative">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-1 6-1 1H11.5l-1-1H5v12"
            ></path>
          </svg>
          <label class="text-sm font-medium text-gray-600">优先级:</label>

          <div
            @click="isPriorityMenuOpen = !isPriorityMenuOpen"
            class="flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 transition-colors"
            :class="currentPriorityObj.color"
          >
            <span>{{ currentPriorityObj.icon }}</span>
            <span class="text-sm font-medium">{{ currentPriorityObj.text }}</span>
          </div>

          <div
            v-if="isPriorityMenuOpen"
            class="absolute top-12 left-24 w-40 bg-white border border-gray-100 rounded-lg shadow-xl z-20 py-1 overflow-hidden"
          >
            <div
              v-for="option in priorityOptions"
              :key="option.value"
              @click="selectPriority(option.value)"
              class="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors"
              :class="option.color"
            >
              <span>{{ option.icon }}</span>
              <span class="font-medium">{{ option.text }}</span>

              <svg
                v-if="selectedTask.priority === option.value"
                class="w-4 h-4 ml-auto text-blue-500"
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
          </div>
        </div>

        <div class="flex items-center gap-3 border-b border-gray-100 py-3 relative">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            ></path>
          </svg>
          <label class="text-sm font-medium text-gray-600 w-16">截止日期:</label>

          <div class="relative flex-1 flex items-center">
            <input
              type="date"
              :value="selectedTask.dueDate || ''"
              @change="onDueDateChange"
              class="w-full text-sm outline-none bg-transparent cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer z-10"
              :class="!selectedTask.dueDate ? 'text-transparent' : 'text-gray-700'"
            />
            <span
              v-if="!selectedTask.dueDate"
              class="absolute left-0 text-sm text-gray-400 pointer-events-none"
            >
              设置截止日期...
            </span>
          </div>
        </div>

        <div class="flex items-center gap-3 border-b border-gray-100 py-3 relative">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            ></path>
          </svg>
          <label class="text-sm font-medium text-gray-600 w-16">所属阶段:</label>

          <select
            :value="selectedTask.milestoneId || ''"
            @change="onMilestoneChange"
            class="flex-1 text-sm outline-none bg-transparent text-gray-700 cursor-pointer"
          >
            <option value="">(默认列表 / 未分配)</option>
            <option v-for="m in milestoneList" :key="m.id" :value="m.id">🚩 {{ m.name }}</option>
          </select>
        </div>

        <textarea
          v-model="selectedTask.description"
          @blur="onTextBlur"
          class="w-full text-sm text-gray-600 outline-none resize-none bg-gray-50 rounded p-3 min-h-[120px] focus:bg-blue-50 focus:ring-1 focus:ring-blue-200 transition-all"
          placeholder="添加描述..."
        ></textarea>
      </div>
    </aside>

    <aside
      v-else
      class="bg-gray-50 border-l border-gray-200 flex flex-col items-center justify-center text-gray-400"
      :style="{ width: detailWidth + 'px' }"
    >
      <svg
        class="w-16 h-16 mb-4 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        ></path>
      </svg>
      <p class="text-sm">点击任务查看详情</p>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchProjectList } from '@/api/project'
import { addTaskApi, deleteTaskApi, fetchTaskList, updateTaskApi } from '@/api/task'
import {
  addMilestoneApi,
  deleteMilestoneApi,
  fetchMilestoneList,
  updateMilestoneApi,
} from '@/api/milestone'

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

const route = useRoute()
const router = useRouter()

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
const detailWidth = ref(Number(localStorage.getItem('tick_detailWidth')) || 320)
const isResizingRight = ref(false)

const startResizeRight = () => {
  isResizingRight.value = true
  document.addEventListener('mousemove', handleMouseMoveRight)
  document.addEventListener('mouseup', stopResizeRight)
  document.body.style.userSelect = 'none'
}

const handleMouseMoveRight = (e: MouseEvent) => {
  if (!isResizingRight.value) return
  const newWidth = document.body.clientWidth - e.clientX
  if (newWidth > 250 && newWidth < 600) {
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

const priorityOptions = [
  { value: 0, text: '无优先级', color: 'text-gray-400', icon: '🏳️' },
  { value: 1, text: '低优先级', color: 'text-blue-500', icon: '🔵' },
  { value: 2, text: '中优先级', color: 'text-orange-500', icon: '🟠' },
  { value: 3, text: '高优先级', color: 'text-red-600', icon: '🚩' },
]

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
    alert('添加任务失败！请看控制台报错')
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
    alert('更新状态失败')
  }
}

const selectTask = (task: Task) => {
  selectedTask.value = task
}

const closeDetail = () => {
  selectedTask.value = null
  isPriorityMenuOpen.value = false
}

const currentPriorityObj = computed(() => {
  if (!selectedTask.value) return priorityOptions[0]!
  return (
    priorityOptions.find((p) => p.value === selectedTask.value?.priority) || priorityOptions[0]!
  )
})

const selectPriority = async (val: number) => {
  if (!selectedTask.value) return

  const oldPriority = selectedTask.value.priority
  selectedTask.value.priority = val
  isPriorityMenuOpen.value = false

  try {
    await updateTaskApi({ ...selectedTask.value, priority: val })
  } catch {
    selectedTask.value.priority = oldPriority
  }
}

const onDueDateChange = async (event: Event) => {
  if (!selectedTask.value) return

  const target = event.target as HTMLInputElement
  const finalDate = target.value === '' ? null : target.value
  const oldDate = selectedTask.value.dueDate
  selectedTask.value.dueDate = finalDate

  try {
    await updateTaskApi({ ...selectedTask.value, dueDate: finalDate })
    await loadTasks()
  } catch {
    selectedTask.value.dueDate = oldDate
    alert('更新日期失败')
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
    alert('更新所属阶段失败')
  }
}

const onTextBlur = async () => {
  if (!selectedTask.value) return

  try {
    await updateTaskApi({ ...selectedTask.value })
    await loadTasks()
  } catch (error) {
    console.error('保存文本失败', error)
  }
}

const deleteTask = async () => {
  if (!selectedTask.value) return

  const isConfirm = window.confirm(`确定要删除任务 "${selectedTask.value.title}" 吗？`)
  if (!isConfirm) return

  try {
    await deleteTaskApi(selectedTask.value.id)
    selectedTask.value = null
    await loadTasks()
  } catch {
    alert('删除失败，请看控制台报错')
  }
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
    alert('创建里程碑失败，请检查控制台报错')
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
    alert('重命名失败')
  }
}

const deleteMilestone = async (id: string, name: string) => {
  const isConfirm = window.confirm(
    `确定要删除阶段 "${name}" 吗？\n该阶段下的任务不会被删除，但会变回"未分配"状态！`,
  )
  if (!isConfirm) return

  try {
    await deleteMilestoneApi(id)
    await Promise.all([loadMilestones(), loadTasks()])
  } catch {
    alert('删除阶段失败')
  }
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
    selectedTask.value = null
    await Promise.all([loadProjects(), loadMilestones(), loadTasks()])
  },
)

onMounted(async () => {
  syncSelectedProject()
  await Promise.all([loadProjects(), loadMilestones(), loadTasks()])
})

onBeforeUnmount(() => {
  stopResizeRight()
})
</script>
