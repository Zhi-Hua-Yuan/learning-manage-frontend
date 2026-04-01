<template>
  <main class="flex-1 flex flex-col relative bg-gray-50 overflow-y-auto p-8">
    <div class="max-w-4xl mx-auto w-full space-y-8">
      <div class="text-center space-y-2 mb-8">
        <h2 class="text-3xl font-black text-gray-800 tracking-tight">
          让
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500"
            >AI</span
          >
          帮你拆解宏大目标
        </h2>
        <p class="text-gray-500">只需一句话，自动生成包含阶段与任务的落地执行计划</p>
      </div>

      <div
        class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-6 relative overflow-hidden"
      >
        <div
          class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500"
        ></div>

        <div class="grid grid-cols-2 gap-6">
          <div class="col-span-2">
            <label class="block text-sm font-bold text-gray-700 mb-2">🎯 你的目标是什么？</label>
            <input
              v-model="aiForm.target"
              type="text"
              placeholder="例如：三个月内通过英语六级 / 独立开发一款小程序"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-purple-400 transition-all"
            />
          </div>
          <div class="col-span-1">
            <label class="block text-sm font-bold text-gray-700 mb-2">⏳ 期望周期</label>
            <input
              v-model="aiForm.duration"
              type="text"
              placeholder="例如：12周 / 1个月"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-purple-400 transition-all"
            />
          </div>
          <div class="col-span-2">
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
            {{ isGeneratingPlan ? 'AI 正在疯狂燃烧 GPU...' : '开始智能拆解' }}
          </button>
        </div>
      </div>

      <div
        v-if="generatedPlan.length > 0"
        class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 animate-fade-in-up"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-gray-800">📋 生成的专属计划草稿</h3>
          <button
            @click="applyPlanToSystem"
            :disabled="isApplying"
            class="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-5 py-2 rounded-lg font-bold transition-all shadow-sm flex items-center gap-2 text-sm"
            :class="isApplying ? 'opacity-70 cursor-not-allowed' : ''"
          >
            <span v-if="isApplying">导入中...</span>
            <span v-else>✅ 一键生成项目并导入系统</span>
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
            <div class="space-y-2 pl-8">
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
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { aiBreakdownApi } from '@/api/ai'
import { addMilestoneApi } from '@/api/milestone'
import { addProjectApi } from '@/api/project'
import { addTaskApi } from '@/api/task'

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

const generatePlan = async () => {
  if (!aiForm.value.target || !aiForm.value.duration) {
    alert('请至少填写目标和期望周期！')
    return
  }

  isGeneratingPlan.value = true
  generatedPlan.value = []

  try {
    const res = await aiBreakdownApi(aiForm.value)
    generatedPlan.value = Array.isArray(res) ? (res as DraftMilestone[]) : []
  } catch {
    alert('AI 拆解失败，请检查网络或后端日志')
  } finally {
    isGeneratingPlan.value = false
  }
}

const applyPlanToSystem = async () => {
  if (generatedPlan.value.length === 0) return

  const isConfirm = window.confirm('确定要将这个计划作为新清单导入到系统中吗？')
  if (!isConfirm) return

  isApplying.value = true
  try {
    const created = await addProjectApi({ name: `[AI] ${aiForm.value.target}`, icon: '✨' })
    const newProjectId =
      created && typeof created === 'object' && 'id' in (created as unknown as { id?: unknown })
        ? String((created as unknown as { id?: string | number }).id || '')
        : String(created || '')

    if (!newProjectId || newProjectId === 'true') {
      alert('🎉 AI 计划生成完毕！请在左侧清单列表中查看')
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

    alert('🎉 导入成功！')
    await router.push({ path: '/tasks', query: { projectId: newProjectId } })
  } catch {
    alert('导入系统时出现异常')
  } finally {
    isApplying.value = false
    aiForm.value = { target: '', description: '', duration: '' }
    generatedPlan.value = []
  }
}
</script>
