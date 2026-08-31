import type { EntityId } from './common'

export type ReviewVisibilityScope = 'PRIVATE' | 'TEAM' | 'UNKNOWN'

export interface WeeklyReviewDetailWire {
  id?: EntityId
  year?: number
  weekNo?: number
  visibilityScope?: unknown
  teamId?: EntityId | null
  focusProjectId?: EntityId | null
  reflection?: string | null
  nextPlan?: string | null
  sharedSummary?: string | null
  taskIds?: EntityId[]
  startDate?: string
  endDate?: string
  completedTaskCount?: number
  focusProjectName?: string | null
  authorUserId?: EntityId
  createTime?: string
  updateTime?: string
}

export interface WeeklyReviewSavePayload {
  year: number
  weekNo: number
  visibilityScope: ReviewVisibilityScope
  teamId: EntityId | null
  focusProjectId: EntityId | null
  reflection: string
  nextPlan: string
  sharedSummary: string
  taskIds: EntityId[]
}

export interface WeeklyReviewUpdatePayload extends WeeklyReviewSavePayload {
  id: EntityId
}

export interface SharedReviewAuthorWire {
  id?: EntityId
  username?: string | null
}

export interface SharedReviewProjectWire {
  id?: EntityId
  name?: string | null
}

export interface SharedWeeklyReviewWire {
  id?: EntityId
  author?: SharedReviewAuthorWire | null
  year?: number
  weekNo?: number
  startDate?: string
  endDate?: string
  focusProject?: SharedReviewProjectWire | null
  sharedSummary?: string | null
  createTime?: string
  updateTime?: string
}

export interface SharedWeeklyReview {
  id: string
  author: {
    id: string | null
    username: string | null
  }
  year: number
  weekNo: number
  startDate: string | null
  endDate: string | null
  focusProject: {
    id: string | null
    name: string | null
  } | null
  sharedSummary: string | null
  createTime: string | null
  updateTime: string | null
}
