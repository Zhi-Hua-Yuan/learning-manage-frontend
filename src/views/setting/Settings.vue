<template>
  <main class="flex-1 flex flex-col relative bg-gray-50 overflow-y-auto p-8">
    <div class="max-w-3xl mx-auto w-full space-y-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">⚙️ 个人设置</h2>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="flex border-b border-gray-100">
          <button
            @click="settingsTab = 'basic'"
            :class="
              settingsTab === 'basic'
                ? 'border-blue-500 text-blue-600'
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
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            "
            class="flex-1 py-4 text-sm font-bold border-b-2 transition-colors"
          >
            安全设置
          </button>
        </div>

        <div v-if="settingsTab === 'basic'" class="p-8 space-y-6">
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
              class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-blue-400 transition-all"
            />
          </div>
          <div class="pt-4">
            <button
              @click="handleUpdateInfo"
              class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-sm"
            >
              保存修改
            </button>
          </div>
        </div>

        <div v-if="settingsTab === 'security'" class="p-8 space-y-6">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">当前密码</label>
            <input
              v-model="updatePwdForm.oldPassword"
              type="password"
              placeholder="请输入旧密码"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-blue-400 transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">新密码</label>
            <input
              v-model="updatePwdForm.newPassword"
              type="password"
              placeholder="至少 8 位"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-blue-400 transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">确认新密码</label>
            <input
              v-model="updatePwdForm.confirmNewPassword"
              type="password"
              placeholder="再次输入新密码"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-blue-400 transition-all"
            />
          </div>
          <div class="pt-4">
            <button
              @click="handleUpdatePassword"
              class="bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-sm"
            >
              更新密码
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getUserMeApi, updatePasswordApi, updateUserInfoApi } from '@/api/user'

interface CurrentUserInfo {
  username?: string
  account?: string
}

const router = useRouter()

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
    alert('昵称不能为空')
    return
  }

  try {
    await updateUserInfoApi({ username: updateInfoForm.value.username })
    alert('✅ 信息修改成功！')
    await loadUserInfo()
  } catch {
    alert('修改失败')
  }
}

const handleUpdatePassword = async () => {
  const { oldPassword, newPassword, confirmNewPassword } = updatePwdForm.value
  if (!oldPassword || !newPassword || !confirmNewPassword) {
    alert('请完整填写密码信息')
    return
  }
  if (newPassword !== confirmNewPassword) {
    alert('两次输入的新密码不一致')
    return
  }
  if (newPassword.length < 8) {
    alert('新密码长度不能少于 8 位')
    return
  }

  try {
    await updatePasswordApi({ oldPassword, newPassword })
    alert('✅ 密码修改成功！请重新登录。')
    localStorage.removeItem('token')
    await router.push('/login')
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      (error as { response?: { data?: { message?: string } } }).response?.data?.message
    ) {
      alert((error as { response?: { data?: { message?: string } } }).response?.data?.message)
      return
    }
    alert('修改密码失败')
  }
}

onMounted(() => {
  loadUserInfo()
})
</script>
