<template>
  <div class="flex h-screen w-screen bg-white overflow-hidden text-gray-800">
    <aside class="w-64 bg-gray-50 border-r border-gray-200 flex flex-col z-10">
      <div class="p-4 font-bold text-lg border-b border-gray-200 flex items-center gap-2">
        <span class="text-blue-500">✅</span> 我的滴答清单
      </div>

      <div class="flex-1 overflow-y-auto py-2">
        <div
          v-for="project in projectList"
          :key="project.id"
          @click="selectProject(project.id)"
          class="flex items-center gap-3 px-4 py-2 mx-2 rounded-lg cursor-pointer transition-colors group"
          :class="
            selectedProjectId === project.id
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

      <div
        class="mt-auto p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between group"
      >
        <div class="flex items-center gap-2 overflow-hidden">
          <div
            class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm"
          >
            Me
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-medium text-gray-700 truncate">当前用户</span>
          </div>
        </div>

        <button
          @click="handleLogout"
          class="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 transition-all rounded hover:bg-gray-200"
          title="退出登录"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            ></path>
          </svg>
        </button>
      </div>
    </aside>

    <main class="flex-1 flex flex-col relative bg-white">
      <div class="p-4 border-b border-gray-200 font-bold text-xl flex items-center justify-between">
        <span>
          {{ projectList.find((p) => p.id === selectedProjectId)?.icon }}
          {{ projectList.find((p) => p.id === selectedProjectId)?.name }}
        </span>
      </div>

      <div class="px-4 pb-3 border-b border-gray-100">
        <div
          class="flex items-center bg-gray-50 rounded px-3 py-2 border border-transparent focus-within:border-blue-400 focus-within:bg-white transition-all shadow-sm"
        >
          <span class="text-gray-400 mr-2 font-bold text-lg">+</span>

          <input
            v-model="newTaskTitle"
            @keyup.enter="addTask"
            type="text"
            placeholder="添加任务至“今天”，按回车键保存"
            class="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-4">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          @click="selectTask(task)"
          class="flex items-center group py-3 border-b border-gray-100 cursor-pointer rounded px-2 transition-colors"
          :class="selectedTask?.id === task.id ? 'bg-blue-50' : 'hover:bg-gray-50'"
        >
          <div
            class="w-5 h-5 rounded border mr-3 flex items-center justify-center cursor-pointer"
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
            class="flex-1 text-sm"
            :class="task.status === 2 ? 'text-gray-400 line-through' : 'text-gray-800'"
          >
            {{ task.title }}
          </span>
        </div>
      </div>
    </main>

    <aside
      v-if="selectedTask"
      class="w-80 bg-white border-l border-gray-200 flex flex-col shadow-sm z-10"
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
      class="w-80 bg-gray-50 border-l border-gray-200 flex flex-col items-center justify-center text-gray-400"
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
import { ref, computed, onMounted } from 'vue'
import { fetchProjectList, addProjectApi, deleteProjectApi } from '@/api/project'
import { fetchTaskList, addTaskApi, updateTaskApi, deleteTaskApi } from '@/api/task'
import { useRouter } from 'vue-router'

// 【第一步】定义前端的实体类 (TypeScript Interface)
interface Task {
  id: string
  title: string
  description?: string
  status: number
  priority: number
  projectId: string
  dueDate?: string // 👈 新增：截止日期 (格式为 YYYY-MM-DD)
}

// --- 1. 定义左侧的“清单/项目”实体与数据 ---
interface Project {
  id: string
  name: string
  icon: string
}

const projectList = ref<Project[]>([])
const taskList = ref<Task[]>([])
const selectedProjectId = ref('')
const selectedTask = ref<Task | null>(null)

// ================== 核心联调逻辑开始 ==================

// 1. 加载左侧项目清单
const loadProjects = async () => {
  try {
    // 调用后端 /project/list 接口
    const res: any = await fetchProjectList()
    // ⚠️ 重点：因为你后端返回的是 Page<ProjectVo>，所以真实的列表数据在 res.records 里
    projectList.value = res.records || []

    // 如果有清单，默认选中第一个，并加载它的任务
    if (projectList.value.length > 0) {
      selectedProjectId.value = projectList.value[0].id
      await loadTasks()
    }
  } catch (error) {
    console.error('加载项目失败', error)
  }
}

// 【新增：左侧清单新建逻辑】
const isAddingProject = ref(false) // 控制输入框是否显示的开关
const newProjectName = ref('') // 绑定的新清单名字

const submitNewProject = async () => {
  const name = newProjectName.value.trim()

  // 如果没输入内容就回车，直接取消并收起输入框
  if (!name) {
    isAddingProject.value = false
    return
  }

  try {
    // 1. 调用后端接口创建清单（可以默认给个可爱的文件夹图标）
    await addProjectApi({ name: name, icon: '📁' })

    // 2. 清空输入框并隐藏
    newProjectName.value = ''
    isAddingProject.value = false

    // 3. 重新加载左侧列表，新清单就会出现！
    await loadProjects()
  } catch (error) {
    alert('创建清单失败，请检查控制台')
  }
}

// 2. 加载中间任务列表
const loadTasks = async () => {
  if (!selectedProjectId.value) return
  try {
    // 调用后端 /task/list 接口，传入 projectId 参数
    const res: any = await fetchTaskList({
      projectId: selectedProjectId.value,
      current: 1,
      size: 100, // 初期不考虑翻页，先拉取前100条
    })
    // 同理，取 records 里的数据
    taskList.value = res.records || []
  } catch (error) {
    console.error('加载任务失败', error)
  }
}

// 3. 页面初始化时执行
onMounted(() => {
  loadProjects()
})

// ================== 用户交互逻辑更新 ==================

// 切换左侧清单
const selectProject = (id: string) => {
  selectedProjectId.value = id
  selectedTask.value = null
  loadTasks() // 切换清单时，重新向后端请求该清单下的任务！
}

// 前端过滤视图 (其实既然我们每次切换都调接口了，这里也可以不用计算属性过滤了，但保留也无妨)
const filteredTasks = computed(() => {
  return taskList.value // 现在 taskList 里本身就是当前选中的清单数据了
})

// 新增任务
const newTaskTitle = ref('')
const addTask = async () => {
  if (!newTaskTitle.value.trim()) return

  try {
    // 构造发给后端的 Request Body (对应你的 TaskCreateRequest)
    const reqData = {
      title: newTaskTitle.value.trim(),
      projectId: selectedProjectId.value, // 如果报错说 projectId 为空，确保你左侧选中了某个清单
      priority: 0, // 👈 明确告诉后端：这个新任务是 0（无优先级）
    }

    // 调用新增接口
    await addTaskApi(reqData)

    // 新增成功后，清空输入框，并重新拉取列表刷新页面
    newTaskTitle.value = ''
    await loadTasks()
  } catch (error) {
    alert('添加任务失败！请看控制台报错')
  }
}

// 切换任务状态（勾选完成）
const toggleTaskStatus = async (task: Task) => {
  const newStatus = task.status === 2 ? 0 : 2

  try {
    // 先乐观更新 UI
    task.status = newStatus

    // 👇 重点修改：使用 ...task 把任务的所有字段都传过去，并用 newStatus 覆盖状态
    await updateTaskApi({
      ...task,
      status: newStatus,
    })
  } catch (error) {
    // 如果后端报错，UI 回滚
    task.status = task.status === 2 ? 0 : 2
    alert('更新状态失败')
  }
}

// 点击选择任务、关闭详情页、优先级等逻辑保留不变即可...
const selectTask = (task: Task) => {
  selectedTask.value = task
}
const closeDetail = () => {
  selectedTask.value = null
}
const isPriorityMenuOpen = ref(false)
const priorityOptions = [
  { value: 0, text: '无优先级', color: 'text-gray-400', icon: '🏳️' },
  { value: 1, text: '低优先级', color: 'text-blue-500', icon: '🔵' },
  { value: 2, text: '中优先级', color: 'text-orange-500', icon: '🟠' },
  { value: 3, text: '高优先级', color: 'text-red-600', icon: '🚩' },
]
const currentPriorityObj = computed(() => {
  if (!selectedTask.value) return priorityOptions[0]
  return priorityOptions.find((p) => p.value === selectedTask.value!.priority) || priorityOptions[0]
})
const selectPriority = async (val: number) => {
  if (selectedTask.value) {
    const oldPriority = selectedTask.value.priority
    selectedTask.value.priority = val // 更新UI
    isPriorityMenuOpen.value = false

    try {
      // 👇 重点修改：使用 ...selectedTask.value 把所有字段传过去，覆盖 priority
      await updateTaskApi({
        ...selectedTask.value,
        priority: val,
      })
    } catch (e) {
      selectedTask.value.priority = oldPriority // 失败回滚
    }
  }
}

// 【新增：处理截止日期变更】
const onDueDateChange = async (event: Event) => {
  if (!selectedTask.value) return

  const target = event.target as HTMLInputElement
  const newDate = target.value

  // 处理空字符串变成严格的 null，防止后端或前端出现 NaN
  const finalDate = newDate === '' ? null : newDate

  // 乐观更新 UI
  const oldDate = selectedTask.value.dueDate
  // 绕过 TS 检查，直接赋 null
  ;(selectedTask.value as any).dueDate = finalDate

  try {
    // 👇 重点修改：使用 ...selectedTask.value 把所有字段传过去，覆盖 dueDate
    await updateTaskApi({
      ...selectedTask.value,
      dueDate: finalDate,
    })

    // 重新拉取一下列表，确保两边数据一致
    await loadTasks()
  } catch (error) {
    // 失败回滚
    selectedTask.value.dueDate = oldDate
    alert('更新日期失败')
  }
}

// 【新增：无感自动保存标题和描述】
const onTextBlur = async () => {
  if (!selectedTask.value) return

  try {
    // 只要输入框失去焦点，就把当前最新的任务数据（包括标题和描述）全量发给后端更新
    await updateTaskApi({
      ...selectedTask.value,
    })
    // 重新加载列表，确保左侧、中间的标题也跟着实时更新
    await loadTasks()
  } catch (error) {
    console.error('保存文本失败', error)
  }
}

// 【新增：删除当前选中的任务】
const deleteTask = async () => {
  if (!selectedTask.value) return

  // 1. 浏览器原生的确认弹窗（极简防误触）
  const isConfirm = window.confirm(`确定要删除任务 "${selectedTask.value.title}" 吗？`)
  if (!isConfirm) return

  try {
    // 2. 调用后端删除接口
    await deleteTaskApi(selectedTask.value.id)

    // 3. UI 联动：关闭右侧详情页
    selectedTask.value = null

    // 4. 重新加载最新列表
    await loadTasks()
  } catch (error) {
    alert('删除失败，请看控制台报错')
  }
}

const openAddProjectInput = () => {
  isAddingProject.value = true
  newProjectName.value = ''
}

// 【新增：删除清单逻辑】
const deleteProject = async (id: string, name: string) => {
  // 1. 危险操作，必须二次确认
  const isConfirm = window.confirm(`确定要删除清单 "${name}" 吗？相关的任务可能会一并丢失！`)
  if (!isConfirm) return

  try {
    // 2. 调用后端删除接口
    await deleteProjectApi(id)

    // 3. UI 联动：如果你当前正在看这个被删除的清单，我们需要清空中间的屏幕
    if (selectedProjectId.value === id) {
      selectedProjectId.value = ''
      taskList.value = []
      selectedTask.value = null // 右侧详情也关掉
    }

    // 4. 重新加载左侧列表
    await loadProjects()
  } catch (error) {
    alert('删除清单失败，请检查控制台报错')
  }
}

const router = useRouter()

// 【新增：退出登录逻辑】
const handleLogout = () => {
  const isConfirm = window.confirm('确定要退出登录吗？')
  if (!isConfirm) return

  // 1. 清除本地存储的 Token
  localStorage.removeItem('token')

  // 2. 强制跳转回登录页
  router.push('/login')
}
</script>
