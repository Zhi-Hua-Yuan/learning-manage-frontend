import request from '../utils/request'
import type { EntityId, WirePage } from '@/types/common'
import type {
  AssignTaskPayload,
  ChangeTaskStatusPayload,
  CreateTaskPayload,
  TaskAssignmentHistoryPageWire,
  TaskAssignmentResultWire,
  TaskStatusResultWire,
  TaskWire,
  UpdateTaskContentPayload,
} from '@/types/task'
import { omitUndefined, requireEntityId } from './guards'

export interface TaskListParams {
  projectId?: EntityId
  status?: number
  isOverdue?: boolean
  current?: number
  size?: number
}

// 获取任务列表 (对应你后端的 GET /task/list)
export const fetchTaskList = (params: TaskListParams): Promise<WirePage<TaskWire>> => {
  return request.get<unknown, Promise<WirePage<TaskWire>>>('/task/list', { params }) as unknown as Promise<WirePage<TaskWire>>
}

// 新增任务 (对应你后端的 POST /task/add)
export const addTaskApi = (data: CreateTaskPayload) => {
  return request.post('/task/add', data)
}

/** Typed content-only update for the PR7 task editor. Status changes use changeTaskStatusApi. */
export const updateTaskContentApi = (data: UpdateTaskContentPayload) => {
  return request.post<unknown, Promise<unknown>, UpdateTaskContentPayload>('/task/update', data)
}

// 删除任务 (对应你后端的 POST /task/delete)
export const deleteTaskApi = (id: EntityId) => {
  return request.post(`/task/delete/${id}`)
}

export const assignTaskApi = (data: AssignTaskPayload) => {
  return request.post<unknown, Promise<TaskAssignmentResultWire>, AssignTaskPayload>('/task/assign', data)
}

export const fetchTaskAssignmentHistoryApi = (
  rawTaskId: EntityId,
  params?: { current?: number; size?: number },
) => {
  const taskId = requireEntityId(rawTaskId, 'taskId')
  const query = omitUndefined({ current: params?.current, size: params?.size })
  return request.get<unknown, Promise<TaskAssignmentHistoryPageWire>>(
    `/task/${encodeURIComponent(taskId)}/assignment-history`,
    { params: query },
  )
}

export const changeTaskStatusApi = (data: ChangeTaskStatusPayload) => {
  return request.post<unknown, Promise<TaskStatusResultWire>, ChangeTaskStatusPayload>(
    '/task/status/change',
    data,
  )
}
