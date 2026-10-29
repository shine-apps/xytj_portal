<script setup lang="ts">
import { isMpWeixin } from '@uni-helper/uni-env'
import { computed, ref, watch } from 'vue'
import { useUserStore } from '@/store/user'
import { staticUrl } from '@/utils'
import { uploadToCos } from '@/utils/cos'
import { isDefaultNickname, isMissingAvatar, needsProfileCompletion } from '@/utils/profileCompletion'

interface ChooseAvatarEvent {
  detail?: {
    avatarUrl?: string
  }
}

const userStore = useUserStore()
const defaultAvatar = staticUrl('/static/images/default-avatar.png')
const visible = ref(false)
const nickname = ref('')
const avatarPath = ref('')
const uploadedAvatarUrl = ref('')
const saving = ref(false)

const needsCompletion = computed(() => needsProfileCompletion({
  hasValidLogin: userStore.hasValidLogin,
  hasUserInfo: userStore.hasUserInfo,
  nickname: userStore.userInfo.nickname,
  avatar: userStore.userInfo.avatar,
}))

watch(needsCompletion, (needed) => {
  visible.value = needed
}, { immediate: true })

watch(visible, (show) => {
  if (show) {
    const currentNickname = userStore.userInfo.nickname
    const currentAvatar = isMissingAvatar(userStore.userInfo.avatar) ? '' : userStore.userInfo.avatar || ''
    nickname.value = isDefaultNickname(currentNickname) ? '' : currentNickname
    avatarPath.value = currentAvatar
    uploadedAvatarUrl.value = currentAvatar
  }
}, { immediate: true })

function close() {
  visible.value = false
}

function setAvatar(path?: string) {
  if (path) {
    avatarPath.value = path
    uploadedAvatarUrl.value = ''
  }
}

function onChooseAvatar(event: ChooseAvatarEvent) {
  setAvatar(event.detail?.avatarUrl)
}

function handleAvatarClick() {
  if (isMpWeixin || saving.value)
    return

  uni.chooseImage({
    count: 1,
    success: (res) => {
      setAvatar(res.tempFilePaths[0])
    },
  })
}

async function handleSubmit() {
  if (saving.value)
    return

  const value = nickname.value.trim()
  if (!value) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }
  if (isDefaultNickname(value)) {
    uni.showToast({ title: '请设置新的昵称', icon: 'none' })
    return
  }
  if (!avatarPath.value) {
    uni.showToast({ title: '请选择头像', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const avatarUrl = uploadedAvatarUrl.value || (await uploadToCos(avatarPath.value)).url
    const success = await userStore.updateProfile({ nickname: value, avatar: avatarUrl })
    if (!success)
      throw new Error('Failed to update profile')

    uni.showToast({ title: '资料已完善', icon: 'success' })
  }
  catch (error) {
    console.error('完善个人资料失败', error)
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <wd-popup
    v-model="visible"
    position="bottom"
    :close-on-click-modal="true"
    :safe-area-inset-bottom="true"
    custom-style="z-index: 1200; border-radius: 24px 24px 0 0; overflow: hidden; background: #fffdf9;"
  >
    <view class="px-6 pb-6 pt-7">
      <view class="text-center">
        <text class="block text-xl text-gray-900 font-bold">完善个人资料</text>
        <text class="mt-2 block text-sm text-gray-500">设置头像与昵称，让大家认识你</text>
      </view>

      <button
        class="mx-auto mb-6 mt-6 flex flex-col items-center bg-transparent p-0 after:border-none"
        open-type="chooseAvatar"
        hover-class="none"
        aria-label="选择头像"
        :disabled="saving"
        @chooseavatar="onChooseAvatar"
        @click="handleAvatarClick"
      >
        <view class="relative">
          <wd-img
            :src="avatarPath || defaultAvatar"
            round
            width="88px"
            height="88px"
            custom-style="border: 2px solid #e7ded2;"
          />
          <view class="absolute bottom-0 right-0 h-7 w-7 flex items-center justify-center rounded-full bg-primary text-white">
            <wd-icon name="camera" size="15px" />
          </view>
        </view>
        <text class="mt-3 text-sm text-gray-500">点击选择头像</text>
      </button>

      <view class="mb-6">
        <text class="mb-2 block text-sm text-gray-700 font-medium">昵称</text>
        <view class="border border-gray-200 rounded-lg bg-white px-3">
          <wd-input
            v-model="nickname"
            type="nickname"
            placeholder="请输入昵称"
            clearable
            no-border
            :disabled="saving"
          />
        </view>
      </view>

      <view class="flex gap-3">
        <wd-button
          plain
          block
          :disabled="saving"
          custom-style="color: #a33327; border-color: #a33327; border-radius: 12px;"
          @click="close"
        >
          取消
        </wd-button>
        <wd-button
          block
          :loading="saving"
          :disabled="saving"
          custom-style="background-color: #a33327; border-color: #a33327; border-radius: 12px;"
          @click="handleSubmit"
        >
          完成
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>
