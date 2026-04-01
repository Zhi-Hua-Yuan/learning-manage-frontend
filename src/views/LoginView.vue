<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
      <h2 class="text-2xl font-bold text-center text-gray-800 mb-8">
        {{ isRegisterMode ? '✅ 滴答清单 - 注册新账号' : '✅ 滴答清单 - 登录' }}
      </h2>

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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginApi, registerApi } from '@/api/user'

const router = useRouter()
const loading = ref(false)
const isRegisterMode = ref(false)

type LoginResponse = {
  token: string
}

const form = ref({
  account: '',
  username: '',
  password: '',
  confirmPassword: '',
})

const toggleMode = () => {
  isRegisterMode.value = !isRegisterMode.value
  form.value.password = ''
  form.value.confirmPassword = ''
}

const handleSubmit = async () => {
  loading.value = true
  try {
    if (isRegisterMode.value) {
      if (form.value.password !== form.value.confirmPassword) {
        alert('两次输入的密码不一致，请重新确认')
        return
      }

      await registerApi(form.value)

      alert('注册成功，请登录')
      isRegisterMode.value = false
      form.value.password = ''
      form.value.confirmPassword = ''
      return
    }

    const res = (await loginApi({
      account: form.value.account,
      password: form.value.password,
    })) as unknown as LoginResponse

    localStorage.setItem('token', res.token)

    router.push('/')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误'
    alert((isRegisterMode.value ? '注册失败：' : '登录失败：') + message)
  } finally {
    loading.value = false
  }
}
</script>
