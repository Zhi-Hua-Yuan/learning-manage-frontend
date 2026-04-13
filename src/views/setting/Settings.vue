<template>
  <main class="relative flex flex-1 flex-col overflow-y-auto bg-[var(--color-bg-page)] p-4 sm:p-6 lg:p-8">
    <div class="mx-auto w-full max-w-3xl space-y-6">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="flex items-center gap-2 text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">⚙️ 个人设置</h2>
      </div>

      <div class="card-base overflow-hidden rounded-2xl bg-[var(--color-bg-surface)]">
        <div class="flex border-b border-[var(--color-divider-muted)]">
          <button
            @click="settingsTab = 'basic'"
            :class="
              settingsTab === 'basic'
                ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)]'
            "
            class="flex-1 py-4 text-sm font-bold border-b-2 transition-colors"
          >
            基本信息
          </button>
          <button
            @click="settingsTab = 'security'"
            :class="
              settingsTab === 'security'
                ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)]'
            "
            class="flex-1 py-4 text-sm font-bold border-b-2 transition-colors"
          >
            安全设置
          </button>
        </div>

        <div v-if="settingsTab === 'basic'" class="space-y-6 p-5 sm:p-8">
          <div>
            <label class="mb-2 block text-sm font-bold text-[var(--color-text-body)]">登录账号 (不可修改)</label>
            <input
              :value="currentUserInfo.account"
              disabled
              type="text"
              class="w-full cursor-not-allowed rounded-xl border border-[var(--color-input-border)] bg-[var(--color-disabled-bg)] px-4 py-3 text-sm text-[var(--color-disabled-text)]"
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-bold text-[var(--color-text-body)]">显示昵称</label>
            <input
              v-model="updateInfoForm.username"
              type="text"
              maxlength="20"
              class="w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-text-body)] outline-none transition-all focus:border-[var(--color-input-border-focus)] focus:ring-2 focus:ring-[var(--color-input-ring)]"
            />
            <p
              class="mt-2 text-xs"
              :class="isUsernameLengthValid ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-warning)]'"
            >
              {{ usernameLengthTip }}
            </p>
          </div>
          <div>
            <label class="mb-2 block text-sm font-bold text-[var(--color-text-body)]">主题模式</label>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                v-for="option in themeOptions"
                :key="option.value"
                type="button"
                class="rounded-xl border px-4 py-3 text-sm font-semibold transition-colors"
                :class="
                  themeMode === option.value
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft-2)] text-[var(--color-primary)]'
                    : 'border-[var(--color-input-border)] bg-[var(--color-bg-surface-muted)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-surface-secondary)]'
                "
                @click="applyThemeMode(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
            <p class="mt-2 text-xs text-[var(--color-text-secondary)]">
              跟随系统模式会根据设备的深浅色设置自动切换。
            </p>
          </div>
          <div class="pt-4">
            <button
              @click="handleUpdateInfo"
              class="btn-primary px-6"
            >
              保存修改
            </button>
          </div>
        </div>

        <div v-if="settingsTab === 'security'" class="space-y-6 p-5 sm:p-8">
          <div>
            <label class="mb-2 block text-sm font-bold text-[var(--color-text-body)]">当前密码</label>
            <input
              v-model="updatePwdForm.oldPassword"
              type="password"
              placeholder="请输入旧密码"
              class="w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-text-body)] outline-none transition-all focus:border-[var(--color-input-border-focus)] focus:ring-2 focus:ring-[var(--color-input-ring)]"
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-bold text-[var(--color-text-body)]">新密码</label>
            <input
              v-model="updatePwdForm.newPassword"
              type="password"
              placeholder="至少 8 位"
              class="w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-text-body)] outline-none transition-all focus:border-[var(--color-input-border-focus)] focus:ring-2 focus:ring-[var(--color-input-ring)]"
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-bold text-[var(--color-text-body)]">确认新密码</label>
            <input
              v-model="updatePwdForm.confirmNewPassword"
              type="password"
              placeholder="再次输入新密码"
              class="w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-text-body)] outline-none transition-all focus:border-[var(--color-input-border-focus)] focus:ring-2 focus:ring-[var(--color-input-ring)]"
            />
          </div>
          <div class="pt-4">
            <button
              @click="handleUpdatePassword"
              class="btn-danger px-6"
            >
              更新密码
            </button>
          </div>
        </div>
      </div>
    </div>

    <transition
      enter-active-class="ease-out duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showReLoginModal"
        class="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none"
      >
        <div class="fixed inset-0 bg-[var(--color-backdrop-strong)] backdrop-blur-sm transition-opacity"></div>

        <div class="relative w-auto max-w-sm mx-auto my-6 z-50 transform transition-all">
          <div
            class="surface-panel relative flex w-full flex-col overflow-hidden rounded-2xl border-0 outline-none focus:outline-none"
          >
            <div class="h-1 w-full bg-[var(--color-primary)]"></div>
            <div class="p-8 pb-4 flex flex-col items-center text-center">
              <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-soft-2)]">
                <span class="text-3xl">🔒</span>
              </div>
              <h3 class="mb-2 text-xl font-black text-[var(--color-text-primary)]">密码修改成功</h3>
              <p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                您的账户安全信息已更新，为了保障账号安全，请使用新密码重新登录系统。
              </p>
            </div>
            <div class="flex items-center justify-center p-6 pt-2">
              <button
                class="btn-primary w-full gap-2 rounded-xl px-6 py-3 text-sm font-bold outline-none focus:outline-none"
                type="button"
                @click="confirmReLogin"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  ></path>
                </svg>
                前往重新登录
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

defineOptions({ name: 'SettingsView' })
import { useRouter } from 'vue-router'
import { getUserMeApi, updatePasswordApi, updateUserInfoApi } from '@/api/user'
import { type ThemeMode, useTheme } from '@/composables/useTheme'
import { useToast } from '@/composables/useToast'

interface CurrentUserInfo {
  username?: string
  account?: string
}

const USER_INFO_UPDATED_EVENT = 'tick:user-updated'
const USERNAME_MIN_LENGTH = 2
const USERNAME_MAX_LENGTH = 20

const router = useRouter()
const toast = useToast()
const showReLoginModal = ref(false)
const { themeMode, setThemeMode } = useTheme()

const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
]

const confirmReLogin = async () => {
  localStorage.removeItem('token')
  await router.push('/login')
}

const applyThemeMode = (mode: ThemeMode) => {
  setThemeMode(mode)
}

const settingsTab = ref<'basic' | 'security'>('basic')
const currentUserInfo = ref<CurrentUserInfo>({})
const updateInfoForm = ref({ username: '' })
const updatePwdForm = ref({ oldPassword: '', newPassword: '', confirmNewPassword: '' })
const trimmedUsername = computed(() => updateInfoForm.value.username.trim())
const isUsernameLengthValid = computed(
  () =>
    trimmedUsername.value.length >= USERNAME_MIN_LENGTH &&
    trimmedUsername.value.length <= USERNAME_MAX_LENGTH,
)
const usernameLengthTip = computed(() => {
  const length = trimmedUsername.value.length
  if (length === 0) {
    return `昵称长度需为 ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} 位。`
  }
  if (length < USERNAME_MIN_LENGTH || length > USERNAME_MAX_LENGTH) {
    return `当前 ${length} 位，昵称长度需为 ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} 位。`
  }
  return `当前 ${length} 位。`
})

const loadUserInfo = async () => {
  try {
    const res = await getUserMeApi()
    currentUserInfo.value = res && typeof res === 'object' ? (res as CurrentUserInfo) : {}
    updateInfoForm.value.username = currentUserInfo.value.username || ''
  } catch (error) {
    console.error('获取用户信息失败', error)
  }
}

const handleUpdateInfo = async () => {
  const username = trimmedUsername.value
  if (!username) {
    toast.error('昵称不能为空，请输入后重试。')
    return
  }
  if (!isUsernameLengthValid.value) {
    toast.error(`昵称长度需为 ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} 位，请修改后重试。`)
    return
  }

  try {
    await updateUserInfoApi({ username })
    currentUserInfo.value = { ...currentUserInfo.value, username }
    updateInfoForm.value.username = username
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<CurrentUserInfo>(USER_INFO_UPDATED_EVENT, {
          detail: { username, account: currentUserInfo.value.account },
        }),
      )
    }
    toast.success('信息已更新。')
    void loadUserInfo()
  } catch {
    toast.error('修改失败，请稍后重试。')
  }
}

const handleUpdatePassword = async () => {
  const { oldPassword, newPassword, confirmNewPassword } = updatePwdForm.value
  if (!oldPassword || !newPassword || !confirmNewPassword) {
    toast.error('请完整填写密码信息后重试。')
    return
  }
  if (newPassword !== confirmNewPassword) {
    toast.error('两次输入的新密码不一致，请确认后重试。')
    return
  }
  if (newPassword.length < 8) {
    toast.error('新密码长度不能少于 8 位，请修改后重试。')
    return
  }

  try {
    await updatePasswordApi({ oldPassword, newPassword })
    showReLoginModal.value = true
  } catch (error: unknown) {
    const backendMessage =
      error &&
      typeof error === 'object' &&
      'response' in error &&
      (error as { response?: { data?: { message?: string } } }).response?.data?.message
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
    const errorMsg = backendMessage || '修改密码失败，请检查旧密码后重试。'
    toast.error(errorMsg)
  }
}

onMounted(() => {
  loadUserInfo()
})
</script>
