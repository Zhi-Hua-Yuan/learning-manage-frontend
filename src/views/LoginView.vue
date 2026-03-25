<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
      <h2 class="text-2xl font-bold text-center text-gray-800 mb-8">✅ 滴答清单 - 登录</h2>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">账号</label>
          <input
            v-model="loginForm.account"
            type="text"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="请输入账号"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">密码</label>
          <input
            v-model="loginForm.password"
            type="password"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="请输入密码"
          />
        </div>

        <button
          type="submit"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center"
          :disabled="loading"
        >
          <span v-if="loading">登录中...</span>
          <span v-else>登 录</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginApi } from '@/api/user'

const router = useRouter()
const loading = ref(false)

const loginForm = reactive({
  account: '',
  password: '',
})

const handleLogin = async () => {
  loading.value = true
  try {
    // 1. 调用后端登录接口
    const res: any = await loginApi(loginForm)

    // 2. 拿到 Token，存入浏览器的 LocalStorage
    // 注意：请确认你后端的 UserLoginVo 里存放 token 的字段名是不是叫 token
    localStorage.setItem('token', res.token)

    // 3. 登录成功，跳转到主页面
    router.push('/')
  } catch (error: any) {
    alert('登录失败：' + error.message)
  } finally {
    loading.value = false
  }
}
</script>
