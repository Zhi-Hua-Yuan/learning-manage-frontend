<template>
  <div class="min-h-screen bg-[var(--color-bg-page)] px-4 py-6 sm:flex sm:items-center sm:justify-center">
    <div class="w-full max-w-md rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8">
      <div class="mb-8 text-center sm:mb-10">
        <img
          src="@/assets/logo.png"
          alt="SmartPath Logo"
          class="w-16 h-16 mx-auto mb-4 rounded-2xl shadow-md object-cover transform hover:scale-105 transition-transform"
        />
        <h2 class="mb-2 text-3xl font-black tracking-tight text-[var(--color-text-primary)]">欢迎使用智径</h2>
        <p class="text-sm font-medium text-[var(--color-text-secondary)]">大学生的智能成长路径管理系统</p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--color-text-body)]">账号</label>
          <input
            v-model="form.account"
            type="text"
            required
            class="focus-ring w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-2 text-[var(--color-text-body)]"
            placeholder="请输入账号"
          />
        </div>

        <div v-if="isRegisterMode">
          <label class="mb-2 block text-sm font-medium text-[var(--color-text-body)]">昵称</label>
          <input
            v-model="form.username"
            type="text"
            required
            class="focus-ring w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-2 text-[var(--color-text-body)]"
            placeholder="请输入昵称"
          />
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-[var(--color-text-body)]">密码</label>
          <input
            v-model="form.password"
            type="password"
            required
            class="focus-ring w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-2 text-[var(--color-text-body)]"
            placeholder="请输入密码"
          />
        </div>

        <div v-if="isRegisterMode">
          <label class="mb-2 block text-sm font-medium text-[var(--color-text-body)]">确认密码</label>
          <input
            v-model="form.confirmPassword"
            type="password"
            required
            class="focus-ring w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-2 text-[var(--color-text-body)]"
            placeholder="请再次输入密码"
          />
        </div>

        <div
          v-if="errorMessage"
          class="mb-4 text-center text-sm font-bold text-[var(--color-danger)]"
        >
          {{ errorMessage }}
        </div>

        <button
          type="submit"
          class="btn-primary flex w-full items-center justify-center rounded-lg py-2.5 font-medium"
          :disabled="loading"
        >
          <span v-if="loading">{{ isRegisterMode ? '注册中...' : '登录中...' }}</span>
          <span v-else>{{ isRegisterMode ? '注 册' : '登 录' }}</span>
        </button>

        <div class="text-center text-sm">
          <button
            type="button"
            class="font-medium text-[var(--color-text-body)] transition-colors hover:text-[var(--color-text-primary)]"
            @click="toggleMode"
          >
            {{ isRegisterMode ? '已有账号？返回登录' : '没有账号？点击注册' }}
          </button>
        </div>
      </form>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { loginApi, registerApi } from '@/api/user'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const toast = useToast()
const loading = ref(false)
const isRegisterMode = ref(false)
const errorMessage = ref('')

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
    errorMessage.value = '账号不能为空，请输入账号后重试。'
    return
  }

  if (!form.value.password) {
    errorMessage.value = '密码不能为空，请输入密码后重试。'
    return
  }

  if (isRegisterMode.value && !form.value.username) {
    errorMessage.value = '昵称不能为空，请输入昵称后重试。'
    return
  }

  if (isRegisterMode.value && form.value.password.length < 8) {
    errorMessage.value = '密码长度不能少于 8 位，请修改后重试。'
    return
  }

  if (isRegisterMode.value && form.value.password !== form.value.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致，请确认后重试。'
    return
  }

  loading.value = true
  try {
    if (isRegisterMode.value) {
      await registerApi(form.value)

      toast.success('注册成功，请登录。')
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
      (isRegisterMode.value ? '注册失败，请检查填写信息后重试。' : '登录失败，请检查账号或密码后重试。')

    errorMessage.value = backendMsg
  } finally {
    loading.value = false
  }
}
</script>
