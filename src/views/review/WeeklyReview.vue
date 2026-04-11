<template>
  <main class="relative flex flex-1 flex-col overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
    <div class="mx-auto w-full max-w-6xl space-y-6">
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 class="flex items-center gap-2 text-xl font-bold text-gray-800 sm:text-2xl">📅 周报回顾与规划</h2>
        <span class="text-sm text-gray-500">温故而知新</span>
      </div>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-6">
        <div class="space-y-6 xl:col-span-2">
          <div
            class="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 p-5 text-white shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div>
              <div class="text-blue-100 text-sm font-medium mb-1">
                第 {{ currentReview.weekNo || '?' }} 周 ({{ currentReview.startDate }} ~
                {{ currentReview.endDate }})
              </div>
              <div class="text-2xl font-bold">本周高光时刻</div>
            </div>
            <div class="flex gap-3 text-center sm:gap-6">
              <div class="rounded-lg bg-white/20 px-4 py-2 backdrop-blur-sm">
                <div class="text-3xl font-black">{{ currentReview.completedTaskCount || 0 }}</div>
                <div class="text-xs text-blue-100 mt-1">完成任务数</div>
              </div>
              <div class="min-w-[100px] rounded-lg bg-white/20 px-4 py-2 backdrop-blur-sm">
                <div class="text-xl font-bold truncate mt-1">
                  {{ currentReview.focusProjectName || '暂无重点' }}
                </div>
                <div class="text-xs text-blue-100 mt-1">核心推进项目</div>
              </div>
            </div>
          </div>

          <div class="card-base space-y-6 rounded-2xl bg-white p-5 sm:p-6">
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-bold text-gray-700 flex items-center gap-2">
                  <span>🧠</span> 本周复盘
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
                  {{ isPolishing ? 'AI 处理中...' : 'AI 润色复盘' }}
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
                <span>🎯</span> 下周计划
              </label>
              <textarea
                v-model="currentReview.nextPlan"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all min-h-[120px] resize-none"
                placeholder="下周的核心目标是什么？打算怎么安排时间？..."
              ></textarea>
            </div>

            <div class="flex justify-end pt-2">
              <button
                @click="openSaveModal"
                class="btn-primary flex items-center gap-2 rounded-2xl px-7 py-3 font-bold shadow-lg shadow-blue-200"
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
          class="card-base flex max-h-[420px] flex-col rounded-2xl bg-white p-5 sm:p-6 xl:max-h-[calc(100vh-12rem)]"
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
              @click="item.id && viewDetail(item.id)"
              class="border-l-2 border-blue-200 pl-4 py-2 relative group cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all"
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

    <transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="toast.show"
        class="fixed top-6 right-6 z-[100] flex items-center w-full max-w-xs p-4 space-x-3 text-gray-700 bg-white rounded-xl shadow-2xl border-l-4"
        :class="toast.type === 'success' ? 'border-emerald-500' : 'border-red-500'"
      >
        <div
          class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg"
          :class="
            toast.type === 'success' ? 'text-emerald-500 bg-emerald-100' : 'text-red-500 bg-red-100'
          "
        >
          <span>{{ toast.type === 'success' ? '✅' : '⚠️' }}</span>
        </div>
        <div class="ml-3 text-sm font-bold">{{ toast.message }}</div>
      </div>
    </transition>

    <div
      v-if="showSaveConfirmModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all"
      >
        <div class="h-1.5 w-full bg-blue-500"></div>
        <div class="p-6 text-center">
          <div
            class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
          >
            💾
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">确认保存本周总结？</h3>
          <p class="text-sm text-gray-500">保存后，您可以在历史记录中随时查看本次复盘内容。</p>
        </div>
        <div class="flex p-4 gap-3">
          <button
            @click="showSaveConfirmModal = false"
            class="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
          >
            取消
          </button>
          <button
            @click="executeSave"
            class="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
          >
            确认保存
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showDetailModal && selectedReview"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md"
    >
      <div
        class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 class="text-xl font-black text-gray-800">
              {{ selectedReview.year }} 年 第 {{ selectedReview.weekNo }} 周总结
            </h3>
            <p class="text-xs text-gray-400 mt-1">
              {{ selectedReview.startDate }} ~ {{ selectedReview.endDate }}
            </p>
          </div>
          <button @click="showDetailModal = false" class="text-gray-400 hover:text-gray-600 p-2">
            ✕
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-8 space-y-8">
          <section>
            <h4
              class="flex items-center gap-2 text-sm font-black text-blue-600 mb-3 tracking-widest uppercase"
            >
              / 本周复盘 /
            </h4>
            <div
              class="text-gray-700 leading-relaxed bg-blue-50/30 p-5 rounded-2xl border border-blue-50 whitespace-pre-wrap"
            >
              {{ selectedReview.reflection || '无内容' }}
            </div>
          </section>
          <section>
            <h4
              class="flex items-center gap-2 text-sm font-black text-emerald-600 mb-3 tracking-widest uppercase"
            >
              / 下周计划 /
            </h4>
            <div
              class="text-gray-700 leading-relaxed bg-emerald-50/30 p-5 rounded-2xl border border-emerald-50 whitespace-pre-wrap"
            >
              {{ selectedReview.nextPlan || '无内容' }}
            </div>
          </section>
        </div>
        <div class="p-6 bg-gray-50 text-center">
          <div class="flex items-center justify-center gap-4">
            <button
              @click="handleEditReview"
              class="px-6 py-2.5 text-blue-600 bg-blue-50 rounded-xl font-bold hover:bg-blue-100 transition-all"
            >
              修改
            </button>
            <button
              @click="handleDeleteReview"
              class="px-6 py-2.5 text-red-600 bg-red-50 rounded-xl font-bold hover:bg-red-100 transition-all"
            >
              删除
            </button>
            <button
              @click="exportToMarkdown"
              class="px-6 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl font-bold hover:bg-gray-50 hover:shadow-sm transition-all flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                ></path>
              </svg>
              导出 MD
            </button>
            <button
              @click="showDetailModal = false"
              class="px-8 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-md"
            >
              阅读完毕
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showDeleteConfirmModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all"
      >
        <div class="h-1.5 w-full bg-red-500"></div>
        <div class="p-6 text-center">
          <div
            class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
          >
            🗑️
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">确认删除这条周总结？</h3>
          <p class="text-sm text-gray-500">删除后将无法恢复，建议确认内容已经不再需要。</p>
        </div>
        <div class="flex p-4 gap-3">
          <button
            @click="showDeleteConfirmModal = false"
            class="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
          >
            取消
          </button>
          <button
            @click="executeDelete"
            class="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { aiPolishApi } from '@/api/ai'
import {
  deleteReviewApi,
  fetchCurrentReview,
  fetchReviewHistory,
  getReviewDetailApi,
  updateReviewApi,
  saveReviewApi,
} from '@/api/review'

interface ReviewItem {
  id?: string | number
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
const showDetailModal = ref(false)
const selectedReview = ref<ReviewItem | null>(null)
const showSaveConfirmModal = ref(false)
const showDeleteConfirmModal = ref(false)
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
  toast.value = { show: true, message: msg, type }
  setTimeout(() => (toast.value.show = false), 3000)
}

const loadReviewData = async () => {
  await loadHistory()
}

const loadHistory = async () => {
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

const openSaveModal = () => {
  showSaveConfirmModal.value = true
}

const executeSave = async () => {
  try {
    const payload = {
      year: currentReview.value.year,
      weekNo: currentReview.value.weekNo,
      startDate: currentReview.value.startDate,
      endDate: currentReview.value.endDate,
      completedTaskCount: currentReview.value.completedTaskCount,
      focusProjectName: currentReview.value.focusProjectName,
      reflection: currentReview.value.reflection,
      nextPlan: currentReview.value.nextPlan,
    }

    if (currentReview.value.id) {
      await updateReviewApi({ ...payload, id: currentReview.value.id })
    } else {
      await saveReviewApi(payload)
    }

    showSaveConfirmModal.value = false
    showToast('保存成功')
    await loadHistory()
  } catch {
    showToast('保存失败，请检查网络后重试。', 'error')
  }
}

const viewDetail = async (id: number | string) => {
  try {
    const res = await getReviewDetailApi(id)
    const responseData =
      res &&
      typeof res === 'object' &&
      'data' in (res as { data?: unknown }) &&
      (res as { data?: unknown }).data &&
      typeof (res as { data?: unknown }).data === 'object'
        ? ((res as { data?: ReviewItem }).data ?? null)
        : (res as ReviewItem)
    selectedReview.value = responseData
    showDetailModal.value = true
  } catch {
    showToast('获取详情失败，请稍后重试。', 'error')
  }
}

const handleDeleteReview = async () => {
  if (!selectedReview.value) return
  showDeleteConfirmModal.value = true
}

const executeDelete = async () => {
  try {
    if (!selectedReview.value?.id) return
    await deleteReviewApi(selectedReview.value.id)
    showDeleteConfirmModal.value = false
    showDetailModal.value = false
    selectedReview.value = null
    showToast('删除成功', 'success')
    await loadHistory()
  } catch {
    showToast('删除失败，请稍后重试。', 'error')
  }
}

const handleEditReview = () => {
  if (!selectedReview.value) return
  currentReview.value.id = selectedReview.value.id
  currentReview.value.year = selectedReview.value.year
  currentReview.value.weekNo = selectedReview.value.weekNo
  currentReview.value.startDate = selectedReview.value.startDate
  currentReview.value.endDate = selectedReview.value.endDate
  currentReview.value.reflection = selectedReview.value.reflection
  currentReview.value.nextPlan = selectedReview.value.nextPlan
  showDetailModal.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
  showToast('已加载至编辑器，修改后点击保存即可', 'success')
}

const exportToMarkdown = () => {
  if (!selectedReview.value) return

  const review = selectedReview.value

  const markdownContent = `# 📅 ${review.year} 年第 ${review.weekNo} 周总结

> **周期**：${review.startDate} ~ ${review.endDate}
> **核心推进项目**：${review.focusProjectName || '无'}
> **完成任务数**：${review.completedTaskCount || 0} 个

---

## 🧠 本周复盘
${review.reflection || '无复盘内容'}

## 🎯 下周计划
${review.nextPlan || '无计划内容'}

---
*由 [智径 SmartPath] 智能生成*
`

  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${review.year}年第${review.weekNo}周总结.md`

  document.body.appendChild(link)
  link.click()

  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  showToast('Markdown 导出成功。', 'success')
}

const handleAiPolish = async () => {
  if (!currentReview.value.reflection || currentReview.value.reflection.trim() === '') {
    showToast('请先填写复盘内容，再进行 AI 润色。', 'error')
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
      try {
        // 尝试解析 AI 返回的 JSON 字符串
        const parsedData = JSON.parse(res)

        // 精准回填到对应的响应式变量中
        if (parsedData.review) {
          currentReview.value.reflection = parsedData.review
        }
        if (parsedData.plan) {
          currentReview.value.nextPlan = parsedData.plan
        }

        showToast('AI 润色完成。', 'success')
      } catch {
        console.error('JSON 解析失败, AI 返回的原始数据为:', res)
        // 兜底策略：如果解析失败（说明 AI 还是输出了废话），就全部塞进复盘框里，防止数据丢失
        currentReview.value.reflection = res
        showToast('AI 返回格式异常，内容已填入复盘区，请手动调整。', 'error')
      }
    }
  } catch (error) {
    console.error('AI 润色失败:', error)
    showToast('AI 润色失败，请检查网络后重试。', 'error')
  } finally {
    isPolishing.value = false
  }
}

onMounted(() => {
  loadReviewData()
})
</script>

