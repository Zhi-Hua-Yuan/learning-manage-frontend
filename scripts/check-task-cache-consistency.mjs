import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const taskListPath = path.join(rootDir, 'src', 'views', 'task', 'TaskList.vue')
const taskCachePath = path.join(rootDir, 'src', 'utils', 'taskCache.ts')
const taskApiPath = path.join(rootDir, 'src', 'api', 'task.ts')
const taskStatusMutationPath = path.join(
  rootDir,
  'src',
  'composables',
  'useTaskStatusMutation.ts',
)

const checks = [
  {
    file: taskStatusMutationPath,
    label: 'Status mutation uses the dedicated endpoint with the frozen idempotent command',
    pattern: /await changeTaskStatusApi\(\{[\s\S]*?taskId: command\.taskId[\s\S]*?targetStatus: command\.targetStatus[\s\S]*?expectedStatus: command\.expectedStatus[\s\S]*?clientRequestId: command\.clientRequestId[\s\S]*?\}\)/m,
  },
  {
    file: taskListPath,
    label: 'Status update flow applies the normalized result before reconciliation',
    pattern: /applyTaskStatusSnapshot\(state, outcome\.result\.finalStatus, outcome\.result\.completedAt\)[\s\S]*?reconcileTaskStatusFacts\(state,/m,
  },
  {
    file: taskListPath,
    label: 'Status reconciliation refreshes server facts',
    pattern: /const reconcileTaskStatusFacts[\s\S]*?await loadTasks\(\{ forceRefresh: true \}\)/m,
  },
  {
    file: taskListPath,
    label: 'Priority update flow uses the content-only endpoint and refreshes facts',
    pattern: /await updateTaskContentApi\(\{ id: currentTask\.id, priority: val \}\)[\s\S]*?await loadTasks\(\{ forceRefresh: true(?:, contextSnapshot: writeSnapshot\.context)? \}\)/m,
  },
  {
    file: taskListPath,
    label: 'Task page does not call the deprecated task update API',
    pattern: /\bupdateTaskApi\b/,
    invert: true,
  },
  {
    file: taskApiPath,
    label: 'Task API does not export the deprecated task update API',
    pattern: /\bupdateTaskApi\b/,
    invert: true,
  },
  {
    file: taskListPath,
    label: 'Delete flow removes from both caches',
    pattern: /(?:if \(canUsePersistentProjectTaskCache\.value\) \{\s*)?removeTaskFromCaches\(taskToDelete\)/m,
  },
  {
    file: taskListPath,
    label: 'Project refresh syncs aggregate cache by project',
    pattern: /writeTaskCache\(requestProjectId, taskList\.value\)\s*\n\s*syncAggregateTaskCacheByProject\(requestProjectId, taskList\.value\)/m,
  },
  {
    file: taskListPath,
    label: 'Aggregate refresh writes grouped all-project cache',
    pattern: /writeAggregateTaskCacheFromRecords\(records\)/m,
  },
  {
    file: taskCachePath,
    label: 'Task cache module provides centralized upsert helper',
    pattern: /export const upsertTaskInCaches = \(task: TaskModel\)/m,
  },
  {
    file: taskCachePath,
    label: 'Task cache module provides centralized remove helper',
    pattern: /export const removeTaskFromCaches = \(task: Pick<TaskModel, 'id' \| 'projectId'>\)/m,
  },
  {
    file: taskCachePath,
    label: 'Task cache module provides project aggregate sync helper',
    pattern: /export const syncAggregateTaskCacheByProject = \(projectId: string, tasks: TaskModel\[\]\)/m,
  },
]

const failures = []

checks.forEach((item) => {
  const content = fs.readFileSync(item.file, 'utf8')
  const matched = item.pattern.test(content)
  if (item.invert ? matched : !matched) {
    failures.push(item.label)
  }
})

if (failures.length > 0) {
  console.error('Task cache consistency regression checks failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Task cache consistency regression checks passed.')
