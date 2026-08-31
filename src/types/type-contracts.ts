import type {
  NormalizedReviewVisibilityScope,
  ReviewWriteVisibilityScope,
  SharedWeeklyReview,
  WeeklyReviewSavePayload,
  WeeklyReviewUpdatePayload,
} from './review'
import type {
  AssignTaskPayload,
  CreateTaskPayload,
  TaskCapabilities,
  UpdateTaskContentPayload,
} from './task'

type Assert<T extends true> = T
type AssertFalse<T extends false> = T

type ExpectedAssigneeIsRequired = Record<never, never> extends Pick<AssignTaskPayload, 'expectedAssigneeUserId'> ? false : true
type CreateTaskHasAssignee = 'assigneeUserId' extends keyof CreateTaskPayload ? true : false
type CreateTaskHasStatus = 'status' extends keyof CreateTaskPayload ? true : false
type ContentUpdateHasStatus = 'status' extends keyof UpdateTaskContentPayload ? true : false
type ContentUpdateHasProjectId = 'projectId' extends keyof UpdateTaskContentPayload ? true : false
type ReviewSaveHasYearAndWeek = 'year' | 'weekNo' extends keyof WeeklyReviewSavePayload ? true : false
type ReviewUpdateHasId = 'id' extends keyof WeeklyReviewUpdatePayload ? true : false
type ReviewUpdateHasYearOrWeek = Extract<'year' | 'weekNo', keyof WeeklyReviewUpdatePayload> extends never ? false : true
type ReviewWriteAllowsUnknown = 'UNKNOWN' extends ReviewWriteVisibilityScope ? true : false
type NormalizedReviewAllowsUnknown = 'UNKNOWN' extends NormalizedReviewVisibilityScope ? true : false
type SharedReviewHasPrivateFields = Extract<'reflection' | 'nextPlan' | 'taskIds', keyof SharedWeeklyReview> extends never ? false : true
type CapabilitiesHaveCoarseEdit = 'canEdit' extends keyof TaskCapabilities ? true : false

type _ExpectedAssigneeIsRequired = Assert<ExpectedAssigneeIsRequired>
type _CreateTaskHasAssignee = Assert<CreateTaskHasAssignee>
type _CreateTaskHasNoStatus = AssertFalse<CreateTaskHasStatus>
type _ContentUpdateHasNoStatus = AssertFalse<ContentUpdateHasStatus>
type _ContentUpdateHasNoProjectId = AssertFalse<ContentUpdateHasProjectId>
type _ReviewSaveHasYearAndWeek = Assert<ReviewSaveHasYearAndWeek>
type _ReviewUpdateHasId = Assert<ReviewUpdateHasId>
type _ReviewUpdateHasNoYearOrWeek = AssertFalse<ReviewUpdateHasYearOrWeek>
type _ReviewWriteHasNoUnknown = AssertFalse<ReviewWriteAllowsUnknown>
type _NormalizedReviewAllowsUnknown = Assert<NormalizedReviewAllowsUnknown>
type _SharedReviewHasNoPrivateFields = AssertFalse<SharedReviewHasPrivateFields>
type _CapabilitiesHaveNoCoarseEdit = AssertFalse<CapabilitiesHaveCoarseEdit>

export const typeContractChecks = true
