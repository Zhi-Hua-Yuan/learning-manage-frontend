import { describe, expect, it } from 'vitest'

import taskListSource from './TaskList.vue?raw'
import taskStatusMutationSource from '@/composables/useTaskStatusMutation.ts?raw'

const extractObjectArgumentCalls = (functionName: string) => {
  const calls: string[] = []
  const marker = `${functionName}({`
  let searchFrom = 0

  while (searchFrom < taskListSource.length) {
    const callStart = taskListSource.indexOf(marker, searchFrom)
    if (callStart < 0) break

    const objectStart = callStart + marker.length - 1
    let depth = 0
    let objectEnd = -1

    for (let index = objectStart; index < taskListSource.length; index += 1) {
      const character = taskListSource[index]
      if (character === '{') depth += 1
      if (character === '}') {
        depth -= 1
        if (depth === 0) {
          objectEnd = index
          break
        }
      }
    }

    if (objectEnd < 0) throw new Error(`Unclosed ${functionName} object argument`)
    calls.push(taskListSource.slice(callStart, objectEnd + 1))
    searchFrom = objectEnd + 1
  }

  return calls
}

const extractFunctionBlock = (functionName: string) => {
  const declarationStart = taskListSource.indexOf(`const ${functionName} =`)
  if (declarationStart < 0) throw new Error(`Missing ${functionName} declaration`)

  const arrowStart = taskListSource.indexOf('=>', declarationStart)
  const blockStart = taskListSource.indexOf('{', arrowStart)
  if (arrowStart < 0 || blockStart < 0) throw new Error(`Missing ${functionName} block`)

  let depth = 0
  for (let index = blockStart; index < taskListSource.length; index += 1) {
    const character = taskListSource[index]
    if (character === '{') depth += 1
    if (character === '}') {
      depth -= 1
      if (depth === 0) {
        return taskListSource.slice(declarationStart, index + 1)
      }
    }
  }

  throw new Error(`Unclosed ${functionName} block`)
}

const expectOrderedMarkers = (source: string, markers: string[]) => {
  let previousIndex = -1
  markers.forEach((marker) => {
    const index = source.indexOf(marker)
    expect(index, `Missing marker: ${marker}`).toBeGreaterThan(previousIndex)
    previousIndex = index
  })
}

describe('TaskList write integration contract', () => {
  it('routes status changes through the dedicated endpoint and refreshes server facts', () => {
    expect(taskStatusMutationSource).toContain('changeTaskStatusApi({')
    expect(taskStatusMutationSource).toContain('taskId: command.taskId')
    expect(taskStatusMutationSource).toContain('targetStatus: command.targetStatus')
    expect(taskStatusMutationSource).toContain('expectedStatus: command.expectedStatus')
    expect(taskStatusMutationSource).toContain('clientRequestId: command.clientRequestId')
    expect(taskStatusMutationSource).toContain('createTaskStatusRequestId()')
    expect(taskListSource).toMatch(
      /applyTaskStatusSnapshot\(state, outcome\.result\.finalStatus, outcome\.result\.completedAt\)[\s\S]*?loadTasks\(\{ forceRefresh: true \}\)/,
    )
    expect(taskListSource).not.toMatch(/\bupdateTaskApi\b/)
  })

  it('keeps every content update on an explicit status-free whitelist', () => {
    const calls = extractObjectArgumentCalls('updateTaskContentApi')

    expect(calls).toHaveLength(4)
    for (const call of calls) {
      expect(call).not.toContain('...')
      expect(call).not.toMatch(/\bstatus\s*:/)
      expect(call).not.toMatch(/\bprojectId\s*:/)
      expect(call).not.toMatch(/\bcapabilities\s*:/)
      expect(call).toContain('id: currentTask.id')
    }

    expect(calls.some((call) => call.includes('priority: val'))).toBe(true)
    expect(calls.some((call) => call.includes('dueDate: finalDate'))).toBe(true)
    expect(calls.some((call) => call.includes('milestoneId: finalMilestoneId'))).toBe(true)
    expect(calls.some((call) => call.includes('title: currentTask.title')
      && call.includes('description: currentTask.description'))).toBe(true)
  })

  it('guards every task mutation with the exact capability before side effects', () => {
    expectOrderedMarkers(extractFunctionBlock('setTaskStatus'), [
      "ensureTaskActionAllowed(task, 'changeStatus')",
      'currentTask.status = nextStatus',
      'submitNewTaskStatusMutation({',
    ])
    expectOrderedMarkers(extractFunctionBlock('selectPriority'), [
      "ensureTaskActionAllowed(selectedTask.value.id, 'reorganize')",
      'currentTask.priority = val',
      'updateTaskContentApi({',
    ])
    expectOrderedMarkers(extractFunctionBlock('updateDueDate'), [
      "ensureTaskActionAllowed(selectedTask.value.id, 'editContent')",
      'currentTask.dueDate = finalDate',
      'updateTaskContentApi({',
    ])
    expectOrderedMarkers(extractFunctionBlock('selectMilestone'), [
      "ensureTaskActionAllowed(selectedTask.value.id, 'reorganize')",
      'currentTask.milestoneId = finalMilestoneId',
      'updateTaskContentApi({',
    ])
    expectOrderedMarkers(extractFunctionBlock('onTextBlur'), [
      "ensureTaskActionAllowed(selectedTask.value.id, 'editContent')",
      'updateTaskContentApi({',
    ])
    expectOrderedMarkers(extractFunctionBlock('requestDeleteTask'), [
      "ensureTaskActionAllowed(selectedTask.value.id, 'delete')",
      'showDeleteTaskConfirm.value = true',
    ])
    expectOrderedMarkers(extractFunctionBlock('confirmDeleteTask'), [
      "ensureTaskActionAllowed(pendingTask.id, 'delete')",
      'taskList.value = taskList.value.filter',
      'deleteTaskApi(taskToDelete.id)',
    ])
  })

  it('resolves the latest task and fails closed before refreshing a denied mutation', () => {
    const resolver = extractFunctionBlock('resolveLatestTask')
    const guard = extractFunctionBlock('ensureTaskActionAllowed')
    const failureHandler = extractFunctionBlock('handleTaskMutationFailure')

    expect(resolver).toContain('findTaskById(taskList.value, taskId)')
    expect(guard).toContain('canPerformTaskAction(latestTask, action)')
    expect(failureHandler).toContain("classifyApiError(error) === 'PERMISSION_DENIED'")
    expectOrderedMarkers(failureHandler, [
      'recoverTaskPermissionDenial(taskId)',
      "toast.warning('任务权限已发生变化，已刷新最新权限。')",
    ])
  })

  it('renders cached snapshots read-only and continues to network revalidation', () => {
    const loadTasks = extractFunctionBlock('loadTasks')

    expect(loadTasks).toMatch(
      /readAllProjectsTaskCache\(\)[\s\S]*?hasCachedSnapshot = true[\s\S]*?Promise\.all/,
    )
    expect(loadTasks).toMatch(
      /readTaskCache\(selectedProjectId\.value\)[\s\S]*?hasCachedSnapshot = true[\s\S]*?fetchTaskList\(\{/,
    )
    expect(loadTasks).toContain('任务权限校验失败，当前缓存仅供查看。')
  })
})
