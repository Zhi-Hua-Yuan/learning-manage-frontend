<template>
  <main class="relative flex flex-1 flex-col overflow-y-auto bg-[var(--color-bg-page)] p-4 sm:p-6 lg:p-8">
    <div class="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="flex items-center gap-2 text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">📊 数据仪表盘</h2>
        <span class="text-sm text-[var(--color-text-secondary)]">数据实时更新</span>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
        <div
          class="card-base flex flex-col items-center justify-center gap-2 rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-6"
        >
          <span class="text-sm font-medium text-[var(--color-text-secondary)]">进行中项目</span>
          <span class="mono text-4xl font-black text-[var(--color-text-primary)]">{{ statsData.activeProjects || 0 }}</span>
        </div>
        <div
          class="card-base flex flex-col items-center justify-center gap-2 rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-6"
        >
          <span class="text-sm font-medium text-[var(--color-text-secondary)]">今日到期任务</span>
          <span class="mono text-4xl font-black text-[var(--color-warning)]">{{ statsData.todayTasks || 0 }}</span>
        </div>
        <div
          class="card-base flex flex-col items-center justify-center gap-2 rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-6 md:col-span-2 xl:col-span-1"
        >
          <span class="text-sm font-medium text-[var(--color-text-secondary)]">已逾期任务</span>
          <span class="mono text-4xl font-black text-[var(--color-danger)]">{{ statsData.overdueTasks || 0 }}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-6">
        <div class="card-base rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-6 xl:col-span-2">
          <h3 class="mb-4 text-lg font-bold text-[var(--color-text-body)]">近 7 天完成趋势</h3>
          <div ref="trendChartRef" class="w-full h-64"></div>
        </div>

        <div
          class="card-base flex max-h-[420px] flex-col rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-6 xl:max-h-none"
        >
          <h3 class="mb-4 text-lg font-bold text-[var(--color-text-body)]">🏆 完成率 Top 排行</h3>
          <div class="flex-1 space-y-4 overflow-y-auto pr-2">
            <div
              v-if="!statsData.topProjects || statsData.topProjects.length === 0"
              class="mt-10 text-center text-sm text-[var(--color-text-tertiary)]"
            >
              暂无数据
            </div>
            <div
              v-for="(proj, index) in statsData.topProjects"
              :key="index"
              class="flex items-center gap-3"
            >
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                :class="
                  index === 0
                    ? 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]'
                    : index === 1
                      ? 'bg-[var(--color-bg-surface-secondary)] text-[var(--color-text-secondary)]'
                      : 'bg-[var(--color-primary-soft-2)] text-[var(--color-primary)]'
                "
              >
                {{ index + 1 }}
              </div>
              <div class="flex-1 truncate text-sm font-medium text-[var(--color-text-body)]">{{ proj.name }}</div>
              <div class="text-sm font-bold text-[var(--color-success)]">{{ proj.rate }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

defineOptions({ name: 'DashboardView' })
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { use, init, graphic, type ECharts, type EChartsCoreOption } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { fetchStatsOverview } from '@/api/stats'
import { useTheme } from '@/composables/useTheme'

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

interface DashboardStats {
  activeProjects: number
  todayTasks: number
  overdueTasks: number
  trendDates: string[]
  trendCounts: number[]
  topProjects: Array<{ name: string; rate: number }>
}

const statsData = ref<DashboardStats>({
  activeProjects: 0,
  todayTasks: 0,
  overdueTasks: 0,
  trendDates: [],
  trendCounts: [],
  topProjects: [],
})

const { resolvedTheme } = useTheme()
const trendChartRef = ref<HTMLElement | null>(null)
let trendChart: ECharts | null = null

const handleResize = () => {
  trendChart?.resize()
}

const getCssVar = (name: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

const buildTrendChartOption = (): EChartsCoreOption => {
  const axisColor = getCssVar('--color-chart-axis', '#9CA3AF')
  const gridColor = getCssVar('--color-chart-grid', '#F3F4F6')
  const tooltipBg = getCssVar('--color-chart-tooltip-bg', 'rgba(255, 255, 255, 0.95)')
  const tooltipText = getCssVar('--color-chart-tooltip-text', '#374151')
  const tooltipShadow = getCssVar('--color-chart-tooltip-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1)')
  const gradientStart = getCssVar('--color-chart-gradient-start', '#60A5FA')
  const gradientEnd = getCssVar('--color-chart-gradient-end', '#3B82F6')

  return {
    grid: { top: 10, right: 10, bottom: 20, left: 30 },
    xAxis: {
      type: 'category',
      data: statsData.value.trendDates,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: axisColor, margin: 12 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed', color: gridColor } },
      axisLabel: { color: axisColor },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBg,
      borderRadius: 8,
      borderWidth: 0,
      padding: [10, 15],
      textStyle: { color: tooltipText, fontWeight: 'bold' },
      extraCssText: `box-shadow: ${tooltipShadow};`,
    },
    series: [
      {
        data: statsData.value.trendCounts,
        type: 'bar',
        barWidth: '25%',
        itemStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: gradientStart },
            { offset: 1, color: gradientEnd },
          ]),
          borderRadius: [6, 6, 0, 0],
        },
      },
    ],
  }
}

const initTrendChart = () => {
  if (!trendChartRef.value) return
  if (!trendChart) {
    trendChart = init(trendChartRef.value)
  }

  trendChart.setOption(buildTrendChartOption(), true)
}

const loadDashboard = async () => {
  try {
    const res = await fetchStatsOverview()
    if (res && typeof res === 'object') {
      const data = res as {
        coreMetrics?: {
          ongoingProjectCount?: number
          dueTodayTaskCount?: number
          overdueTaskCount?: number
        }
        dailyTrends?: Array<{ date: string; completedCount: number }>
        projectRankings?: Array<{ projectName: string; progress: number }>
      }

      statsData.value.activeProjects = data.coreMetrics?.ongoingProjectCount || 0
      statsData.value.todayTasks = data.coreMetrics?.dueTodayTaskCount || 0
      statsData.value.overdueTasks = data.coreMetrics?.overdueTaskCount || 0
      statsData.value.trendDates = (data.dailyTrends || []).map((item) => item.date)
      statsData.value.trendCounts = (data.dailyTrends || []).map((item) => item.completedCount)
      statsData.value.topProjects = (data.projectRankings || []).map((item) => ({
        name: item.projectName,
        rate: item.progress,
      }))
    }

    await nextTick()
    initTrendChart()
  } catch (error) {
    console.error('拉取大屏数据失败', error)
  }
}

onMounted(() => {
  loadDashboard()
  window.addEventListener('resize', handleResize)
})

watch(resolvedTheme, async () => {
  await nextTick()
  initTrendChart()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (trendChart) {
    trendChart.dispose()
    trendChart = null
  }
})
</script>
