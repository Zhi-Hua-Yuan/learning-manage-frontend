import { onScopeDispose } from 'vue'

import {
  registerSessionResetHandler,
  type SessionResetReason,
} from '@/utils/sessionLifecycle'

/**
 * Register a synchronous page-owned reset handler for the current component
 * lifetime. Session reset handlers must only clear local state; they must not
 * issue requests or navigate.
 */
export const useSessionResetHandler = (
  handler: (reason: SessionResetReason) => void,
) => {
  const unregister = registerSessionResetHandler(handler)
  onScopeDispose(unregister)
}
