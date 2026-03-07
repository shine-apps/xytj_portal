<template>
  <view class="register-page min-h-screen bg-white p-6">
    <view class="mb-8 mt-10 text-center text-3xl text-gray-800 font-bold">
      注册账号
    </view>

    <view class="pt-4 space-y-4">
      <wd-input v-model="form.name" placeholder="请输入昵称" clearable prefix-icon="user" />
      <wd-input v-model="form.email" placeholder="请输入邮箱" clearable prefix-icon="mail" />
      <wd-input v-model="form.password" show-password placeholder="请输入密码" clearable prefix-icon="lock-on" />
      <wd-input v-model="form.confirmPassword" show-password placeholder="请确认密码" clearable prefix-icon="lock-on" />

      <view class="pt-6">
        <wd-button block type="primary" size="large" :loading="loading" @click="handleRegister">
          注册
        </wd-button>
      </view>
    </view>

    <view class="mt-6 text-center text-sm text-gray-500">
      已有账号？ <navigator url="/pages/login/login" open-type="navigateBack" hover-class="none" class="inline text-primary">
        立即登录
      </navigator>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue'
import { signUpEmail } from '@/api/better-auth'

definePage({
  style: {
    navigationBarTitleText: '注册',
  },
})

const loading = ref(false)
const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const validateEmail = (email: string) => /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email)

async function handleRegister() {
  if (!form.name || !form.email || !form.password || !form.confirmPassword) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }

  if (!validateEmail(form.email)) {
    uni.showToast({ title: '请输入正确的邮箱', icon: 'none' })
    return
  }

  if (form.password !== form.confirmPassword) {
    uni.showToast({ title: '两次输入的密码不一致', icon: 'none' })
    return
  }

  if (form.password.length < 6) {
    uni.showToast({ title: '密码长度至少6位', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const res = await signUpEmail({
      name: form.name,
      email: form.email,
      password: form.password,
    })

    if (res && (res.statusCode === 200 || res.statusCode === 201)) {
      uni.showToast({ title: '注册成功', icon: 'success' })
      setTimeout(() => {
        // 注册成功后，跳转到登录页
        uni.navigateBack()
      }, 1500)
    }
    else {
      uni.showToast({ title: '注册失败', icon: 'none' })
    }
  }
  catch (err: any) {
    uni.showToast({ title: err.message || '注册失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}
</script>
