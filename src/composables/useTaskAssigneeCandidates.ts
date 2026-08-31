import { computed, ref, watch, type Ref } from 'vue'

import { useCollaborationStore } from '@/stores/collaboration'
import type { TeamMemberContext } from '@/types/team'
import type { ApiErrorKind } from '@/utils/request'
import { classifyApiError } from '@/utils/request'
import {
  buildPersonalTaskAssigneeOptions,
  buildTeamTaskAssigneeOptions,
  type TaskAssigneeOption,
} from '@/utils/taskAssigneeOptions'

export type TaskAssigneeCandidateContext =
  | { kind: 'personal' }
  | { kind: 'team'; teamId: string }
  | { kind: 'unavailable' }

export type TaskAssigneeCandidateStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'unavailable'

type CollaborationStore = ReturnType<typeof useCollaborationStore>

export interface UseTaskAssigneeCandidatesOptions {
  context: Readonly<Ref<TaskAssigneeCandidateContext>>
  store?: CollaborationStore
}

const ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  AUTHENTICATION_REQUIRED: '登录状态已失效，请重新登录。',
  PERMISSION_DENIED: '当前团队已不可访问。',
  CONFLICT: '团队成员信息刚刚发生变化，请重新加载。',
  VALIDATION: '团队成员请求参数无效，请重试。',
  NOT_FOUND: '当前团队或成员信息已失效。',
  SERVER: '团队成员暂时无法加载，请稍后重试。',
  NETWORK: '无法加载团队成员，请检查网络后重试。',
  UNKNOWN: '无法加载团队成员，请稍后重试。',
}

const normalizeTeamId = (value: unknown) => {
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value)
  return null
}

const getContextKey = (context: TaskAssigneeCandidateContext) => {
  if (context.kind === 'team') {
    const teamId = normalizeTeamId(context.teamId)
    return teamId ? `team:${teamId}` : 'unavailable'
  }
  return context.kind
}

export const useTaskAssigneeCandidates = ({
  context,
  store = useCollaborationStore(),
}: UseTaskAssigneeCandidatesOptions) => {
  const requestVersion = ref(0)
  const status = ref<TaskAssigneeCandidateStatus>('idle')
  const errorKind = ref<ApiErrorKind | null>(null)
  const readyContextKey = ref<string | null>(null)
  const readyMembers = ref<Record<string, TeamMemberContext[]>>({})

  const contextKey = computed(() => getContextKey(context.value))
  const loading = computed(() => status.value === 'loading')
  const errorMessage = computed(() => (
    status.value === 'error' && errorKind.value
      ? ERROR_MESSAGES[errorKind.value]
      : null
  ))

  const options = computed<TaskAssigneeOption[]>(() => {
    const currentContext = context.value

    if (currentContext.kind === 'personal') {
      return buildPersonalTaskAssigneeOptions(store.currentUser)
    }

    if (
      currentContext.kind !== 'team'
      || status.value !== 'ready'
      || readyContextKey.value !== contextKey.value
    ) {
      return []
    }

    return buildTeamTaskAssigneeOptions(
      currentContext.teamId,
      readyMembers.value[currentContext.teamId] ?? [],
    )
  })

  const setContextState = () => {
    readyContextKey.value = null
    readyMembers.value = {}
    errorKind.value = null

    if (context.value.kind === 'personal') {
      status.value = store.currentUser ? 'ready' : 'unavailable'
      return
    }

    status.value = context.value.kind === 'team' ? 'idle' : 'unavailable'
  }

  const invalidateRequest = () => {
    requestVersion.value += 1
  }

  const reset = () => {
    invalidateRequest()
    setContextState()
  }

  const loadCandidates = async (): Promise<boolean> => {
    const currentContext = context.value
    const currentContextKey = contextKey.value
    const version = ++requestVersion.value

    readyContextKey.value = null
    errorKind.value = null

    if (currentContext.kind === 'personal') {
      status.value = store.currentUser ? 'ready' : 'unavailable'
      return Boolean(store.currentUser)
    }

    if (currentContext.kind !== 'team' || !normalizeTeamId(currentContext.teamId)) {
      status.value = 'unavailable'
      return false
    }

    status.value = 'loading'

    try {
      const loadedMembers = await store.ensureTeamMembers(currentContext.teamId, { force: true })

      if (version !== requestVersion.value || currentContextKey !== contextKey.value) return false

      readyMembers.value = {
        [currentContext.teamId]: Array.isArray(loadedMembers) ? loadedMembers : [],
      }
      status.value = 'ready'
      readyContextKey.value = currentContextKey
      return true
    } catch (error) {
      if (version !== requestVersion.value || currentContextKey !== contextKey.value) return false

      status.value = 'error'
      errorKind.value = classifyApiError(error)
      return false
    }
  }

  const retry = () => loadCandidates()

  const isSelectableAssignee = (userId: string | null) => {
    if (userId === null && context.value.kind === 'team') return true
    return options.value.some((option) => option.value === userId && !option.disabled)
  }

  watch(
    [contextKey, () => store.currentUser?.id],
    () => {
      invalidateRequest()
      setContextState()
    },
    { immediate: true, flush: 'sync' },
  )

  return {
    options,
    status,
    loading,
    errorMessage,
    readyContextKey,
    loadCandidates,
    retry,
    reset,
    isSelectableAssignee,
  }
}
