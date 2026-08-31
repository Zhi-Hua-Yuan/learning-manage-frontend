import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const taskListPath = path.join(rootDir, 'src', 'views', 'task', 'TaskList.vue')
const taskCachePath = path.join(rootDir, 'src', 'utils', 'taskCache.ts')

const checks = [
  {
    file: taskListPath,
    label: 'Status update flow upserts both caches',
    pattern: /await updateTaskApi\(\{ \.\.\.task, status: nextStatus \}\)\s*\n(?:\s*if \(canUsePersistentProjectTaskCache\.value\) \{\s*)?upsertTaskInCaches\(task\)/m,
  },
  {
    file: taskListPath,
    label: 'Priority update flow upserts both caches',
    pattern: /await updateTaskApi\(\{ \.\.\.selectedTask\.value, priority: val \}\)\s*\n(?:\s*if \(canUsePersistentProjectTaskCache\.value\) \{\s*)?upsertTaskInCaches\(selectedTask\.value\)/m,
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
    pattern: /export const upsertTaskInCaches = \(task: Task\)/m,
  },
  {
    file: taskCachePath,
    label: 'Task cache module provides centralized remove helper',
    pattern: /export const removeTaskFromCaches = \(task: Pick<Task, 'id' \| 'projectId'>\)/m,
  },
  {
    file: taskCachePath,
    label: 'Task cache module provides project aggregate sync helper',
    pattern: /export const syncAggregateTaskCacheByProject = \(projectId: string, tasks: Task\[\]\)/m,
  },
]

const failures = []

checks.forEach((item) => {
  const content = fs.readFileSync(item.file, 'utf8')
  if (!item.pattern.test(content)) {
    failures.push(item.label)
  }
})

if (failures.length > 0) {
  console.error('Task cache consistency regression checks failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Task cache consistency regression checks passed.')
