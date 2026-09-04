import { describe, expect, it } from 'vitest'

import { isAiListRequestContextActive } from '@/utils/aiRequestContext'

describe('isAiListRequestContextActive', () => {
  it('only accepts the list that originated the AI request', () => {
    expect(isAiListRequestContextActive({
      isAggregateView: false,
      currentListId: 'project-b',
      requestListId: 'project-a',
    })).toBe(false)
    expect(isAiListRequestContextActive({
      isAggregateView: false,
      currentListId: 'project-a',
      requestListId: ' project-a ',
    })).toBe(true)
  })

  it('never associates a list replan error with an aggregate view', () => {
    expect(isAiListRequestContextActive({
      isAggregateView: true,
      currentListId: 'project-a',
      requestListId: 'project-a',
    })).toBe(false)
  })
})
