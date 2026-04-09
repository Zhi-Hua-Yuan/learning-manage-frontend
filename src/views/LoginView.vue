<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
      <div class="text-center mb-10">
        <img
          src="@/assets/logo.png"
          alt="SmartPath Logo"
          class="w-16 h-16 mx-auto mb-4 rounded-2xl shadow-md object-cover transform hover:scale-105 transition-transform"
        />
        <h2 class="text-3xl font-black text-gray-800 mb-2 tracking-tight">欢迎使用智径</h2>
        <p class="text-sm text-gray-500 font-medium">大学生的智能成长路径管理系统</p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">账号</label>
          <input
            v-model="form.account"
            type="text"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="请输入账号"
          />
        </div>

        <div v-if="isRegisterMode">
          <label class="block text-sm font-medium text-gray-700 mb-2">昵称</label>
          <input
            v-model="form.username"
            type="text"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="请输入昵称"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">密码</label>
          <input
            v-model="form.password"
            type="password"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="请输入密码"
          />
        </div>

        <div v-if="isRegisterMode">
          <label class="block text-sm font-medium text-gray-700 mb-2">确认密码</label>
          <input
            v-model="form.confirmPassword"
            type="password"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="请再次输入密码"
          />
        </div>

        <div
          v-if="errorMessage"
          class="text-red-500 text-sm font-bold text-center mb-4 animate-pulse"
        >
          ⚠️ {{ errorMessage }}
        </div>

        <button
          type="submit"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center"
          :disabled="loading"
        >
          <span v-if="loading">{{ isRegisterMode ? '注册中...' : '登录中...' }}</span>
          <span v-else>{{ isRegisterMode ? '注 册' : '登 录' }}</span>
        </button>

        <div class="text-center text-sm">
          <button
            type="button"
            class="text-blue-600 hover:text-blue-700 font-medium"
            @click="toggleMode"
          >
            {{ isRegisterMode ? '已有账号？返回登录' : '没有账号？点击注册' }}
          </button>
        </div>
      </form>
    </div>

    <transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="toast.show"
        class="fixed top-6 right-6 z-50 flex items-center w-full max-w-xs p-4 space-x-3 text-gray-700 bg-white rounded-xl shadow-2xl border-l-4"
        :class="toast.type === 'success' ? 'border-emerald-500' : 'border-red-500'"
      >
        <div
          class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg"
          :class="
            toast.type === 'success' ? 'text-emerald-500 bg-emerald-100' : 'text-red-500 bg-red-100'
          "
        >
          <span v-if="toast.type === 'success'">✅</span>
          <span v-else>⚠️</span>
        </div>
        <div class="ml-3 text-sm font-bold">{{ toast.message }}</div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { loginApi, registerApi } from '@/api/user'

const router = useRouter()
const loading = ref(false)
const isRegisterMode = ref(false)
const errorMessage = ref('')
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
  toast.value = { show: true, message: msg, type }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

type LoginResponse = {
  token: string
}

const form = ref({
  account: '',
  username: '',
  password: '',
  confirmPassword: '',
})

watch(isRegisterMode, () => {
  errorMessage.value = ''
  form.value.password = ''
  form.value.confirmPassword = ''
})

watch(
  () => form.value,
  () => {
    if (errorMessage.value) errorMessage.value = ''
  },
  { deep: true },
)

const toggleMode = () => {
  isRegisterMode.value = !isRegisterMode.value
}

const handleSubmit = async () => {
  errorMessage.value = ''

  if (!form.value.account) {
    errorMessage.value = '账号不能为空'
    return
  }

  if (!form.value.password) {
    errorMessage.value = '密码不能为空'
    return
  }

  if (isRegisterMode.value && !form.value.username) {
    errorMessage.value = '昵称不能为空'
    return
  }

  if (isRegisterMode.value && form.value.password.length < 8) {
    errorMessage.value = '密码长度不能少于 8 位'
    return
  }

  if (isRegisterMode.value && form.value.password !== form.value.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }

  loading.value = true
  try {
    if (isRegisterMode.value) {
      await registerApi(form.value)

      showToast('注册成功！请登录', 'success')
      isRegisterMode.value = false
      return
    }

    const res = (await loginApi({
      account: form.value.account,
      password: form.value.password,
    })) as unknown as LoginResponse

    localStorage.setItem('token', res.token)

    router.push('/')
  } catch (error: unknown) {
    // 兼容多种拦截器抛出的错误结构
    const err = error as {
      response?: { data?: { message?: string } }
      message?: string
      data?: { message?: string }
    }

    const backendMsg =
      err?.response?.data?.message ||
      err?.message ||
      err?.data?.message ||
      (isRegisterMode.value ? '注册失败，请检查填写内容' : '账号或密码错误')

    errorMessage.value = backendMsg
  } finally {
    loading.value = false
  }
}
</script>
