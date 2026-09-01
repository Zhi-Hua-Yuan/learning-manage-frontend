import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosResponse } from 'axios'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toastPush: vi.fn(),
}))

vi.mock('../router', () => ({
  default: {
    currentRoute: { value: { path: '/tasks' } },
    push: mocks.push,
  },
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({ push: mocks.toastPush }),
}))

import request, { ApiRequestError, classifyApiError } from '@/utils/request'
import { fetchTeamMembersApi, fetchMyTeamsApi } from './team'
import { fetchTeamProjectsApi } from './project'
import {
  addTaskApi,
  assignTaskApi,
  changeTaskStatusApi,
  fetchTaskAssignmentHistoryApi,
  updateTaskContentApi,
} from './task'
import {
  fetchCurrentReview,
  fetchReviewHistory,
  fetchTeamSharedReviewsApi,
  getReviewDetailApi,
  saveWeeklyReviewApi,
  updateWeeklyReviewApi,
} from './review'
import { clearAuthToken } from '@/utils/authToken'

type CapturedRequest = {
  method?: string
  url?: string
  params?: unknown
  data?: unknown
}

const parseBody = (value: unknown) => {
  if (typeof value !== 'string') return value
  return JSON.parse(value) as unknown
}

const mockSuccess = (data: unknown) => {
  let captured: CapturedRequest | undefined
  request.defaults.adapter = async (config) => {
    captured = {
      method: config.method?.toUpperCase(),
      url: config.url,
      params: config.params,
      data: config.data,
    }
    const response: AxiosResponse = {
      data: { code: 0, data },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
    return response
  }
  return () => captured
}

describe('PR7 B2 API clients', () => {
  beforeEach(() => {
    clearAuthToken()
    mocks.push.mockReset()
    mocks.toastPush.mockReset()
  })

  it('calls the current-user team and dynamic member endpoints', async () => {
    const readCurrent = mockSuccess([{ id: 1 }])
    await expect(fetchMyTeamsApi()).resolves.toEqual([{ id: 1 }])
    expect(readCurrent()).toMatchObject({ method: 'GET', url: '/team/my' })

    const readMembers = mockSuccess([{ userId: 2, role: 'MEMBER', joinTime: '2026-08-31T00:00:00Z' }])
    await expect(fetchTeamMembersApi('900719925474099312345')).resolves.toHaveLength(1)
    expect(readMembers()).toMatchObject({
      method: 'GET',
      url: '/team/900719925474099312345/members',
    })
  })

  it('rejects invalid dynamic IDs before issuing a request', () => {
    expect(() => fetchTeamMembersApi('not-an-id')).toThrow(TypeError)
  })

  it('sends team project filters with explicit pagination', async () => {
    const read = mockSuccess({ records: [], current: 2, size: 10, total: 0 })
    await fetchTeamProjectsApi({ teamId: 7, pageNum: 2, pageSize: 10, status: 0, keyword: 'roadmap' })
    expect(read()).toMatchObject({
      method: 'GET',
      url: '/project/team/list',
      params: { teamId: '7', pageNum: 2, pageSize: 10, status: 0, keyword: 'roadmap' },
    })
  })

  it('preserves an explicit unassigned assignee when creating a task', async () => {
    const read = mockSuccess(11)
    await addTaskApi({
      title: 'Prepare review',
      projectId: '7',
      assigneeUserId: null,
    })
    expect(parseBody(read()?.data)).toEqual({
      title: 'Prepare review',
      projectId: '7',
      assigneeUserId: null,
    })
    expect(read()).toMatchObject({ method: 'POST', url: '/task/add' })
  })

  it('preserves explicit null expected assignee in assignment requests', async () => {
    const read = mockSuccess({ changed: true })
    const payload = {
      taskId: '11',
      assigneeUserId: '22',
      expectedAssigneeUserId: null,
    } as const
    await assignTaskApi(payload)
    const body = parseBody(read()?.data) as Record<string, unknown>
    expect(body).toHaveProperty('expectedAssigneeUserId', null)
    expect(read()).toMatchObject({ method: 'POST', url: '/task/assign' })
  })

  it('uses the assignment history route and pagination query', async () => {
    const read = mockSuccess({ records: [], current: 1, size: 20, total: 0 })
    await fetchTaskAssignmentHistoryApi(11, { current: 1, size: 20 })
    expect(read()).toMatchObject({
      method: 'GET',
      url: '/task/11/assignment-history',
      params: { current: 1, size: 20 },
    })
  })

  it('uses the dedicated status-change route', async () => {
    const read = mockSuccess({ changed: true, finalStatus: 2 })
    await changeTaskStatusApi({
      taskId: 11,
      targetStatus: 2,
      clientRequestId: 'request-1',
      expectedStatus: 1,
    })
    expect(read()).toMatchObject({ method: 'POST', url: '/task/status/change' })
    expect(parseBody(read()?.data)).toEqual({
      taskId: 11,
      targetStatus: 2,
      clientRequestId: 'request-1',
      expectedStatus: 1,
    })
  })

  it('keeps the typed task update payload content-only', async () => {
    const read = mockSuccess({ id: 11 })
    await updateTaskContentApi({ id: 11, title: 'Updated title' })
    const body = parseBody(read()?.data) as Record<string, unknown>
    expect(body).toEqual({ id: 11, title: 'Updated title' })
    expect(body).not.toHaveProperty('status')
    expect(read()).toMatchObject({ method: 'POST', url: '/task/update' })
  })

  it('queries paginated team shared reviews', async () => {
    const read = mockSuccess({ records: [], current: 1, size: 20, total: 0 })
    await fetchTeamSharedReviewsApi({ teamId: 7, current: 1, size: 20 })
    expect(read()).toMatchObject({
      method: 'GET',
      url: '/review/team',
      params: { teamId: '7', current: 1, size: 20 },
    })
  })

  it('uses typed author review read routes and validates detail IDs', async () => {
    const readCurrent = mockSuccess({ id: null, visibilityScope: 'PRIVATE' })
    await expect(fetchCurrentReview()).resolves.toMatchObject({ visibilityScope: 'PRIVATE' })
    expect(readCurrent()).toMatchObject({ method: 'GET', url: '/review/current' })

    const readHistory = mockSuccess([{ id: 31, visibilityScope: 'PRIVATE' }])
    await expect(fetchReviewHistory()).resolves.toHaveLength(1)
    expect(readHistory()).toMatchObject({ method: 'GET', url: '/review/history' })

    const readDetail = mockSuccess({ id: '900719925474099312345' })
    await expect(getReviewDetailApi('900719925474099312345')).resolves.toMatchObject({
      id: '900719925474099312345',
    })
    expect(readDetail()).toMatchObject({
      method: 'GET',
      url: '/review/900719925474099312345',
    })
    expect(() => getReviewDetailApi('invalid-id')).toThrow(TypeError)
  })

  it('whitelists the canonical weekly-review save and update bodies', async () => {
    const readSave = mockSuccess(true)
    await saveWeeklyReviewApi({
      year: 2026,
      weekNo: 35,
      visibilityScope: 'TEAM',
      teamId: '7',
      focusProjectId: '9',
      reflection: 'Private reflection',
      nextPlan: 'Next plan',
      sharedSummary: 'Shared summary',
      taskIds: ['11'],
      completedTaskCount: 99,
    } as Parameters<typeof saveWeeklyReviewApi>[0] & { completedTaskCount: number })
    expect(parseBody(readSave()?.data)).toEqual({
      year: 2026,
      weekNo: 35,
      visibilityScope: 'TEAM',
      teamId: '7',
      focusProjectId: '9',
      reflection: 'Private reflection',
      nextPlan: 'Next plan',
      sharedSummary: 'Shared summary',
      taskIds: ['11'],
    })

    const readUpdate = mockSuccess(true)
    await updateWeeklyReviewApi({
      id: '31',
      visibilityScope: 'PRIVATE',
      teamId: null,
      focusProjectId: null,
      reflection: 'Updated reflection',
      nextPlan: 'Updated plan',
      sharedSummary: '',
      taskIds: [],
      year: 2026,
      weekNo: 35,
    } as Parameters<typeof updateWeeklyReviewApi>[0] & { year: number; weekNo: number })
    expect(parseBody(readUpdate()?.data)).toEqual({
      id: '31',
      visibilityScope: 'PRIVATE',
      teamId: null,
      focusProjectId: null,
      reflection: 'Updated reflection',
      nextPlan: 'Updated plan',
      sharedSummary: '',
      taskIds: [],
    })
  })

  it('keeps permission errors local, including HTTP 403 with business code 40300', async () => {
    request.defaults.adapter = async (config) => {
      const response: AxiosResponse = {
        data: { code: 40300, message: '无权限', data: null },
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config,
      }
      return Promise.reject(new AxiosError('Forbidden', 'ERR_BAD_REQUEST', config, undefined, response))
    }

    await expect(fetchMyTeamsApi()).rejects.toMatchObject({
      name: 'ApiRequestError',
      code: 40300,
      httpStatus: 403,
    })
    expect(classifyApiError(new ApiRequestError('无权限', { code: 40300, httpStatus: 403 }))).toBe(
      'PERMISSION_DENIED',
    )
    expect(mocks.push).not.toHaveBeenCalled()
    expect(window.localStorage.getItem('token')).toBeNull()
  })
})
