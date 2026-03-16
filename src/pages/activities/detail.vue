<script lang="ts" setup>
import type { IActivity, IActivityMember } from '@/service/activity'
import { onLoad } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { computed, ref } from 'vue'
import {
  getActivityDetailAPI,
  getActivityMembersAPI,

  joinActivityAPI,
  removeMemberAPI,
  updateMemberStatusAPI,
} from '@/service/activity'
import { useUserStore } from '@/store/user'

definePage({
  style: {
    navigationBarTitleText: '活动详情',
  },
})

const activityId = ref('')
const activity = ref<IActivity | null>(null)
const members = ref<IActivityMember[]>([])
const userStore = useUserStore()
const paging = ref<any>(null)

// Join Popup
const showJoinPopup = ref(false)
const joinForm = ref({
  nickname: '',
  joinReason: '',
})

// Loading states
const loading = ref(false)
const memberLoading = ref(false)

onLoad((options) => {
  if (options && options.id) {
    activityId.value = options.id
    // Initial load will be triggered by z-paging @query
  }
})

async function loadData() {
  if (!activityId.value) {
    paging.value?.complete(true)
    return
  }
  loading.value = true
  try {
    const res = await getActivityDetailAPI(activityId.value)
    activity.value = res

    // Check if we need to load members (Creator or Admin)
    // We need to re-evaluate permissions after getting activity details
    // But since permissions depend on activity.userId and member list (which we might not have yet),
    // we should try to load members if user is logged in, or check logic.
    // The API for getting members might be protected.

    // If I am the creator, I can definitely load members.
    // If I am not the creator, I might be an admin in the members list.
    // But I don't have the members list yet!
    // Wait, the members list is needed to check if I am an admin...
    // The `getActivityDetailAPI` might return `members` if I am allowed?
    // Let's check `IActivity` interface again. It has `members?: IActivityMember[]`.
    // If the backend returns it, great. If not, we might need to fetch it separately.

    if (res.members) {
      // If members are included in detail
      // We might not need to fetch separate members API if detail already includes it
      // But usually detail includes only a few or none depending on backend.
      // Let's assume we need to fetch if we are authorized.
    }

    // Current logic: If I am creator, fetch members.
    if (userStore.userInfo.userId === res.userId) {
      await loadMembers()
    }
    else {
      // If I am not creator, I might be an admin.
      // But I don't know if I am an admin until I see the member list.
      // Or maybe the detail API returns my member status?
      // `IActivity` does NOT have `myMemberStatus`.
      // So I should try to fetch members and if it fails (403), then I am not authorized.
      // OR, maybe `getActivityMembersAPI` is public but returns limited info?
      // Let's try to fetch members if user is logged in.
      if (userStore.hasValidLogin) {
        await loadMembers()
      }
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

async function loadMembers() {
  if (!activityId.value)
    return
  memberLoading.value = true
  try {
    const res = await getActivityMembersAPI(activityId.value)
    members.value = res
  }
  catch (e) {
    // It's okay if this fails, maybe not authorized
    console.log('Failed to load members, possibly not authorized')
  }
  finally {
    memberLoading.value = false
  }
}

// Computed Roles & Permissions
const currentUserId = computed(() => userStore.userInfo.userId)

const isCreator = computed(() => {
  return activity.value?.userId === currentUserId.value
})

const myMemberInfo = computed(() => {
  // If we have the full members list, use it
  if (members.value.length > 0) {
    return members.value.find(m => m.userId === currentUserId.value)
  }
  // Fallback to activity.members if available
  if (activity.value?.members) {
    return activity.value.members.find(m => m.userId === currentUserId.value)
  }
  return null
})

const isAdmin = computed(() => {
  if (isCreator.value)
    return true
  return myMemberInfo.value?.role === 'ADMIN'
})

const canManageMembers = computed(() => isAdmin.value)

const joinStatus = computed(() => {
  if (isCreator.value)
    return 'CREATOR'
  if (!myMemberInfo.value)
    return 'NOT_JOINED'
  return myMemberInfo.value.status // 'JOINED' or 'JOINING'
})

// Member Lists
const pendingMembers = computed(() => members.value.filter(m => m.status === 'JOINING'))
const joinedMembers = computed(() => members.value.filter(m => m.status === 'JOINED'))

// Actions
function handleJoinClick() {
  if (!userStore.hasValidLogin) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  // Pre-fill nickname if available
  joinForm.value.nickname = userStore.userInfo.nickname || ''
  showJoinPopup.value = true
}

async function submitJoin() {
  if (!joinForm.value.nickname) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }

  try {
    await joinActivityAPI(activityId.value, joinForm.value)
    uni.showToast({ title: '申请已提交', icon: 'success' })
    showJoinPopup.value = false
    // Reload data to update status
    // We can just reload members if we think that's enough, but reloading everything is safer
    loadData()
  }
  catch (e) {
    uni.showToast({ title: '申请失败', icon: 'none' })
  }
}

async function handleApprove(memberId: string, userId: string) {
  try {
    await updateMemberStatusAPI(activityId.value, userId, 'JOINED')
    uni.showToast({ title: '已通过', icon: 'success' })
    loadMembers()
  }
  catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function handleReject(memberId: string, userId: string) {
  try {
    await removeMemberAPI(activityId.value, userId)
    uni.showToast({ title: '已拒绝', icon: 'success' })
    loadMembers()
  }
  catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

// Format Helpers
function formatTime(time: string) {
  if (!time)
    return ''
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

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
</script>

<template>
  <z-paging ref="paging" refresher-enabled @query="loadData">
    <view v-if="activity" class="min-h-screen bg-[#f7f7f7] pb-24">
      <!-- Header Image -->
      <view class="relative h-60 w-full">
        <image
          :src="activity.coverUrl || 'https://images.unsplash.com/photo-1544367563-12123d895951?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60'"
          class="h-full w-full object-cover"
          mode="aspectFill"
        />
        <view class="absolute inset-0 from-black/60 to-transparent bg-gradient-to-t" />
        <view class="absolute bottom-4 left-4 right-4 text-white">
          <text class="text-2xl font-bold">{{ activity.title }}</text>
        </view>
      </view>

      <!-- Basic Info -->
      <view class="m-4 rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-3 flex items-start space-x-3">
          <view class="i-carbon-time mt-1 text-lg text-[#a33327]" />
          <view>
            <view class="text-gray-900 font-medium">
              活动时间
            </view>
            <view class="text-sm text-gray-600">
              {{ formatTime(activity.startTime) }} ~ {{ formatTime(activity.endTime) }}
            </view>
          </view>
        </view>

        <view class="flex items-start space-x-3">
          <view class="i-carbon-location mt-1 text-lg text-[#a33327]" />
          <view>
            <view class="text-gray-900 font-medium">
              活动地点
            </view>
            <view class="text-sm text-gray-600">
              {{ formatLocation(activity.location) }}
            </view>
          </view>
        </view>
      </view>

      <!-- Content -->
      <view class="m-4 rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-3 border-b border-gray-100 pb-2 text-lg text-gray-900 font-bold">
          活动详情
        </view>
        <rich-text :nodes="activity.content || activity.summary || '暂无详情'" class="text-gray-700 leading-relaxed" />
      </view>

      <!-- Admin Panel -->
      <view v-if="canManageMembers" class="m-4 rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-3 flex items-center justify-between border-b border-gray-100 pb-2">
          <text class="text-lg text-gray-900 font-bold">管理面板</text>
          <text class="text-xs text-gray-500">共 {{ members.length }} 人</text>
        </view>

        <!-- Pending List -->
        <view v-if="pendingMembers.length > 0" class="mb-6">
          <view class="mb-2 text-sm text-[#a33327] font-bold">
            待审核 ({{ pendingMembers.length }})
          </view>
          <view v-for="member in pendingMembers" :key="member.id" class="mb-3 border border-orange-100 rounded bg-orange-50 p-3">
            <view class="flex items-start justify-between">
              <view>
                <text class="text-gray-800 font-bold">{{ member.nickname || '未命名' }}</text>
                <view class="mt-1 text-xs text-gray-500">
                  申请理由: {{ member.joinReason || '无' }}
                </view>
              </view>
              <view class="flex space-x-2">
                <button
                  class="rounded bg-green-600 px-3 py-1 text-xs text-white"
                  @click="handleApprove(member.id, member.userId)"
                >
                  通过
                </button>
                <button
                  class="rounded bg-red-600 px-3 py-1 text-xs text-white"
                  @click="handleReject(member.id, member.userId)"
                >
                  拒绝
                </button>
              </view>
            </view>
          </view>
        </view>

        <!-- Joined List -->
        <view>
          <view class="mb-2 text-sm text-green-700 font-bold">
            已加入 ({{ joinedMembers.length }})
          </view>
          <view v-if="joinedMembers.length === 0" class="py-2 text-sm text-gray-400">
            暂无成员
          </view>
          <view v-else class="space-y-2">
            <view v-for="member in joinedMembers" :key="member.id" class="flex items-center justify-between border-b border-gray-50 py-2 last:border-0">
              <view class="flex items-center">
                <view class="mr-3 h-8 w-8 flex items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500">
                  {{ (member.nickname || 'U').charAt(0) }}
                </view>
                <text class="text-gray-800">{{ member.nickname || '用户' }}</text>
                <text v-if="member.role === 'ADMIN'" class="ml-2 rounded bg-yellow-100 px-1 text-xs text-yellow-800">管理员</text>
              </view>
              <text class="text-xs text-gray-400">{{ dayjs(member.createdAt).format('MM-DD') }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Bottom Action Bar -->
      <view class="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white p-4 pb-safe">
        <button
          v-if="joinStatus === 'NOT_JOINED'"
          class="w-full rounded-full bg-[#a33327] py-2 text-white font-bold shadow-lg transition-transform active:scale-95"
          @click="handleJoinClick"
        >
          立即报名
        </button>
        <button
          v-else-if="joinStatus === 'JOINING'"
          class="w-full rounded-full bg-orange-100 py-2 text-orange-600 font-bold"
          disabled
        >
          审核中
        </button>
        <button
          v-else-if="joinStatus === 'JOINED'"
          class="w-full rounded-full bg-green-100 py-2 text-green-600 font-bold"
          disabled
        >
          已报名
        </button>
        <button
          v-else-if="joinStatus === 'CREATOR'"
          class="w-full rounded-full bg-gray-100 py-2 text-gray-600 font-bold"
          disabled
        >
          我是发起人
        </button>
      </view>
    </view>

    <!-- Join Popup -->
    <wd-popup v-model="showJoinPopup" position="bottom" custom-style="border-radius: 16px 16px 0 0; overflow: hidden;">
      <view class="bg-white p-6 pb-safe">
        <view class="mb-6 text-center text-lg font-bold">
          报名信息
        </view>

        <view class="mb-4">
          <text class="mb-1 block text-sm text-gray-700 font-medium">昵称</text>
          <input
            v-model="joinForm.nickname"
            type="nickname"
            class="border-gray-300 rounded-lg border-solid p-3 text-base"
            placeholder="请输入您的称呼"
          >
        </view>

        <view class="mb-6">
          <text class="mb-1 block text-sm text-gray-700 font-medium">申请理由 / 备注</text>
          <textarea
            v-model="joinForm.joinReason"
            class="h-24 border-gray-300 rounded-lg border-solid p-3 text-base"
            placeholder="请填写申请理由或备注信息"
          />
        </view>

        <button
          class="w-full rounded-lg bg-[#a33327] py-3 text-white font-bold"
          @click="submitJoin"
        >
          确认提交
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
