<script lang="ts" setup>
import type { ITeacherApplication, ITeacherInvitation } from '@/service/teacher-invitation'
import { onLoad } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { computed, ref } from 'vue'
import {
  applyTeacherInvitationAPI,
  getTeacherApplicationsAPI,
  getTeacherInvitationDetailAPI,
  handleTeacherApplicationAPI,
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
const applications = ref<ITeacherApplication[]>([])
const userStore = useUserStore()
const paging = ref<any>(null)

const showApplyPopup = ref(false)
const applyForm = ref({
  message: '',
})

const loading = ref(false)
const applyLoading = ref(false)

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

    if (userStore.userInfo.userId === res.userId) {
      await loadApplications()
    }
    else if (userStore.hasValidLogin) {
      await loadApplications()
    }
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

async function loadApplications() {
  if (!invitationId.value)
    return
  try {
    const res = await getTeacherApplicationsAPI(invitationId.value)
    applications.value = res
  }
  catch (e) {
    console.log('Failed to load applications, possibly not authorized')
  }
}

const currentUserId = computed(() => userStore.userInfo.userId)

const isOwner = computed(() => {
  return invitation.value?.userId === currentUserId.value
})

const myApplication = computed(() => {
  return applications.value.find(a => a.userId === currentUserId.value)
})

const applyStatus = computed(() => {
  if (isOwner.value)
    return 'OWNER'
  if (!myApplication.value)
    return 'NOT_APPLIED'
  return myApplication.value.status
})

const pendingApplications = computed(() => applications.value.filter(a => a.status === 'PENDING'))
const acceptedApplications = computed(() => applications.value.filter(a => a.status === 'ACCEPTED'))

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

function handleApplyClick() {
  if (!userStore.hasValidLogin) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  showApplyPopup.value = true
}

async function submitApply() {
  if (!invitationId.value)
    return

  applyLoading.value = true
  try {
    await applyTeacherInvitationAPI(invitationId.value, { message: applyForm.value.message })
    uni.showToast({ title: '申请已提交', icon: 'success' })
    showApplyPopup.value = false
    loadData()
  }
  catch (e: any) {
    uni.showToast({ title: e.message || '申请失败', icon: 'none' })
  }
  finally {
    applyLoading.value = false
  }
}

async function handleApplication(userId: string, status: 'ACCEPTED' | 'REJECTED') {
  if (!invitationId.value)
    return
  try {
    await handleTeacherApplicationAPI(invitationId.value, userId, status)
    uni.showToast({ title: status === 'ACCEPTED' ? '已接受' : '已拒绝', icon: 'success' })
    loadApplications()
    loadData()
  }
  catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
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

      <view v-if="isOwner" class="m-4 rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-3 flex items-center justify-between border-b border-gray-100 pb-2">
          <text class="text-lg text-gray-900 font-bold">申请管理</text>
          <text class="text-xs text-gray-500">共 {{ applications.length }} 人申请</text>
        </view>

        <view v-if="pendingApplications.length > 0" class="mb-6">
          <view class="mb-2 text-sm text-[#a33327] font-bold">
            待处理 ({{ pendingApplications.length }})
          </view>
          <view
            v-for="app in pendingApplications"
            :key="app.id"
            class="mb-3 border border-orange-100 rounded bg-orange-50 p-3"
          >
            <view class="flex items-start justify-between">
              <view>
                <text class="text-gray-800 font-bold">{{ app.userId.slice(0, 8) }}...</text>
                <view v-if="app.message" class="mt-1 text-xs text-gray-500">
                  留言: {{ app.message }}
                </view>
              </view>
              <view class="flex space-x-2">
                <button
                  class="rounded bg-green-600 px-3 py-1 text-xs text-white"
                  @click="handleApplication(app.userId, 'ACCEPTED')"
                >
                  接受
                </button>
                <button
                  class="rounded bg-red-600 px-3 py-1 text-xs text-white"
                  @click="handleApplication(app.userId, 'REJECTED')"
                >
                  拒绝
                </button>
              </view>
            </view>
          </view>
        </view>

        <view>
          <view class="mb-2 text-sm text-green-700 font-bold">
            已接受 ({{ acceptedApplications.length }})
          </view>
          <view v-if="acceptedApplications.length === 0" class="py-2 text-sm text-gray-400">
            暂无
          </view>
          <view v-else class="space-y-2">
            <view
              v-for="app in acceptedApplications"
              :key="app.id"
              class="flex items-center justify-between border-b border-gray-50 py-2 last:border-0"
            >
              <text class="text-gray-800">{{ app.userId.slice(0, 8) }}...</text>
              <text class="text-xs text-gray-400">{{ dayjs(app.createdAt).format('MM-DD') }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white p-4 pb-safe">
        <button
          v-if="applyStatus === 'NOT_APPLIED' && invitation.status === 'OPEN'"
          class="w-full rounded-full bg-[#a33327] py-2 text-white font-bold shadow-lg transition-transform active:scale-95"
          @click="handleApplyClick"
        >
          申请接课
        </button>
        <button
          v-else-if="applyStatus === 'PENDING'"
          class="w-full rounded-full bg-orange-100 py-2 text-orange-600 font-bold"
          disabled
        >
          申请审核中
        </button>
        <button
          v-else-if="applyStatus === 'ACCEPTED'"
          class="w-full rounded-full bg-green-100 py-2 text-green-600 font-bold"
          disabled
        >
          已被接受
        </button>
        <button
          v-else-if="applyStatus === 'REJECTED'"
          class="w-full rounded-full bg-gray-100 py-2 text-gray-500 font-bold"
          disabled
        >
          申请已被拒绝
        </button>
        <button
          v-else-if="applyStatus === 'OWNER'"
          class="w-full rounded-full bg-gray-100 py-2 text-gray-600 font-bold"
          disabled
        >
          我发起的邀请
        </button>
        <button
          v-else-if="invitation.status !== 'OPEN'"
          class="w-full rounded-full bg-gray-100 py-2 text-gray-500 font-bold"
          disabled
        >
          邀请已关闭
        </button>
      </view>
    </view>

    <wd-popup v-model="showApplyPopup" position="bottom" custom-style="border-radius: 16px 16px 0 0; overflow: hidden;">
      <view class="bg-white p-6 pb-safe">
        <view class="mb-6 text-center text-lg font-bold">
          申请接课
        </view>

        <view class="mb-6">
          <text class="mb-1 block text-sm text-gray-700 font-medium">留言（可选）</text>
          <textarea
            v-model="applyForm.message"
            class="h-24 border-gray-300 rounded-lg border-solid p-3 text-base w-full"
            placeholder="请填写您的教学经验或备注信息"
          />
        </view>

        <button
          class="w-full rounded-lg bg-[#a33327] py-3 text-white font-bold"
          :disabled="applyLoading"
          @click="submitApply"
        >
          {{ applyLoading ? '提交中...' : '确认提交' }}
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
