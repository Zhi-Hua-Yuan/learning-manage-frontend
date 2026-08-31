import type { AssignTaskPayload, TaskCapabilities } from './task'
import type { SharedWeeklyReview } from './review'

type Assert<T extends true> = T
type AssertFalse<T extends false> = T

type ExpectedAssigneeIsRequired = Record<never, never> extends Pick<AssignTaskPayload, 'expectedAssigneeUserId'> ? false : true
type SharedReviewHasPrivateFields = Extract<'reflection' | 'nextPlan' | 'taskIds', keyof SharedWeeklyReview> extends never ? false : true
type CapabilitiesHaveCoarseEdit = 'canEdit' extends keyof TaskCapabilities ? true : false

type _ExpectedAssigneeIsRequired = Assert<ExpectedAssigneeIsRequired>
type _SharedReviewHasNoPrivateFields = AssertFalse<SharedReviewHasPrivateFields>
type _CapabilitiesHaveNoCoarseEdit = AssertFalse<CapabilitiesHaveCoarseEdit>

export const typeContractChecks = true
