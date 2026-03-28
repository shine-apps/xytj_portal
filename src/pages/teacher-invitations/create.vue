<script lang="ts" setup>
import type { CreateInvitationData } from '@/service/teacher-invitation'
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { createTeacherInvitationAPI } from '@/service/teacher-invitation'
import { useUserStore } from '@/store/user'

definePage({
  style: {
    navigationBarTitleText: '邀请老师上课',
  },
})

const userStore = useUserStore()
const loading = ref(false)
const formRef = ref()

const form = ref<CreateInvitationData>({
  contactName: '',
  startTime: '',
  endTime: '',
  location: undefined,
  description: '',
  minStudents: 1,
  maxStudents: 10,
  accommodationCover: false,
  travelCover: false,
  fee: null,
  feeNegotiable: false,
  phone: '',
  email: '',
})

const rules = {
  contactName: [
    { required: true, message: '请输入联系人姓名' },
  ],
  startTime: [
    { required: true, message: '请选择开始时间' },
  ],
  endTime: [
    { required: true, message: '请选择结束时间' },
    {
      required: false,
      validator: (value: string) => {
        if (!value || !form.value.startTime)
          return true
        return new Date(value) > new Date(form.value.startTime)
      },
      message: '结束时间必须晚于开始时间',
    },
  ],
  phone: [
    { required: true, pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
  ],
  email: [
    {
      required: false,
      validator: (value: string) => {
        if (!value)
          return true
        return /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(value)
      },
      message: '请输入正确的邮箱格式',
    },
  ],
}

onLoad(() => {
  console.log(userStore.userInfo)
  if (userStore.userInfo.phoneNumber) {
    form.value.phone = userStore.userInfo.phoneNumber
  }
  if (userStore.userInfo.email) {
    form.value.email = userStore.userInfo.email
  }
})

function onLocationSelect() {
  uni.chooseLocation({
    success: (res) => {
      form.value.location = {
        name: res.name,
        address: res.address,
        latitude: res.latitude,
        longitude: res.longitude,
      }
    },
    fail: (err) => {
      console.log('选择位置失败', err)
    },
  })
}

function validateStudentCount(): boolean {
  if (form.value.minStudents > form.value.maxStudents) {
    uni.showToast({ title: '最少学员数不能大于最多学员数', icon: 'none' })
    return false
  }
  return true
}

async function handleSubmit() {
  if (!validateStudentCount())
    return

  const valid = await formRef.value.validate()
  if (!valid)
    return

  if (!userStore.hasValidLogin) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }

  loading.value = true
  try {
    form.value.startTime = new Date(form.value.startTime).toISOString()
    form.value.endTime = new Date(form.value.endTime).toISOString()
    form.value.fee = Number(form.value.fee)
    await createTeacherInvitationAPI(form.value)
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  }
  catch (e: any) {
    uni.showToast({ title: e.message || '发布失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="min-h-screen bg-[#f7f7f7]">
    <view class="p-4">
      <wd-form ref="formRef" :model="form" :rules="rules">
        <wd-cell-group border value="填入地点和时间，请翔云文武的老师过去上课">
          <wd-datetime-picker
            v-model="form.startTime"
            :default-value="Date.now()"
            type="datetime"
            label="开始时间"
            placeholder="请选择开始时间"
            prop="startTime"
            required
          />

          <wd-datetime-picker
            v-model="form.endTime"
            :default-value="Date.now()"
            type="datetime"
            label="结束时间"
            placeholder="请选择结束时间"
            prop="endTime"
            required
          />

          <wd-cell title="上课地点" clickable vertical @click="onLocationSelect">
            <text v-if="form.location?.name || form.location?.address" class="text-gray-900">
              {{ form.location.name || form.location.address }}
            </text>
            <text v-else class="text-gray-400">点击选择地点（可选）</text>
          </wd-cell>

          <wd-cell title="学员人数" required vertical>
            <view class="flex items-center gap-4">
              <wd-input-number
                v-model="form.minStudents"
                :min="1"
                :max="999"
              />
              <text class="text-sm text-gray-600">至</text>
              <wd-input-number
                v-model="form.maxStudents"
                :min="1"
                :max="999"
              />
              <text class="text-sm text-gray-600">人</text>
            </view>
          </wd-cell>

          <wd-cell title="报销选项" vertical>
            <view class="flex gap-4">
              <view class="flex items-center gap-2">
                <wd-switch v-model="form.accommodationCover" size="small" />
                <text class="text-sm text-gray-600">报销住宿费</text>
              </view>
              <view class="flex items-center gap-2">
                <wd-switch v-model="form.travelCover" size="small" />
                <text class="text-sm text-gray-600">报销车旅费</text>
              </view>
            </view>
          </wd-cell>

          <wd-cell title="给老师的课时费" vertical>
            <view class="flex items-center gap-4">
              <view class="flex items-center gap-2">
                <text class="text-sm text-gray-600">¥</text>
                <wd-input
                  v-model="form.fee"
                  inputmode="numeric"
                  type="number"
                  placeholder="金额"
                  :disabled="form.feeNegotiable"
                  custom-style="width: 80px;"
                />
              </view>
              <view class="flex items-center gap-2">
                <wd-switch v-model="form.feeNegotiable" size="small" />
                <text class="text-sm text-gray-600">面议</text>
              </view>
            </view>
          </wd-cell>

          <wd-input
            v-model="form.contactName"
            label="联系人姓名"
            placeholder="请输入联系人姓名"
            prop="contactName"
            clearable
            required
          />

          <wd-input
            v-model="form.phone"
            label="联系手机号"
            placeholder="请输入手机号"
            type="number"
            :maxlength="11"
            prop="phone"
            clearable
            required
          />

          <wd-input
            v-model="form.email"
            label="联系邮箱"
            placeholder="请输入邮箱（可选）"
            prop="email"
            clearable
          />

          <wd-textarea
            v-model="form.description"
            placeholder="请输入备注说明（可选）"
            :maxlength="500"
            auto-height
            show-word-limit
            prop="description"
            custom-textarea-container-class="rounded border-solid border-gray-100 p-2!"
          />
        </wd-cell-group>
      </wd-form>

      <view class="mt-6">
        <wd-button
          block
          type="primary"
          size="large"
          :loading="loading"
          @click="handleSubmit"
        >
          发布邀请
        </wd-button>
      </view>
    </view>
  </view>
</template>
