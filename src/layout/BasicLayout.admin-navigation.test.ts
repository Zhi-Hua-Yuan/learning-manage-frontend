import { describe, expect, it } from 'vitest'
import source from './BasicLayout.vue?raw'

describe('BasicLayout administrator navigation', () => {
  it('retains the loaded system role when team refresh fails', () => {
    const initialize = source.slice(
      source.indexOf('const initializeCollaboration'),
      source.indexOf('const handleUserInfoUpdated'),
    )

    expect(initialize).toContain('const currentUser = collaborationStore.currentUser')
    expect(initialize).toContain('role: currentUser.role')
  })
})
