export const PROJECT_LIST_UPDATED_EVENT = 'tick:project-list-updated'

export interface ProjectListUpdatedDetail {
  source?: string
}

const canUseWindow = () => typeof window !== 'undefined'

export const emitProjectListUpdated = (source?: string) => {
  if (!canUseWindow()) return
  window.dispatchEvent(
    new CustomEvent<ProjectListUpdatedDetail>(PROJECT_LIST_UPDATED_EVENT, {
      detail: { source },
    }),
  )
}

export const onProjectListUpdated = (handler: EventListener) => {
  if (!canUseWindow()) return
  window.addEventListener(PROJECT_LIST_UPDATED_EVENT, handler)
}

export const offProjectListUpdated = (handler: EventListener) => {
  if (!canUseWindow()) return
  window.removeEventListener(PROJECT_LIST_UPDATED_EVENT, handler)
}
