<route lang="json5">
{
  style: {
    navigationBarTitleText: '我的',
  },
}
</route>

<template>
  <view class="me-page min-h-screen bg-gray-100">
    <!-- User Info Section -->
    <view class="mb-4 flex items-center bg-white p-6" @click="handleUserInfoClick">
      <view class="mr-4">
        <wd-avatar size="large" :src="userInfo.avatar || defaultAvatar" />
      </view>
      <view class="flex-1">
        <view v-if="isLoggedIn" class="text-xl font-bold">
          {{ userInfo.nickname || userInfo.username || '用户' }}
        </view>
        <view v-if="isLoggedIn" class="mt-1 text-sm text-gray-500">
          {{ userInfo.username || userInfo.userId }}
        </view>
        <view v-else class="text-xl text-gray-800 font-bold">
          点击登录/注册
        </view>
      </view>
      <wd-icon name="chevron-right" size="24px" color="#999" />
    </view>

    <!-- Settings List -->
    <view class="bg-white">
      <wd-cell-group>
        <wd-cell v-if="isLoggedIn" title="个人信息" is-link to="/pages/profile/profile" border />
        <wd-cell v-if="isLoggedIn" title="购买历史" is-link to="/pages/purchases/index" border />
        <wd-cell title="关于我们" icon="" to="/pages/about/about" is-link border />
        <wd-cell title="设置" icon="setting" is-link border />
      </wd-cell-group>
    </view>

    <!-- Logout Button -->
    <view v-if="isLoggedIn" class="mt-4 p-4">
      <wd-button type="error" plain block @click="handleLogout">
        退出登录
      </wd-button>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useUserStore } from '@/store/user'
import { toLoginPage } from '@/utils/toLoginPage'

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)
// Check if userId is valid (assuming -1 is default/invalid)
const isLoggedIn = computed(() => userStore.hasValidLogin)
const defaultAvatar = '/static/images/default-avatar.png'

onShow(() => {
  if (userStore.hasValidLogin && !userStore.hasUserInfo) {
    userStore.fetchUserInfo()
  }
})

function handleUserInfoClick() {
  if (!isLoggedIn.value) {
    toLoginPage()
  }
  else {
    uni.navigateTo({ url: '/pages/profile/profile' })
  }
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.clearUserInfo()
        uni.showToast({ title: '已退出', icon: 'none' })
      }
    },
  })
}
</script>
