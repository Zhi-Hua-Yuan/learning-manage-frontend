<template>
  <main class="flex-1 flex flex-col relative bg-gray-50 overflow-y-auto p-8">
    <div class="max-w-6xl mx-auto w-full space-y-6">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">📅 周报回顾与规划</h2>
        <span class="text-sm text-gray-500">温故而知新</span>
      </div>

      <div class="grid grid-cols-3 gap-6">
        <div class="col-span-2 space-y-6">
          <div
            class="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-6 text-white shadow-md flex justify-between items-center"
          >
            <div>
              <div class="text-blue-100 text-sm font-medium mb-1">
                第 {{ currentReview.weekNo || '?' }} 周 ({{ currentReview.startDate }} ~
                {{ currentReview.endDate }})
              </div>
              <div class="text-2xl font-bold">本周高光时刻</div>
            </div>
            <div class="flex gap-6 text-center">
              <div class="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
                <div class="text-3xl font-black">{{ currentReview.completedTaskCount || 0 }}</div>
                <div class="text-xs text-blue-100 mt-1">完成任务数</div>
              </div>
              <div class="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm min-w-[100px]">
                <div class="text-xl font-bold truncate mt-1">
                  {{ currentReview.focusProjectName || '暂无重点' }}
                </div>
                <div class="text-xs text-blue-100 mt-1">核心推进项目</div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-bold text-gray-700 flex items-center gap-2">
                  <span>🧠</span> 本周复盘 (Reflection)
                </label>

                <button
                  @click="handleAiPolish"
                  :disabled="isPolishing"
                  class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                  :class="
                    isPolishing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:shadow-md hover:scale-105'
                  "
                >
                  <svg
                    v-if="isPolishing"
                    class="animate-spin h-3 w-3 text-gray-400"
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
                  {{ isPolishing ? 'AI 思考中...' : 'AI 一键润色' }}
                </button>
              </div>
              <textarea
                v-model="currentReview.reflection"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all min-h-[120px] resize-none"
                placeholder="这周做的好与不好的地方？有什么感悟？..."
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span>🎯</span> 下周计划 (Next Plan)
              </label>
              <textarea
                v-model="currentReview.nextPlan"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all min-h-[120px] resize-none"
                placeholder="下周的核心目标是什么？打算怎么安排时间？..."
              ></textarea>
            </div>

            <div class="flex justify-end pt-2">
              <button
                @click="saveReview"
                class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-sm flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  ></path>
                </svg>
                保存本周总结
              </button>
            </div>
          </div>
        </div>

        <div
          class="col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-12rem)]"
        >
          <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>🕰️</span> 历史轨迹
          </h3>
          <div class="flex-1 overflow-y-auto space-y-4 pr-2">
            <div v-if="historyReviews.length === 0" class="text-center text-gray-400 mt-10 text-sm">
              暂无历史记录
            </div>

            <div
              v-for="item in historyReviews"
              :key="item.id"
              class="border-l-2 border-blue-200 pl-4 py-2 relative group"
            >
              <div
                class="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-3 border-2 border-white"
              ></div>
              <div class="text-xs text-gray-400 font-medium mb-1">
                {{ item.year }} 年 • 第 {{ item.weekNo }} 周
              </div>
              <div class="bg-gray-50 rounded-lg p-3 group-hover:bg-blue-50 transition-colors">
                <div class="text-sm font-bold text-gray-700 mb-1 line-clamp-1">
                  {{ item.focusProjectName || '日常推进' }}
                </div>
                <div class="text-xs text-gray-500 line-clamp-2">
                  {{ item.reflection || '无复盘内容' }}
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
import { onMounted, ref } from 'vue'
import { aiPolishApi } from '@/api/ai'
import { fetchCurrentReview, fetchReviewHistory, saveReviewApi } from '@/api/review'

interface ReviewItem {
  id?: string
  year?: number
  weekNo?: number
  startDate?: string
  endDate?: string
  completedTaskCount?: number
  focusProjectName?: string
  reflection?: string
  nextPlan?: string
}

const currentReview = ref<ReviewItem>({})
const historyReviews = ref<ReviewItem[]>([])
const isPolishing = ref(false)

const loadReviewData = async () => {
  try {
    const currentRes = await fetchCurrentReview()
    currentReview.value =
      currentRes && typeof currentRes === 'object' ? (currentRes as ReviewItem) : {}

    const historyRes = await fetchReviewHistory()
    historyReviews.value = Array.isArray(historyRes) ? (historyRes as ReviewItem[]) : []
  } catch (error) {
    console.error('加载周报数据失败', error)
  }
}

const saveReview = async () => {
  try {
    await saveReviewApi({
      year: currentReview.value.year,
      weekNo: currentReview.value.weekNo,
      startDate: currentReview.value.startDate,
      endDate: currentReview.value.endDate,
      completedTaskCount: currentReview.value.completedTaskCount,
      focusProjectName: currentReview.value.focusProjectName,
      reflection: currentReview.value.reflection,
      nextPlan: currentReview.value.nextPlan,
    })
    alert('🎉 本周总结保存成功！')
    await loadReviewData()
  } catch {
    alert('保存失败，请检查网络')
  }
}

const handleAiPolish = async () => {
  if (!currentReview.value.reflection || currentReview.value.reflection.trim() === '') {
    alert('请先写几句简单的复盘内容，AI 才能帮你润色哦！')
    return
  }

  isPolishing.value = true
  try {
    const res = await aiPolishApi({
      taskCount: currentReview.value.completedTaskCount || 0,
      focusProject: currentReview.value.focusProjectName || '日常事务',
      reflection: currentReview.value.reflection,
    })

    if (typeof res === 'string' && res) {
      currentReview.value.reflection = res
    }
  } catch (error) {
    console.error('AI 润色失败:', error)
    alert('AI 润色失败，请检查网络或后端日志')
  } finally {
    isPolishing.value = false
  }
}

onMounted(() => {
  loadReviewData()
})
</script>
