import 'axios'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Controls whether an authentication failure invalidates the active session. */
    authFailureMode?: 'GLOBAL' | 'LOCAL'
  }
}

export {}
