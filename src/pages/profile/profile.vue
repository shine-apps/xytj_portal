<route lang="json5">
{
  style: {
    navigationBarTitleText: '个人信息',
  },
}
</route>

<template>
  <view class="profile-page min-h-screen bg-gray-100 p-4">
    <button
      class="mb-4 flex flex-col items-center justify-center rounded-lg bg-white p-6 after:border-none"
      open-type="chooseAvatar"
      hover-class="none"
      @chooseavatar="onChooseAvatar"
      @click="handleAvatarClick"
    >
      <view class="relative">
        <wd-img
          :src="form.avatar || defaultAvatar"
          round
          width="80px"
          height="80px"
        />
        <view class="absolute bottom-0 right-0 h-6 w-6 flex items-center justify-center rounded-full bg-primary p-1 text-white">
          <wd-icon name="camera" size="14px" />
        </view>
      </view>
      <text class="mt-2 text-sm text-gray-500">
        点击修改头像
      </text>
    </button>

    <view class="mb-6 overflow-hidden rounded-lg bg-white">
      <wd-input
        v-model="form.nickname"
        type="nickname"
        label="昵称"
        placeholder="请输入昵称"
        clearable
        no-border
      />
    </view>

    <wd-button block type="primary" size="large" :loading="loading" @click="handleSave">
      保存修改
    </wd-button>
  </view>
</template>

<script lang="ts" setup>
import { isMpWeixin } from '@uni-helper/uni-env'
import { computed, reactive, ref } from 'vue'
import useUpload from '@/hooks/useUpload'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)
const defaultAvatar = '/static/images/default-avatar.png'
const loading = ref(false)

const form = reactive({
  nickname: userInfo.value.nickname || userInfo.value.username || '',
  avatar: userInfo.value.avatar || '',
})

const { run: uploadAvatar, upload } = useUpload({
  success: (res) => {
    console.log('Upload success', res)
    if (res && res.url) {
      form.avatar = res.url
    }
    else if (typeof res === 'string') {
      // Fallback if returns direct string url (unlikely but possible)
      if (res.startsWith('http')) {
        form.avatar = res
      }
    }
  },
  error: (err) => {
    console.error('Upload failed', err)
    uni.showToast({ title: '上传失败', icon: 'none' })
  },
})

function onChooseAvatar(e: any) {
  const { avatarUrl } = e.detail
  if (avatarUrl) {
    upload(avatarUrl)
  }
}

function handleAvatarClick() {
  if (isMpWeixin)
    return
  uploadAvatar()
}

async function handleSave() {
  if (!form.nickname) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const success = await userStore.updateProfile({
      nickname: form.nickname,
      avatar: form.avatar,
    })

    if (success) {
      uni.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
    else {
      uni.showToast({ title: '保存失败', icon: 'none' })
    }
  }
  catch (e) {
    console.error(e)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.profile-page {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
