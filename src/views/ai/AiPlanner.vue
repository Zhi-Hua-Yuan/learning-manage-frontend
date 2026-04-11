<template>
  <main class="relative flex flex-1 flex-col overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
    <div class="mx-auto w-full max-w-4xl space-y-6 sm:space-y-8">
      <div class="mb-6 space-y-2 text-center sm:mb-8">
        <h2 class="text-2xl font-black tracking-tight text-gray-800 sm:text-3xl">
          让
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500"
            >AI</span
          >
          帮你拆解目标
        </h2>
        <p class="text-gray-500">只需一句话，自动生成包含阶段与任务的落地执行计划</p>
      </div>

      <div
        class="card-base relative space-y-6 overflow-hidden rounded-2xl bg-white p-5 sm:p-8"
      >
        <div
          class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500"
        ></div>

        <div class="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="block text-sm font-bold text-gray-700 mb-2">🎯 你的目标是什么？</label>
            <input
              v-model="aiForm.target"
              type="text"
              placeholder="例如：三个月内通过英语六级 / 独立开发一款小程序"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-purple-400 transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">⏳ 期望周期</label>
            <input
              v-model="aiForm.duration"
              type="text"
              placeholder="例如：12周 / 1个月"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-purple-400 transition-all"
            />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-bold text-gray-700 mb-2">📝 补充描述 (可选)</label>
            <textarea
              v-model="aiForm.description"
              placeholder="例如：我目前的基础比较薄弱，希望前两周以背单词和基础语法为主..."
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:bg-white focus:border-purple-400 transition-all min-h-[80px] resize-none"
            ></textarea>
          </div>
        </div>

        <div class="flex justify-center pt-4">
          <button
            @click="generatePlan"
            :disabled="isGeneratingPlan"
            class="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            :class="isGeneratingPlan ? 'opacity-70 cursor-not-allowed' : ''"
          >
            <svg
              v-if="isGeneratingPlan"
              class="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span v-else>✨</span>
            {{ isGeneratingPlan ? 'AI 正在生成计划...' : '开始智能拆解' }}
          </button>
        </div>
      </div>

      <div
        v-if="generatedPlan.length > 0"
        class="card-base animate-fade-in-up rounded-2xl bg-white p-5 sm:p-8"
      >
        <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-xl font-bold text-gray-800">📋 生成的专属计划草稿</h3>
          <button
            @click="openConfirmModal"
            :disabled="isApplying"
            class="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-5 py-2 rounded-lg font-bold transition-all shadow-sm flex items-center gap-2 text-sm"
            :class="isApplying ? 'opacity-70 cursor-not-allowed' : ''"
          >
            <span v-if="isApplying">导入中...</span>
            <span v-else>✅ 生成项目并导入系统</span>
          </button>
        </div>

        <div class="space-y-6">
          <div
            v-for="(milestone, mIndex) in generatedPlan"
            :key="mIndex"
            class="border border-purple-100 rounded-xl p-5 bg-purple-50/30"
          >
            <h4 class="font-bold text-purple-700 mb-3 flex items-center gap-2">
              <span
                class="bg-purple-200 text-purple-800 w-6 h-6 rounded flex items-center justify-center text-xs"
                >阶段 {{ mIndex + 1 }}</span
              >
              {{ milestone.name }}
            </h4>
            <div class="space-y-2 pl-2 sm:pl-8">
              <div
                v-for="(task, tIndex) in milestone.tasks"
                :key="tIndex"
                class="flex items-start gap-2 text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-100 shadow-sm"
              >
                <span class="text-gray-400 mt-0.5">▪</span>
                <div>
                  <div class="font-medium">{{ task.title || task.name }}</div>
                  <div v-if="task.description" class="text-xs text-gray-500 mt-1">
                    {{ task.description }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSuccessToast"
        class="fixed top-6 right-6 z-50 flex items-center w-full max-w-xs p-4 space-x-3 text-gray-700 bg-white rounded-xl shadow-2xl border-l-4 border-emerald-500"
      >
        <div
          class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-emerald-500 bg-emerald-100 rounded-lg"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            ></path>
          </svg>
        </div>
        <div class="ml-3 text-sm font-bold">AI 计划已导入系统。</div>
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
        v-if="showConfirmModal"
        class="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none"
      >
        <div
          class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
          @click="showConfirmModal = false"
        ></div>

        <div class="relative z-50 mx-auto my-6 w-[calc(100%-2rem)] max-w-md transform transition-all">
          <div
            class="relative flex flex-col w-full bg-white border-0 rounded-2xl shadow-2xl outline-none focus:outline-none overflow-hidden"
          >
            <div class="h-1 w-full bg-gradient-to-r from-purple-500 to-blue-500"></div>
            <div class="p-6 pb-0 flex flex-col items-center text-center">
              <div class="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <span class="text-2xl">✨</span>
              </div>
              <h3 class="text-xl font-black text-gray-800 mb-2">确认导入计划？</h3>
              <p class="text-sm text-gray-500 leading-relaxed px-4">
                此操作将根据 AI 生成的草稿，在您的系统中创建一个名为 <br />
                <span class="font-bold text-blue-600 border-b border-blue-200"
                  >"[AI] {{ aiForm.target }}"</span
                >
                的新清单项目。
              </p>
            </div>
            <div class="flex items-center justify-center p-6 gap-3 rounded-b">
              <button
                class="px-6 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 hover:text-gray-900 transition-colors outline-none focus:outline-none"
                type="button"
                @click="showConfirmModal = false"
              >
                取消
              </button>
              <button
                class="px-6 py-2.5 text-sm font-bold text-white bg-gray-900 rounded-xl shadow hover:bg-black hover:shadow-lg transition-all outline-none focus:outline-none flex items-center gap-2"
                type="button"
                @click="executeImport"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                立即导入
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { aiBreakdownApi } from '@/api/ai'
import { addMilestoneApi } from '@/api/milestone'
import { addProjectApi } from '@/api/project'
import { addTaskApi } from '@/api/task'

const emit = defineEmits(['refresh-projects'])

interface DraftTask {
  title?: string
  name?: string
  description?: string
}

interface DraftMilestone {
  name: string
  tasks: DraftTask[]
}

const router = useRouter()

const aiForm = ref({ target: '', description: '', duration: '' })
const isGeneratingPlan = ref(false)
const generatedPlan = ref<DraftMilestone[]>([])
const isApplying = ref(false)
const showConfirmModal = ref(false)
const showSuccessToast = ref(false)

const generatePlan = async () => {
  if (!aiForm.value.target || !aiForm.value.duration) {
    alert('请先填写目标和期望周期。')
    return
  }

  isGeneratingPlan.value = true
  generatedPlan.value = []

  try {
    const res = await aiBreakdownApi(aiForm.value)
    generatedPlan.value = Array.isArray(res) ? (res as DraftMilestone[]) : []
  } catch {
    alert('AI 拆解失败，请检查网络后重试。')
  } finally {
    isGeneratingPlan.value = false
  }
}

const openConfirmModal = () => {
  if (generatedPlan.value.length === 0) return
  showConfirmModal.value = true
}

const executeImport = async () => {
  showConfirmModal.value = false
  isApplying.value = true
  try {
    const created = await addProjectApi({ name: `[AI] ${aiForm.value.target}`, icon: '✨' })
    const newProjectId =
      created && typeof created === 'object' && 'id' in (created as unknown as { id?: unknown })
        ? String((created as unknown as { id?: string | number }).id || '')
        : String(created || '')

    if (!newProjectId || newProjectId === 'true') {
      emit('refresh-projects')
      showSuccessToast.value = true
      setTimeout(() => {
        showSuccessToast.value = false
      }, 3000)
      await router.push('/tasks')
      return
    }

    for (const [mIndex, milestoneDraft] of generatedPlan.value.entries()) {
      const milestoneCreated = await addMilestoneApi({
        name: milestoneDraft.name,
        projectId: newProjectId,
        orderNo: mIndex,
      })
      const newMilestoneId =
        milestoneCreated &&
        typeof milestoneCreated === 'object' &&
        'id' in (milestoneCreated as unknown as { id?: unknown })
          ? String((milestoneCreated as { id?: string | number }).id || '')
          : String(milestoneCreated || '')

      for (const task of milestoneDraft.tasks || []) {
        await addTaskApi({
          title: task.title || task.name || '未命名任务',
          description: task.description || '',
          projectId: newProjectId,
          priority: 0,
          milestoneId: newMilestoneId || undefined,
        })
      }
    }

    emit('refresh-projects')
    showSuccessToast.value = true
    setTimeout(() => {
      showSuccessToast.value = false
    }, 3000)
    await router.push({ path: '/tasks', query: { projectId: newProjectId } })
  } catch {
    alert('导入失败，请检查网络后重试。')
  } finally {
    isApplying.value = false
    aiForm.value = { target: '', description: '', duration: '' }
    generatedPlan.value = []
  }
}
</script>
