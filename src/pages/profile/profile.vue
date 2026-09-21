<template>
  <view class="min-h-screen bg-gray-100 p-4 pb-safe">
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
      <view class="flex items-center justify-between px-4 py-3">
        <text class="mr-8 text-gray-700">昵称</text>
        <view class="flex flex-1 items-center gap-2">
          <wd-input
            v-model="form.nickname"
            type="nickname"
            :disabled="!isEditingNickname"
            placeholder="请输入昵称"
            :no-border="!isEditingNickname"
            custom-class="text-gray-500 flex-1"
          />
          <wd-icon
            v-if="!isEditingNickname"
            name="edit"
            size="18px"
            class="text-gray-400"
            @click="startEditNickname"
          />
          <wd-icon
            v-else
            name="check"
            size="18px"
            class="text-primary"
            @click="confirmEditNickname"
          />
        </view>
      </view>
    </view>

    <view class="mb-6 overflow-hidden rounded-lg bg-white">
      <wd-cell title="修改密码" is-link @click="openPasswordPopup" />
    </view>

    <!-- 修改密码弹框 -->
    <wd-popup v-model="showPasswordPopup" position="bottom" custom-style="z-index: 1000; border-radius: 16px 16px 0 0; overflow: hidden;">
      <view class="bg-white p-6 pb-safe">
        <view class="mb-6 flex items-center justify-between">
          <view class="text-lg font-bold">
            修改密码
          </view>
          <wd-icon name="close" size="20px" class="text-gray-400" @click="closePasswordPopup" />
        </view>

        <!-- 手机号显示和发送OTP -->
        <view class="mb-4 flex items-center justify-between">
          <text class="text-gray-700">手机号</text>
          <view class="flex items-center gap-2">
            <text class="text-gray-500">{{ maskedPhoneNumber }}</text>
            <wd-button
              size="small"
              :disabled="otpCountdown > 0 || otpLoading"
              :loading="otpLoading"
              @click="sendOTP"
            >
              {{ otpCountdown > 0 ? `${otpCountdown}s` : '发送验证码' }}
            </wd-button>
          </view>
        </view>

        <view class="mb-4">
          <wd-input
            v-model="passwordForm.otp"
            type="text"
            label="验证码"
            placeholder="请输入验证码"
            clearable
            :maxlength="6"
          />
        </view>

        <view class="mb-6">
          <wd-input
            v-model="passwordForm.newPassword"
            type="safe-password"
            label="新密码"
            placeholder="请输入新密码（至少6位）"
            clearable
          />
        </view>

        <view class="flex gap-3">
          <wd-button plain block type="primary" @click="closePasswordPopup">
            取消
          </wd-button>
          <wd-button block type="primary" :loading="passwordLoading" @click="handleChangePassword">
            确认
          </wd-button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script lang="ts" setup>
import { isMpWeixin } from '@uni-helper/uni-env'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useUserStore } from '@/store/user'
import { staticUrl } from '@/utils'
import { uploadToCos } from '@/utils/cos'

definePage({
  style: {
    navigationBarTitleText: '个人信息',
  },
})

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)
const defaultAvatar = staticUrl('/static/images/default-avatar.png')

const form = reactive({
  nickname: userInfo.value.nickname || userInfo.value.username || '',
  avatar: userInfo.value.avatar || '',
})

const isEditingNickname = ref(false)
const nicknameLoading = ref(false)

const showPasswordPopup = ref(false)
const passwordLoading = ref(false)
const otpLoading = ref(false)
const otpCountdown = ref(0)
const passwordForm = reactive({
  otp: '',
  newPassword: '',
})

// 计算属性：掩码手机号
const maskedPhoneNumber = computed(() => {
  const phone = userInfo.value.phoneNumber
  if (!phone || phone.length < 7)
    return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
})

const saveLoading = ref(false)

async function saveProfile(options?: { nickname?: string, avatar?: string }) {
  saveLoading.value = true
  try {
    const success = await userStore.updateProfile({
      ...(options?.nickname !== undefined && { nickname: options.nickname }),
      ...(options?.avatar !== undefined && { avatar: options.avatar }),
    })

    if (success) {
      uni.showToast({ title: '保存成功', icon: 'success' })
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
    saveLoading.value = false
  }
}

function navigateToCropper(src: string) {
  const encodedSrc = encodeURIComponent(src)
  const url = `/pages/tools/img-cropper?src=${encodedSrc}&aspect-ratio=1:1`
  uni.navigateTo({ url })
}

function onChooseAvatar(e: any) {
  console.log('onChooseAvatar:', e)
  const { avatarUrl } = e.detail
  if (avatarUrl) {
    navigateToCropper(avatarUrl)
  }
  else {
    navigateToCropper('')
  }
}

function handleAvatarClick() {
  if (isMpWeixin)
    return
  navigateToCropper('')
}

onMounted(() => {
  uni.$on('imgCropperConfirm', async ({ url }) => {
    if (url) {
      try {
        const { url: avatarUrl } = await uploadToCos(url)
        form.avatar = avatarUrl
        await saveProfile({ avatar: avatarUrl })
      }
      catch (err) {
        console.error('上传头像失败', err)
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
    }
  })
})

onUnmounted(() => {
  uni.$off('imgCropperConfirm')
})

function startEditNickname() {
  isEditingNickname.value = true
}

async function confirmEditNickname() {
  if (!form.nickname) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }

  nicknameLoading.value = true
  try {
    const success = await userStore.updateProfile({
      nickname: form.nickname,
      avatar: form.avatar,
    })

    if (success) {
      uni.showToast({ title: '保存成功', icon: 'success' })
      isEditingNickname.value = false
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
    nicknameLoading.value = false
  }
}

function openPasswordPopup() {
  showPasswordPopup.value = true
  // 重置表单
  resetPasswordForm()
  otpCountdown.value = 0
}

function closePasswordPopup() {
  showPasswordPopup.value = false
  resetPasswordForm()
  otpCountdown.value = 0
}

function resetPasswordForm() {
  passwordForm.otp = ''
  passwordForm.newPassword = ''
}

// 发送OTP验证码
async function sendOTP() {
  const phoneNumber = userInfo.value.phoneNumber
  if (!phoneNumber) {
    uni.showToast({ title: '未绑定手机号', icon: 'none' })
    return
  }

  otpLoading.value = true
  try {
    const success = await userStore.requestPasswordResetOTP(phoneNumber)
    if (success) {
      uni.showToast({ title: '验证码已发送', icon: 'success' })
      // 开始倒计时
      otpCountdown.value = 60
      const timer = setInterval(() => {
        otpCountdown.value--
        if (otpCountdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    }
    else {
      uni.showToast({ title: '发送失败', icon: 'none' })
    }
  }
  catch (e: any) {
    console.error(e)
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
  }
  finally {
    otpLoading.value = false
  }
}

async function handleChangePassword() {
  if (!passwordForm.otp) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }
  if (!passwordForm.newPassword) {
    uni.showToast({ title: '请输入新密码', icon: 'none' })
    return
  }
  if (passwordForm.newPassword.length < 6) {
    uni.showToast({ title: '新密码至少6位', icon: 'none' })
    return
  }

  const phoneNumber = userInfo.value.phoneNumber
  if (!phoneNumber) {
    uni.showToast({ title: '未绑定手机号', icon: 'none' })
    return
  }

  passwordLoading.value = true
  try {
    const success = await userStore.resetPasswordWithPhoneOTP({
      phoneNumber,
      otp: passwordForm.otp,
      newPassword: passwordForm.newPassword,
    })

    if (success) {
      uni.showToast({ title: '密码修改成功', icon: 'success' })
      closePasswordPopup()
    }
    else {
      uni.showToast({ title: '密码修改失败', icon: 'none' })
    }
  }
  catch (e: any) {
    console.error(e)
    uni.showToast({ title: e.message || '密码修改失败', icon: 'none' })
  }
  finally {
    passwordLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.pb-safe {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
