<script lang="ts" setup>
import type ActivityMembersPanel from '@/components/ActivityMembersPanel.vue'
import type { IActivity, IActivityMember } from '@/service/activity'
import { onLoad } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { computed, ref } from 'vue'
import CheckInHistory from '@/components/CheckInHistory.vue'
import CheckInQRCode from '@/components/CheckInQRCode.vue'
import CheckInStatus from '@/components/CheckInStatus.vue'
import { getActivityDetailAPI } from '@/service/activity'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

definePage({
  style: {
    navigationBarTitleText: '活动详情',
  },
})

const activityId = ref('')
const activity = ref<IActivity | null>(null)
const membersPanelRef = ref<InstanceType<typeof ActivityMembersPanel> | null>(null)
const currentUserMember = ref<IActivityMember | null>(null)

// Loading states
const loading = ref(false)

// TabBar
const activeTab = ref('members')

onLoad((options) => {
  if (options && options.id) {
    activityId.value = options.id
    loadData()
  }
})

async function loadData() {
  if (!activityId.value)
    return
  loading.value = true
  try {
    const res = await getActivityDetailAPI(activityId.value, true)
    activity.value = res
    currentUserMember.value = res.members.find(m => m.userId === userStore.userInfo?.id) || null
  }
  catch (e) {
    console.error(e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

// 是否可以编辑
const canEdit = computed(() => {
  // 1. 全局管理员
  if (userStore.isAdmin)
    return true
  // 2. 活动管理员 - 通过 membersPanelRef 获取
  return membersPanelRef.value?.isAdmin || false
})

// 是否是活动管理员
const isActivityAdmin = computed(() => {
  // 1. 全局管理员
  if (userStore.isAdmin)
    return true
  // 2. 活动管理员 - 通过 membersPanelRef 获取
  return membersPanelRef.value?.isAdmin || false
})

// 是否是活动成员（已加入）
const isActivityMember = computed(() => {
  return currentUserMember.value?.status === 'JOINED'
})

// 跳转到编辑页
function navigateToEdit() {
  uni.navigateTo({
    url: `/pages/activities/edit?id=${activityId.value}`,
  })
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
  <view class="min-h-screen bg-[#f7f7f7] pb-24">
    <view v-if="activity">
      <!-- Header Image -->
      <view class="relative w-full">
        <image
          :src="activity.coverUrl"
          class="w-full"
          mode="widthFix"
        />
        <view class="absolute inset-0 from-black/60 to-transparent bg-gradient-to-t" />
        <view class="absolute bottom-4 left-4 right-4 text-white">
          <text class="text-2xl font-bold">{{ activity.title }}</text>
        </view>
        <!-- 编辑按钮 -->
        <view v-if="canEdit" class="absolute right-4 top-4">
          <button
            class="rounded-full bg-white/80 p-2 backdrop-blur-sm transition-opacity active:opacity-70"
            @click="navigateToEdit"
          >
            <view class="i-carbon-edit text-lg text-gray-800" />
          </button>
        </view>
      </view>

      <!-- Basic Info -->
      <view class="m-4 rounded-lg bg-white p-4 shadow-sm">
        <!-- 所属集合 -->
        <view v-if="activity.collection" class="mb-3 flex items-center space-x-3">
          <view class="i-carbon-folder mt-1 text-lg text-[#a33327]" />
          <text class="text-sm text-gray-600">
            {{ activity.collection.title }}
          </text>
        </view>

        <view class="mb-3 flex items-center space-x-3">
          <view class="i-carbon-time mt-1 text-lg text-[#a33327]" />

          <view class="text-sm text-gray-600">
            {{ formatTime(activity.startTime) }} ~ {{ formatTime(activity.endTime) }}
          </view>
        </view>

        <view class="flex items-center space-x-3">
          <view class="i-carbon-location mt-1 text-lg text-[#a33327]" />
          <view class="text-sm text-gray-600">
            {{ formatLocation(activity.location) }}
          </view>
        </view>
      </view>

      <!-- Content -->
      <view class="m-4 rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-3 border-b border-gray-100 pb-2 text-lg text-gray-900 font-bold">
          活动介绍
        </view>
        <rich-text :nodes="activity.summary || activity.content || '暂无详情'" class="text-gray-700 leading-relaxed" />
      </view>

      <!-- Check In Section - Admin View -->
      <CheckInQRCode
        v-if="activityId && isActivityAdmin"
        :activity-id="activityId"
      />

      <!-- Check In Section - Member View -->
      <CheckInStatus
        v-if="activityId && isActivityMember && !isActivityAdmin"
        :activity-id="activityId"
      />

      <!-- TabBar -->
      <view class="m-4 rounded-lg bg-white shadow-sm">
        <wd-tabs v-model="activeTab">
          <wd-tab title="成员列表" name="members">
            <ActivityMembersPanel
              v-if="activityId"
              ref="membersPanelRef"
              :activity-id="activityId"
            />
          </wd-tab>
          <wd-tab title="签到历史" name="history">
            <CheckInHistory
              v-if="activityId"
              :activity-id="activityId"
            />
          </wd-tab>
        </wd-tabs>
      </view>
    </view>
  </view>
</template>
