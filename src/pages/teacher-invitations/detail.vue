<script lang="ts" setup>
import type { ITeacherInvitation } from '@/service/teacher-invitation'
import { onLoad } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { computed, ref } from 'vue'
import {
  getTeacherInvitationDetailAPI,
  reviewTeacherInvitationAPI,
} from '@/service/teacher-invitation'
import { useUserStore } from '@/store/user'
import { formatTime } from '@/utils/dateUtil'

definePage({
  style: {
    navigationBarTitleText: '邀请详情',
  },
})

const invitationId = ref('')
const invitation = ref<ITeacherInvitation | null>(null)
const userStore = useUserStore()
const paging = ref<any>(null)

const showReviewPopup = ref(false)
const reviewForm = ref({
  status: 'ACCEPTED' as 'ACCEPTED' | 'REJECTED',
  message: '',
})

const loading = ref(false)
const reviewLoading = ref(false)

onLoad((options) => {
  if (options && options.id) {
    invitationId.value = options.id
  }
})

async function loadData() {
  if (!invitationId.value) {
    paging.value?.complete(true)
    return
  }
  loading.value = true
  try {
    const res = await getTeacherInvitationDetailAPI(invitationId.value)
    invitation.value = res
  }
  catch (e) {
    console.error(e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
    paging.value?.complete(true)
  }
}

const currentUserId = computed(() => userStore.userInfo.userId)

const isOwner = computed(() => {
  return invitation.value?.userId === currentUserId.value
})

const isAdmin = computed(() => {
  return userStore.userInfo.roles?.some(
    (role: string) => role === 'admin' || role === 'xytj_admin',
  )
})

function formatLocation(loc: any) {
  if (!loc)
    return '地点待定'
  if (typeof loc === 'string') {
    try {
      if (loc.startsWith('{') || loc.startsWith('[')) {
        const obj = JSON.parse(loc)
        return obj.address || obj.name || loc
      }
      return loc
    }
    catch {
      return loc
    }
  }
  if (typeof loc === 'object') {
    return loc.address || loc.name || '未知地点'
  }
  return String(loc)
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    OPEN: '待审核',
    ACCEPTED: '已通过',
    REJECTED: '已拒绝',
    CANCELLED: '已取消',
    CLOSED: '已关闭',
  }
  return map[status] || status
}

function getStatusClass(status: string) {
  const map: Record<string, string> = {
    OPEN: 'bg-orange-100 text-orange-600',
    ACCEPTED: 'bg-green-100 text-green-600',
    REJECTED: 'bg-red-100 text-red-600',
    CANCELLED: 'bg-gray-100 text-gray-500',
    CLOSED: 'bg-gray-100 text-gray-500',
  }
  return map[status] || 'bg-gray-100 text-gray-500'
}

function openReviewPopup(status: 'ACCEPTED' | 'REJECTED') {
  reviewForm.value.status = status
  reviewForm.value.message = ''
  showReviewPopup.value = true
}

async function submitReview() {
  if (!invitationId.value)
    return

  reviewLoading.value = true
  try {
    await reviewTeacherInvitationAPI(invitationId.value, {
      status: reviewForm.value.status,
      message: reviewForm.value.message,
    })
    uni.showToast({
      title: reviewForm.value.status === 'ACCEPTED' ? '已通过' : '已拒绝',
      icon: 'success',
    })
    showReviewPopup.value = false
    loadData()
  }
  catch (e: any) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
  finally {
    reviewLoading.value = false
  }
}
</script>

<template>
  <z-paging ref="paging" refresher-enabled @query="loadData">
    <view v-if="invitation" class="min-h-screen bg-[#f7f7f7] pb-24">
      <view class="m-4 rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-3 flex items-start space-x-3">
          <view class="i-carbon-user mt-1 text-lg text-[#a33327]" />
          <view>
            <view class="text-gray-900 font-medium">
              联系人
            </view>
            <view class="text-sm text-gray-600">
              {{ invitation.contactName }}
            </view>
          </view>
        </view>

        <view class="mb-3 flex items-start space-x-3">
          <view class="i-carbon-time mt-1 text-lg text-[#a33327]" />
          <view>
            <view class="text-gray-900 font-medium">
              上课时间
            </view>
            <view class="text-sm text-gray-600">
              {{ formatTime(invitation.startTime) }} ~ {{ formatTime(invitation.endTime) }}
            </view>
          </view>
        </view>

        <view class="mb-3 flex items-start space-x-3">
          <view class="i-carbon-location mt-1 text-lg text-[#a33327]" />
          <view>
            <view class="text-gray-900 font-medium">
              上课地点
            </view>
            <view class="text-sm text-gray-600">
              {{ formatLocation(invitation.location) }}
            </view>
          </view>
        </view>

        <view class="mb-3 flex items-start space-x-3">
          <view class="i-carbon-user-multiple mt-1 text-lg text-[#a33327]" />
          <view>
            <view class="text-gray-900 font-medium">
              学员人数
            </view>
            <view class="text-sm text-gray-600">
              {{ invitation.minStudents }} - {{ invitation.maxStudents }} 人
            </view>
          </view>
        </view>

        <view class="mb-3 flex items-start space-x-3">
          <view class="i-carbon-phone mt-1 text-lg text-[#a33327]" />
          <view>
            <view class="text-gray-900 font-medium">
              联系方式
            </view>
            <view class="text-sm text-gray-600">
              {{ invitation.phone }}
              <text v-if="invitation.email" class="ml-2">{{ invitation.email }}</text>
            </view>
          </view>
        </view>

        <view class="mb-3 flex items-start space-x-3">
          <view class="i-carbon-currency mt-1 text-lg text-[#a33327]" />
          <view>
            <view class="text-gray-900 font-medium">
              课时费
            </view>
            <view class="text-sm text-gray-600">
              <text v-if="invitation.feeNegotiable">面议</text>
              <text v-else-if="invitation.fee">¥{{ invitation.fee }}</text>
              <text v-else>未设置</text>
            </view>
          </view>
        </view>

        <view v-if="invitation.accommodationCover || invitation.travelCover" class="flex gap-2">
          <text
            v-if="invitation.accommodationCover"
            class="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600"
          >
            报销住宿费
          </text>
          <text
            v-if="invitation.travelCover"
            class="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600"
          >
            报销车旅费
          </text>
        </view>
      </view>

      <view v-if="invitation.description" class="m-4 rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-3 border-b border-gray-100 pb-2 text-lg text-gray-900 font-bold">
          详细说明
        </view>
        <rich-text :nodes="invitation.description" class="text-gray-700 leading-relaxed" />
      </view>

      <!-- 审核状态展示 -->
      <view class="m-4 rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-3 border-b border-gray-100 pb-2 text-lg text-gray-900 font-bold">
          审核状态
        </view>
        <view class="flex items-center justify-between">
          <view class="flex items-center gap-2">
            <text class="rounded px-3 py-1 text-sm font-medium" :class="getStatusClass(invitation.status)">
              {{ getStatusText(invitation.status) }}
            </text>
          </view>
          <text v-if="invitation.reviewedAt" class="text-xs text-gray-400">
            {{ dayjs(invitation.reviewedAt).format('YYYY-MM-DD HH:mm') }}
          </text>
        </view>
        <view v-if="invitation.reviewMessage" class="mt-3 rounded bg-gray-50 p-3 text-sm text-gray-600">
          <text class="font-medium">审核备注：</text>
          {{ invitation.reviewMessage }}
        </view>
      </view>

      <!-- 管理员审核区域 -->
      <view v-if="isAdmin && invitation.status === 'OPEN'" class="m-4 rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-3 border-b border-gray-100 pb-2 text-lg text-gray-900 font-bold">
          管理员审核
        </view>
        <view class="flex gap-3">
          <button
            class="flex-1 rounded-lg bg-green-600 py-2 text-white font-bold shadow-lg transition-transform active:scale-95"
            @click="openReviewPopup('ACCEPTED')"
          >
            通过
          </button>
          <button
            class="flex-1 rounded-lg bg-red-600 py-2 text-white font-bold shadow-lg transition-transform active:scale-95"
            @click="openReviewPopup('REJECTED')"
          >
            拒绝
          </button>
        </view>
      </view>

      <view class="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white p-4 pb-safe">
        <button
          v-if="isOwner"
          class="w-full rounded-full bg-gray-100 py-2 text-gray-600 font-bold"
          disabled
        >
          我发起的邀请
        </button>
        <button
          v-else-if="invitation.status === 'OPEN'"
          class="w-full rounded-full bg-orange-100 py-2 text-orange-600 font-bold"
          disabled
        >
          待审核
        </button>
        <button
          v-else-if="invitation.status === 'ACCEPTED'"
          class="w-full rounded-full bg-green-100 py-2 text-green-600 font-bold"
          disabled
        >
          邀请已通过
        </button>
        <button
          v-else-if="invitation.status === 'REJECTED'"
          class="w-full rounded-full bg-red-100 py-2 text-red-600 font-bold"
          disabled
        >
          邀请已拒绝
        </button>
        <button
          v-else
          class="w-full rounded-full bg-gray-100 py-2 text-gray-500 font-bold"
          disabled
        >
          {{ getStatusText(invitation.status) }}
        </button>
      </view>
    </view>

    <!-- 审核弹窗 -->
    <wd-popup v-model="showReviewPopup" position="bottom" custom-style="z-index: 1000; border-radius: 16px 16px 0 0; overflow: hidden;">
      <view class="bg-white p-6 pb-safe">
        <view class="mb-6 text-center text-lg font-bold">
          {{ reviewForm.status === 'ACCEPTED' ? '通过邀请' : '拒绝邀请' }}
        </view>

        <view class="mb-6">
          <text class="mb-1 block text-sm text-gray-700 font-medium">审核备注（可选）</text>
          <textarea
            v-model="reviewForm.message"
            class="h-24 w-full border-gray-300 rounded-lg border-solid p-3 text-base"
            placeholder="请填写审核备注信息"
          />
        </view>

        <button
          class="w-full rounded-lg py-3 text-white font-bold"
          :class="reviewForm.status === 'ACCEPTED' ? 'bg-green-600' : 'bg-red-600'"
          :disabled="reviewLoading"
          @click="submitReview"
        >
          {{ reviewLoading ? '提交中...' : '确认' }}
        </button>
      </view>
    </wd-popup>
  </z-paging>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
