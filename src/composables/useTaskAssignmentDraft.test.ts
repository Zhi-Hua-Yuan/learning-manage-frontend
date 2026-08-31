import { describe, expect, it } from 'vitest'

import { useTaskAssignmentDraft } from './useTaskAssignmentDraft'

describe('useTaskAssignmentDraft', () => {
  it('keeps the expected assignee immutable while the target changes', () => {
    const assignment = useTaskAssignmentDraft()
    assignment.open({
      taskId: '10',
      projectId: '20',
      contextKey: 'project:team:30:20',
      currentAssigneeUserId: '1',
    })

    assignment.setTargetAssigneeUserId('2')
    assignment.setReason('  handoff  ')

    expect(assignment.draft.value).toMatchObject({
      expectedAssigneeUserId: '1',
      targetAssigneeUserId: '2',
      reason: '  handoff  ',
    })
    expect(assignment.operation.value).toBe('REASSIGN')
    expect(assignment.reasonResult.value).toMatchObject({ valid: true, value: 'handoff' })
    expect(assignment.canConfirm.value).toBe(true)
  })

  it('fails closed for no-op and invalid reason drafts', () => {
    const assignment = useTaskAssignmentDraft()
    assignment.open({
      taskId: '10',
      projectId: '20',
      contextKey: 'project:team:30:20',
      currentAssigneeUserId: null,
    })

    expect(assignment.operation.value).toBe('NO_CHANGE')
    expect(assignment.canConfirm.value).toBe(false)

    assignment.setTargetAssigneeUserId('2')
    assignment.setReason('bad\nreason')
    expect(assignment.reasonResult.value).toMatchObject({
      valid: false,
      code: 'CONTROL_CHARACTER',
    })
    expect(assignment.canConfirm.value).toBe(false)
  })

  it('invalidates and clears the complete draft when context or task changes', () => {
    const assignment = useTaskAssignmentDraft()
    assignment.open({
      taskId: '10',
      projectId: '20',
      contextKey: 'project:team:30:20',
      currentAssigneeUserId: '1',
    })
    assignment.setTargetAssigneeUserId('2')
    assignment.setReason('sensitive reason')

    expect(assignment.invalidateUnlessCurrent('project:team:30:20', '10')).toBe(false)
    expect(assignment.draft.value).not.toBeNull()
    expect(assignment.invalidateUnlessCurrent('project:team:31:20', '10')).toBe(true)
    expect(assignment.draft.value).toBeNull()
  })
})
