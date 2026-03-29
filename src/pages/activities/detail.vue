<script lang="ts" setup>
import type ActivityMembersPanel from '@/components/ActivityMembersPanel.vue'
import type { IActivity, IActivityMember } from '@/service/activity'
import { onLoad } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { computed, ref } from 'vue'
import { useQueue } from 'wot-design-uni'
import ActivityAlbum from '@/components/ActivityAlbum.vue'
import CheckInHistory from '@/components/CheckInHistory.vue'
import CheckInQRCode from '@/components/CheckInQRCode.vue'
import CheckInStatus from '@/components/CheckInStatus.vue'
import { getActivityDetailAPI } from '@/service/activity'
import { useUserStore } from '@/store/user'
import { setPageShareConfig } from '@/utils/share'

const userStore = useUserStore()
const { closeOutside } = useQueue()

const activityId = ref('')
const activity = ref<IActivity | null>(null)
const membersPanelRef = ref<InstanceType<typeof ActivityMembersPanel> | null>(null)
const currentUserMember = ref<IActivityMember | null>(null)

// Loading states
const loading = ref(false)

// TabBar
const activeTab = ref('members')
const qrCodeRef = ref<InstanceType<typeof CheckInQRCode> | null>(null)

// 设置分享标题
function getShareTitle() {
  if (!activity.value)
    return '活动详情'
  const collectionTitle = activity.value.collection?.title
  if (collectionTitle) {
    return `${activity.value.title}-${collectionTitle}`
  }
  return activity.value.title
}

// 设置分享描述
function getShareDesc() {
  if (!activity.value)
    return '快来查看活动详情吧'
  return activity.value.summary || activity.value.content
}

// 设置分享图片
function getShareImageUrl() {
  return activity.value?.coverUrl || ''
}

definePage({
  style: {
    navigationBarTitleText: '活动详情',
  },
})

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
    currentUserMember.value = res.members.find(m => m.userId === userStore.userInfo?.userId) || null
    console.log('userStore.userInfo', userStore.userInfo)
    console.log('currentUserMember.value', currentUserMember.value)
    // 动态设置导航栏标题
    uni.setNavigationBarTitle({
      title: getShareTitle() || '活动详情',
    })

    // 设置页面分享配置
    setPageShareConfig({
      onShareAppMessage: () => ({
        // 标题包含活动信息，因为微信群不显示 desc
        title: `${getShareTitle()} | ${getShareDesc()}`.slice(0, 100),
        desc: getShareDesc(),
        path: `/pages/activities/detail?id=${activityId.value}`,
        // imageUrl: getShareImageUrl(),
      }),
      onShareTimeline: () => ({
        title: getShareTitle(),
        query: `id=${activityId.value}`,
        imageUrl: getShareImageUrl(),
      }),
    })
  }
  catch (e) {
    console.error(e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

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

// 管理菜单数据
const adminMenu = ref([
  { content: '编辑活动' },
  { content: '生成签到二维码' },
  { content: '分享活动' },
])

// 签到二维码弹窗显示状态
const showQRCodePopup = ref(false)

// 处理签到二维码更新
function handleCheckInCodeUpdate(newCode: object | null) {
  if (!newCode) {
    showQRCodePopup.value = false
    return
  }
}

// 处理管理菜单点击
function handleAdminMenuClick({ item, index }: { item: { iconClass: string, content: string }, index: number }) {
  console.log('菜单点击:', item, index)
  if (item.content === '编辑活动') {
    navigateToEdit()
  }
  else if (item.content === '生成签到二维码') {
    showQRCodePopup.value = true
  }
  else if (item.content === '分享活动') {
    // 触发分享
    uni.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    })
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
  <view class="min-h-screen bg-[#f7f7f7] pb-24" @click="closeOutside">
    <view v-if="activity">
      <!-- Header Image with Activity Summary Overlay -->
      <view class="relative w-full">
        <image
          :src="activity.coverUrl"
          class="w-full"
          mode="widthFix"
        />
        <!-- 渐变遮罩 -->
        <view class="absolute inset-0 from-black/70 via-black/30 to-transparent bg-gradient-to-t" />
        <!-- 活动介绍半透明层 -->
        <view class="absolute inset-x-4 bottom-16 max-h-40 overflow-hidden rounded-lg bg-black/40 p-4 backdrop-blur-sm">
          <rich-text
            :nodes="activity.summary || activity.content || '暂无详情'"
            class="line-clamp-4 text-sm text-white/90 leading-relaxed"
          />
        </view>
        <!-- 标题 -->
        <view class="absolute bottom-4 left-4 right-4 text-white">
          <text class="text-2xl font-bold">{{ activity.title }}</text>
        </view>
        <!-- 管理菜单 -->
        <view v-if="isActivityAdmin" class="absolute right-4 top-4">
          <wd-popover mode="menu" :content="adminMenu" placement="left-start" @menuclick="handleAdminMenuClick">
            <view
              class="rounded-full bg-white/80 p-2 backdrop-blur-sm transition-opacity active:opacity-80"
            >
              <view class="i-carbon-overflow-menu-vertical text-lg text-gray-800" />
            </view>
          </wd-popover>
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
      <!-- <view class="m-4 rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-3 border-b border-gray-100 pb-2 text-lg text-gray-900 font-bold">
          活动介绍
        </view>
        <rich-text :nodes="activity.summary || activity.content || '暂无详情'" class="text-gray-700 leading-relaxed" />
      </view> -->

      <!-- Check In Section - Member View -->
      <CheckInStatus
        v-if="activityId && isActivityMember"
        :activity-id="activityId"
      />

      <!-- TabBar -->
      <view v-if="activityId" class="m-4 rounded-lg bg-white shadow-sm">
        <wd-tabs v-model="activeTab" auto-line-width>
          <wd-tab title="相册" name="album" lazy>
            <ActivityAlbum
              v-if="activeTab === 'album'"
              :activity-id="activityId"
              :is-activity-admin="isActivityAdmin"
            />
          </wd-tab>
          <wd-tab title="成员" name="members" lazy>
            <ActivityMembersPanel
              v-if="activeTab === 'members'"
              ref="membersPanelRef"
              :activity-id="activityId"
            />
          </wd-tab>
          <!-- 相册Tab - 只有活动成员可见 -->

          <wd-tab title="签到历史" name="history" lazy>
            <CheckInHistory
              v-if="activeTab === 'history'"
              :activity-id="activityId"
            />
          </wd-tab>
        </wd-tabs>
      </view>

      <!-- 签到二维码弹窗 -->
      <wd-popup
        v-model="showQRCodePopup" position="center" :z-index="100" :close-on-click-modal="false"
        closable
        round lazy-render hide-when-close @enter="qrCodeRef?.generateCodeIfNotExist"
      >
        <view class="w-80">
          <CheckInQRCode
            v-if="activityId && isActivityMember && isActivityAdmin"
            ref="qrCodeRef"
            :activity-id="activityId"
            @update:check-in-code="handleCheckInCodeUpdate"
          />
        </view>
      </wd-popup>
    </view>
  </view>
</template>
