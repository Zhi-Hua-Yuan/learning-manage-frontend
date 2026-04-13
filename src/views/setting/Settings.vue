<template>
  <main class="relative flex flex-1 flex-col overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
    <div class="mx-auto w-full max-w-3xl space-y-6">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="flex items-center gap-2 text-xl font-bold text-gray-800 sm:text-2xl">⚙️ 个人设置</h2>
      </div>

      <div class="card-base overflow-hidden rounded-2xl bg-[#fcfcfa]">
        <div class="flex border-b border-gray-100">
          <button
            @click="settingsTab = 'basic'"
            :class="
              settingsTab === 'basic'
                ? 'border-gray-400 text-gray-800'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            "
            class="flex-1 py-4 text-sm font-bold border-b-2 transition-colors"
          >
            基本信息
          </button>
          <button
            @click="settingsTab = 'security'"
            :class="
              settingsTab === 'security'
                ? 'border-gray-400 text-gray-800'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            "
            class="flex-1 py-4 text-sm font-bold border-b-2 transition-colors"
          >
            安全设置
          </button>
        </div>

        <div v-if="settingsTab === 'basic'" class="space-y-6 p-5 sm:p-8">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">登录账号 (不可修改)</label>
            <input
              :value="currentUserInfo.account"
              disabled
              type="text"
              class="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">显示昵称</label>
            <input
              v-model="updateInfoForm.username"
              type="text"
              class="w-full rounded-xl border border-gray-200 bg-[#f7f7f5] px-4 py-3 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white"
            />
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
            <label class="block text-sm font-bold text-gray-700 mb-2">当前密码</label>
            <input
              v-model="updatePwdForm.oldPassword"
              type="password"
              placeholder="请输入旧密码"
              class="w-full rounded-xl border border-gray-200 bg-[#f7f7f5] px-4 py-3 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white"
            />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">新密码</label>
            <input
              v-model="updatePwdForm.newPassword"
              type="password"
              placeholder="至少 8 位"
              class="w-full rounded-xl border border-gray-200 bg-[#f7f7f5] px-4 py-3 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white"
            />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">确认新密码</label>
            <input
              v-model="updatePwdForm.confirmNewPassword"
              type="password"
              placeholder="再次输入新密码"
              class="w-full rounded-xl border border-gray-200 bg-[#f7f7f5] px-4 py-3 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white"
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
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"></div>

        <div class="relative w-auto max-w-sm mx-auto my-6 z-50 transform transition-all">
          <div
            class="relative flex flex-col w-full bg-white border-0 rounded-2xl shadow-xl outline-none focus:outline-none overflow-hidden"
          >
            <div class="h-1 w-full bg-blue-500"></div>
            <div class="p-8 pb-4 flex flex-col items-center text-center">
              <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                <span class="text-3xl">🔒</span>
              </div>
              <h3 class="text-xl font-black text-gray-800 mb-2">密码修改成功</h3>
              <p class="text-sm text-gray-500 leading-relaxed">
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
import { onMounted, ref } from 'vue'

defineOptions({ name: 'SettingsView' })
import { useRouter } from 'vue-router'
import { getUserMeApi, updatePasswordApi, updateUserInfoApi } from '@/api/user'
import { useToast } from '@/composables/useToast'

interface CurrentUserInfo {
  username?: string
  account?: string
}

const router = useRouter()
const toast = useToast()
const showReLoginModal = ref(false)

const confirmReLogin = async () => {
  localStorage.removeItem('token')
  await router.push('/login')
}

const settingsTab = ref<'basic' | 'security'>('basic')
const currentUserInfo = ref<CurrentUserInfo>({})
const updateInfoForm = ref({ username: '' })
const updatePwdForm = ref({ oldPassword: '', newPassword: '', confirmNewPassword: '' })

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
  if (!updateInfoForm.value.username) {
    toast.error('昵称不能为空，请输入后重试。')
    return
  }

  try {
    await updateUserInfoApi({ username: updateInfoForm.value.username })
    toast.success('信息已更新。')
    await loadUserInfo()
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
