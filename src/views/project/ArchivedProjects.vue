<template>
  <main class="relative flex flex-1 flex-col overflow-y-auto bg-[var(--color-bg-page)] p-4 sm:p-6 lg:p-8">
    <div class="mx-auto w-full max-w-2xl space-y-6">
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 class="flex items-center gap-2 text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
          <AppIcon name="archive" class="h-5 w-5" />
          归档清单
        </h2>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent"></div>
        <span class="ml-3 text-sm text-[var(--color-text-secondary)]">加载中...</span>
      </div>

      <div v-else-if="archivedProjectList.length === 0" class="rounded-xl border border-dashed border-[var(--color-input-border)] bg-[var(--color-bg-surface)] px-4 py-12 text-center">
        <AppIcon name="archive" class="mx-auto mb-3 h-10 w-10 text-[var(--color-text-tertiary)]" />
        <p class="text-sm text-[var(--color-text-secondary)]">暂无归档清单</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="project in archivedProjectList"
          :key="project.id"
          class="card-base flex items-center justify-between rounded-xl bg-[var(--color-bg-surface)] p-4"
        >
          <div class="flex items-center gap-3">
            <AppIcon :name="getProjectIconName(project.icon)" class="h-5 w-5" />
            <div>
              <div class="font-bold text-[var(--color-text-body)]">{{ project.name }}</div>
              <div class="text-xs text-[var(--color-text-secondary)]">完成 {{ project.displayProgress }}%</div>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              class="btn-secondary rounded-lg px-4 py-3 text-sm font-bold"
              @click="handleRecover(project.id)"
            >
              取消归档
            </button>
            <button
              class="rounded-lg bg-[var(--color-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--color-danger)]"
              @click="handleDelete(project.id, project.name)"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <AppConfirmDialog
      v-model="showDeleteConfirm"
      variant="danger"
      icon-name="trash"
      title="确认删除该清单？"
      message="删除后将无法恢复。"
      confirm-text="确认删除"
      cancel-text="取消"
      @confirm="executeDelete"
    />
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import AppIcon, { type IconName } from '@/components/AppIcon.vue'
import { deleteProjectApi, fetchArchivedProjectsApi, recoverProjectApi } from '@/api/project'
import { fetchTaskList } from '@/api/task'
import { useToast } from '@/composables/useToast'
import {
  hasProjectProgressValue,
  readProjectListCache,
  readProjectProgressCache,
  resolveProjectProgress,
  writeProjectListCache,
  writeProjectProgressCache,
} from '@/utils/projectCache'
import { emitProjectListUpdated } from '@/utils/projectEvents'

interface ArchivedProject {
  id: string
  name: string
  icon: string
  progress?: number
  completionRate?: number
  completeRate?: number
  completion?: number
  percent?: number
  process?: number
}

interface ArchivedProjectView extends ArchivedProject {
  displayProgress: number
}

interface TaskRecord {
  status: number
}

interface TaskListResponse {
  records?: TaskRecord[]
  total?: number
}

const toast = useToast()

const archivedProjectList = ref<ArchivedProjectView[]>([])
const loading = ref(false)
const showDeleteConfirm = ref(false)
const pendingDelete = ref<{ id: string; name: string } | null>(null)

const getProjectIconName = (icon?: string): IconName => {
  const iconMap: Record<string, IconName> = {
    folder: 'folder',
    flag: 'flag',
    target: 'target',
    document: 'document',
  }
  return iconMap[icon || 'folder'] || 'folder'
}

const toProjectRecord = (project: ArchivedProject) => project as unknown as Record<string, unknown>

const toArchivedProjectView = (project: ArchivedProject): ArchivedProjectView => {
  const record = toProjectRecord(project)
  const serverHasProgress = hasProjectProgressValue(record)
  const serverProgress = resolveProjectProgress(record)
  const cachedProgress = readProjectProgressCache(project.id)
  return {
    ...project,
    displayProgress: serverHasProgress ? serverProgress : (cachedProgress ?? serverProgress),
  }
}

const loadProjectTasksForProgress = async (projectId: string) => {
  const size = 200
  let current = 1
  const allTasks: TaskRecord[] = []
  let total = 0

  while (true) {
    const taskRes = await fetchTaskList({
      projectId,
      current,
      size,
    })
    const data = taskRes as unknown as TaskListResponse
    const records = data.records || []
    if (current === 1) {
      total = Number(data.total) || 0
    }

    allTasks.push(...records)

    const hasLoadedAllByTotal = total > 0 && allTasks.length >= total
    const reachedLastPage = records.length < size
    if (hasLoadedAllByTotal || reachedLastPage) {
      return allTasks
    }

    current += 1
  }
}

const refreshArchivedProgress = async (records: ArchivedProject[]) => {
  const recordsToRefresh = records.filter((project) => {
    const record = toProjectRecord(project)
    const serverHasProgress = hasProjectProgressValue(record)
    const cachedProgress = readProjectProgressCache(project.id)
    return !serverHasProgress && cachedProgress === null
  })

  if (!recordsToRefresh.length) return

  const result = await Promise.allSettled(
    recordsToRefresh.map(async (project) => {
      const tasks = await loadProjectTasksForProgress(project.id)
      if (!tasks.length) {
        const fallback = resolveProjectProgress(toProjectRecord(project))
        writeProjectProgressCache(project.id, fallback)
        return { id: project.id, progress: fallback }
      }

      const completedCount = tasks.filter((task) => task.status === 2).length
      const progress = Math.round((completedCount / tasks.length) * 100)
      writeProjectProgressCache(project.id, progress)
      return { id: project.id, progress }
    }),
  )

  const progressMap = new Map<string, number>()
  result.forEach((item) => {
    if (item.status === 'fulfilled') {
      progressMap.set(item.value.id, item.value.progress)
    }
  })

  if (!progressMap.size) return

  archivedProjectList.value = archivedProjectList.value.map((project) => {
    const nextProgress = progressMap.get(project.id)
    if (typeof nextProgress !== 'number') return project
    return {
      ...project,
      displayProgress: nextProgress,
    }
  })
}

const loadArchivedProjects = async () => {
  const cachedRecords = readProjectListCache<ArchivedProject>(1)
  if (cachedRecords && cachedRecords.length > 0) {
    archivedProjectList.value = cachedRecords.map(toArchivedProjectView)
    loading.value = false
  } else {
    loading.value = true
  }

  try {
    const res = await fetchArchivedProjectsApi()
    const records = (res as unknown as { records?: ArchivedProject[] })?.records
    const safeRecords = records || []
    archivedProjectList.value = safeRecords.map(toArchivedProjectView)
    writeProjectListCache(1, safeRecords)
    void refreshArchivedProgress(safeRecords)
  } catch {
    if (!cachedRecords) {
      toast.error('加载归档清单失败。')
    }
  } finally {
    loading.value = false
  }
}

const handleRecover = async (id: string) => {
  try {
    await recoverProjectApi(id)
    emitProjectListUpdated('archived-projects')
    toast.success('清单已恢复。')
    await loadArchivedProjects()
  } catch {
    toast.error('恢复失败，请重试。')
  }
}

const handleDelete = (id: string, name: string) => {
  pendingDelete.value = { id, name }
  showDeleteConfirm.value = true
}

const executeDelete = async () => {
  if (!pendingDelete.value) return
  try {
    await deleteProjectApi(pendingDelete.value.id)
    toast.success('清单已删除。')
    showDeleteConfirm.value = false
    pendingDelete.value = null
    await loadArchivedProjects()
  } catch {
    toast.error('删除失败，请重试。')
    showDeleteConfirm.value = false
  }
}

onMounted(() => {
  loadArchivedProjects()
})
</script>
