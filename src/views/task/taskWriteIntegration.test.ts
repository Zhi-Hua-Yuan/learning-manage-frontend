import { describe, expect, it } from 'vitest'

import taskListSource from './TaskList.vue?raw'

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

describe('TaskList write integration contract', () => {
  it('routes status changes through the dedicated endpoint and refreshes server facts', () => {
    const calls = extractObjectArgumentCalls('changeTaskStatusApi')

    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain('taskId: task.id')
    expect(calls[0]).toContain('targetStatus: nextStatus')
    expect(calls[0]).toContain('expectedStatus: oldStatus')
    expect(calls[0]).toContain('clientRequestId')
    expect(taskListSource).toMatch(
      /task\.status = normalizeTaskStatusResult\(result\.finalStatus\)[\s\S]*?await loadTasks\(\{ forceRefresh: true \}\)/,
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
      expect(call).toContain('id: selectedTask.value.id')
    }

    expect(calls.some((call) => call.includes('priority: val'))).toBe(true)
    expect(calls.some((call) => call.includes('dueDate: finalDate'))).toBe(true)
    expect(calls.some((call) => call.includes('milestoneId: finalMilestoneId'))).toBe(true)
    expect(calls.some((call) => call.includes('title: selectedTask.value.title')
      && call.includes('description: selectedTask.value.description'))).toBe(true)
  })
})
