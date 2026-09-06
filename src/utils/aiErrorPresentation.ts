import { isApiRequestError } from '@/utils/request'

export type AiRecoveryAction =
  | 'RETRY'
  | 'EDIT_INPUT'
  | 'REFRESH_STATE'
  | 'CONTACT_ADMIN'
  | 'NONE'

export interface AiErrorPresentation {
  message: string
  action: AiRecoveryAction
  actionLabel: string | null
  retryable: boolean
  traceId: string | null
}

interface KnownAiError {
  message: string
  action: AiRecoveryAction
  actionLabel: string | null
  retryable: boolean
}

const KNOWN_AI_ERRORS: Record<number, KnownAiError> = {
  30001: {
    message: 'AI 服务暂时不可用，输入内容已保留。',
    action: 'RETRY',
    actionLabel: '重新尝试',
    retryable: true,
  },
  30002: {
    message: 'AI 服务响应超时，本次结果未确认，输入内容已保留。',
    action: 'RETRY',
    actionLabel: '重新尝试',
    retryable: true,
  },
  30003: {
    message: 'AI 返回结果格式异常，原有内容已保留。',
    action: 'RETRY',
    actionLabel: '重新生成',
    retryable: true,
  },
  30004: {
    message: 'AI 服务配置异常，请联系管理员处理。',
    action: 'CONTACT_ADMIN',
    actionLabel: null,
    retryable: false,
  },
  30005: {
    message: 'AI 草稿当前不可确认，请刷新服务端状态。',
    action: 'REFRESH_STATE',
    actionLabel: '刷新状态',
    retryable: false,
  },
  30006: {
    message: 'AI 草稿已过期，请刷新服务端状态。',
    action: 'REFRESH_STATE',
    actionLabel: '刷新状态',
    retryable: false,
  },
  30007: {
    message: 'AI 草稿版本不受支持，请刷新服务端状态。',
    action: 'REFRESH_STATE',
    actionLabel: '刷新状态',
    retryable: false,
  },
  30008: {
    message: 'AI 草稿状态已变化，请刷新后再操作。',
    action: 'REFRESH_STATE',
    actionLabel: '刷新状态',
    retryable: false,
  },
  30009: {
    message: 'AI 生成功能当前已关闭。',
    action: 'NONE',
    actionLabel: null,
    retryable: false,
  },
  30010: {
    message: 'AI 服务当前请求较多，输入内容已保留。',
    action: 'RETRY',
    actionLabel: '稍后重试',
    retryable: true,
  },
  30011: {
    message: '输入中包含禁止发送的敏感信息，请修改后再试。',
    action: 'EDIT_INPUT',
    actionLabel: '修改输入',
    retryable: false,
  },
  32001: {
    message: '项目问答功能当前未启用。',
    action: 'NONE',
    actionLabel: null,
    retryable: false,
  },
  32002: {
    message: '项目知识索引尚未准备完成，请稍后重试。',
    action: 'RETRY',
    actionLabel: '稍后重试',
    retryable: true,
  },
  32003: {
    message: '项目问答依赖暂时不可用，输入内容已保留。',
    action: 'RETRY',
    actionLabel: '重新尝试',
    retryable: true,
  },
  32004: {
    message: '没有找到该问答结果。',
    action: 'NONE',
    actionLabel: null,
    retryable: false,
  },
  32005: {
    message: '该问答结果已因来源删除或权限变化失效。',
    action: 'NONE',
    actionLabel: null,
    retryable: false,
  },
  32006: {
    message: '该问答结果已过期，请重新提问。',
    action: 'RETRY',
    actionLabel: '重新提问',
    retryable: true,
  },
  32007: {
    message: 'AI 返回的引用未通过校验，本次结果没有保存。',
    action: 'RETRY',
    actionLabel: '重新生成',
    retryable: true,
  },
  32008: {
    message: '回答生成期间项目内容发生变化，请重新提问。',
    action: 'RETRY',
    actionLabel: '重新提问',
    retryable: true,
  },
  32009: {
    message: '精确排序服务暂时不可用，系统无法完成本次问答。',
    action: 'RETRY',
    actionLabel: '重新尝试',
    retryable: true,
  },
  42900: {
    message: 'AI 调用过于频繁，请稍后手动重试。',
    action: 'RETRY',
    actionLabel: '稍后重试',
    retryable: true,
  },
}

export const resolveAiErrorPresentation = (
  error: unknown,
  fallbackMessage = 'AI 请求失败，请稍后重试。',
): AiErrorPresentation => {
  if (!isApiRequestError(error)) {
    return {
      message: fallbackMessage,
      action: 'RETRY',
      actionLabel: '重新尝试',
      retryable: true,
      traceId: null,
    }
  }

  const known = error.code === null ? null : KNOWN_AI_ERRORS[error.code]
  if (known) return { ...known, traceId: error.traceId }

  if (error.httpStatus === null && error.code === null) {
    return {
      message: 'AI 请求未完成，请检查网络后手动重试。',
      action: 'RETRY',
      actionLabel: '重新尝试',
      retryable: true,
      traceId: error.traceId,
    }
  }

  if (
    error.code === null
    && error.httpStatus !== null
    && (error.httpStatus === 408
      || error.httpStatus === 425
      || error.httpStatus === 429
      || error.httpStatus >= 500)
  ) {
    return {
      message: 'AI 服务暂时未完成请求，页面内容已保留，请稍后手动重试。',
      action: 'RETRY',
      actionLabel: '重新尝试',
      retryable: true,
      traceId: error.traceId,
    }
  }

  return {
    message: fallbackMessage,
    action: 'NONE',
    actionLabel: null,
    retryable: false,
    traceId: error.traceId,
  }
}
