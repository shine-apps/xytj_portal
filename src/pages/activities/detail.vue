<script lang="ts" setup>
import type { IActivity, IActivityMember } from '@/service/activity'
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
import { useQueue } from 'wot-design-uni'
import ActivityAlbum from '@/components/ActivityAlbum.vue'
import ActivityMembersPanel from '@/components/ActivityMembersPanel.vue'
import CheckInMembers from '@/components/CheckInMembers.vue'
import CheckInQRCode from '@/components/CheckInQRCode.vue'
import CheckInStatus from '@/components/CheckInStatus.vue'
import CustomRichText from '@/components/CustomRichText.vue'
import {
  getActivityDetailAPI,
  getActivityMembersAPI,
  joinActivityAPI,
  recordActivityVisitAPI,
  removeMemberAPI,
  updateMemberNicknameAPI,
  updateMemberRoleAPI,
  updateMemberStatusAPI,
} from '@/service/activity'
import { useUserStore } from '@/store/user'
import { formatTime } from '@/utils/dateUtil'
import { setPageShareConfig } from '@/utils/share'

const userStore = useUserStore()
const { closeOutside } = useQueue()

const activityId = ref('')
const activity = ref<IActivity | null>(null)
const currentUserMember = ref<IActivityMember | null>(null)

// Loading states
const loading = ref(false)

// TabBar
const activeTab = ref('album')
const qrCodeRef = ref<InstanceType<typeof CheckInQRCode> | null>(null)

// Members management
const members = ref<IActivityMember[]>([])
const membersLoading = ref(false)
const membersRefreshing = ref(false)
const showJoinPopup = ref(false)
const showNicknamePopup = ref(false)
const nicknameForm = ref({
  nickname: '',
})
const joinForm = ref({
  nickname: userStore.userInfo?.nickname || '',
  joinReason: '',
})

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
    recordActivityVisitAPI(activityId.value).catch(() => {})
    // 从活动详情中初始化成员列表
    members.value = res.members || []
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

// 当前用户ID
const currentUserId = computed(() => userStore.userInfo?.userId)

// 我的成员信息
const myMemberInfo = computed(() => {
  return members.value.find(m => m.userId === currentUserId.value)
})

// 是否是活动管理员
const isActivityAdmin = computed(() => {
  // 1. 全局管理员
  if (userStore.isAdmin)
    return true
  // 2. 活动管理员
  return myMemberInfo.value?.role === 'ADMIN'
})

// 是否是活动成员（已加入）
const isActivityMember = computed(() => {
  return currentUserMember.value?.status === 'JOINED'
})

// 成员管理相关计算属性
const canManageMembers = computed(() => isActivityAdmin.value)
const pendingMembers = computed(() => members.value.filter(m => m.status === 'JOINING'))
const joinedMembers = computed(() => members.value.filter(m => m.status === 'JOINED'))
const joinStatus = computed(() => {
  if (!myMemberInfo.value)
    return 'NOT_JOINED'
  return myMemberInfo.value.status
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

function toLoginPage() {
  uni.navigateTo({
    url: '/pages/login/login',
  })
}

// 加载成员列表
async function loadMembers(isRefresh = false) {
  if (!activityId.value)
    return
  if (isRefresh) {
    membersRefreshing.value = true
  }
  else {
    membersLoading.value = true
  }
  try {
    const res = await getActivityMembersAPI(activityId.value)
    members.value = res
    // 更新当前用户成员信息
    currentUserMember.value = res.find(m => m.userId === userStore.userInfo?.userId) || null
  }
  catch (e) {
    console.log('Failed to load members, possibly not authorized')
  }
  finally {
    membersLoading.value = false
    membersRefreshing.value = false
  }
}

// 刷新成员数据
async function onMembersRefresh() {
  await loadMembers(true)
}

// 处理报名点击
function handleJoinClick() {
  if (!userStore.hasValidLogin) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  joinForm.value.nickname = userStore.userInfo?.nickname || ''
  joinForm.value.joinReason = ''
  showJoinPopup.value = true
}

// 提交报名
async function submitJoin() {
  if (!joinForm.value.nickname) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }

  try {
    await joinActivityAPI(activityId.value, joinForm.value)
    uni.showToast({ title: '申请已提交', icon: 'success' })
    showJoinPopup.value = false
    await loadMembers()
  }
  catch (e) {
    uni.showToast({ title: '申请失败', icon: 'none' })
  }
}

// 处理通过申请
async function handleApprove(memberId: string, userId: string) {
  try {
    await updateMemberStatusAPI(activityId.value, userId, 'JOINED')
    uni.showToast({ title: '已通过', icon: 'success' })
    await loadMembers()
  }
  catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

// 处理拒绝申请
async function handleReject(memberId: string, userId: string) {
  try {
    await removeMemberAPI(activityId.value, userId)
    uni.showToast({ title: '已拒绝', icon: 'success' })
    await loadMembers()
  }
  catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

// 处理剔除成员
async function handleRemoveMember(userId: string) {
  uni.showModal({
    title: '确认剔除',
    content: '确定要将该成员从活动中剔除吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await removeMemberAPI(activityId.value, userId)
          uni.showToast({ title: '已剔除', icon: 'success' })
          await loadMembers()
        }
        catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

// 处理角色选择
async function handleRoleSelect(userId: string, role: 'ADMIN' | 'ASSISTANT' | 'GENERAL') {
  try {
    await updateMemberRoleAPI(activityId.value, userId, role)
    uni.showToast({ title: '角色已更新', icon: 'success' })
    await loadMembers()
  }
  catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

// 打开修改昵称弹窗
function openNicknamePopup() {
  const myInfo = myMemberInfo.value
  if (!myInfo)
    return
  nicknameForm.value.nickname = myInfo.nickname || ''
  showNicknamePopup.value = true
}

// 提交修改昵称
async function submitNicknameUpdate() {
  if (!nicknameForm.value.nickname.trim()) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }

  try {
    await updateMemberNicknameAPI(activityId.value, currentUserId.value as string, nicknameForm.value.nickname.trim())
    uni.showToast({ title: '昵称已更新', icon: 'success' })
    showNicknamePopup.value = false
    await loadMembers()
  }
  catch (e) {
    uni.showToast({ title: '修改失败', icon: 'none' })
  }
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

        <!-- 活动标题和详情 -->
        <view class="absolute bottom-0 left-0 right-0 bg-black/40 p-4 backdrop-blur-sm">
          <text class="mb-2 block text-2xl text-white font-bold" selectable user-select>{{ activity.title }}</text>
          <text
            v-if="activity.summary"
            class="line-clamp-4 select-all text-sm text-white/90 leading-relaxed"
            selectable
            user-select
          >
            {{ activity.summary }}
          </text>
        </view>
        <!-- 管理菜单 -->
        <view v-if="isActivityAdmin" class="absolute right-4 top-4">
          <wd-popover mode="menu" :content="adminMenu" placement="left-start" @menuclick="handleAdminMenuClick">
            <view
              class="rounded-full bg-white/60 p-2 backdrop-blur-sm transition-opacity active:opacity-80"
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

        <view class="mt-3 flex items-center space-x-3">
          <view class="i-carbon-view mt-1 text-lg text-[#a33327]" />
          <view class="text-sm text-gray-600">
            {{ activity.visitCount || 0 }} 次访问
          </view>
        </view>
      </view>

      <!-- Content -->
      <view v-if="activity.content" class="m-4 rounded-lg bg-white p-4 shadow-sm">
        <CustomRichText :content="activity.content" class-name="text-gray-700 leading-relaxed" />
      </view>

      <!-- Join Action Bar -->
      <view class="border-t border-gray-200 bg-white p-4">
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
          加入审核中
        </button>
        <view v-else-if="joinStatus === 'JOINED'" class="w-full flex items-center space-x-2">
          <view
            class="flex-1 rounded-full bg-green-100 py-2 text-center text-sm text-green-600"
          >
            {{ myMemberInfo?.nickname || '用户' }}，欢迎回来
          </view>
          <button
            class="rounded-full bg-blue-100 px-3 py-2 text-xs text-blue-600"
            @click="openNicknamePopup"
          >
            修改昵称
          </button>
        </view>
      </view>

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
              v-if="userStore.hasValidLogin && activeTab === 'album'"
              :activity-id="activityId"
              :is-activity-admin="isActivityAdmin"
            />
            <view v-else class="min-h-50 flex flex-col items-center justify-center">
              <text>请先登录才能查看相册。</text>
              <wd-button type="primary" @click="toLoginPage">
                去登录
              </wd-button>
            </view>
          </wd-tab>

          <wd-tab title="签到记录" name="history" lazy>
            <CheckInMembers
              v-if="userStore.hasValidLogin && activeTab === 'history'"
              :activity-id="activityId"
            />
            <view v-else class="min-h-50 flex flex-col items-center justify-center">
              <text>请先登录才能查看签到记录。</text>
              <wd-button type="primary" @click="toLoginPage">
                去登录
              </wd-button>
            </view>
          </wd-tab>

          <wd-tab title="成员" name="members" lazy>
            <ActivityMembersPanel
              v-if="userStore.hasValidLogin && activeTab === 'members'"
              :activity-id="activityId"
              :members="members"
              :loading="membersLoading"
              :refreshing="membersRefreshing"
              :can-manage-members="canManageMembers"
              :pending-members="pendingMembers"
              :joined-members="joinedMembers"
              :current-user-id="currentUserId"
              @refresh="onMembersRefresh"
              @approve="handleApprove"
              @reject="handleReject"
              @remove-member="handleRemoveMember"
              @role-select="handleRoleSelect"
            />
            <view v-else class="min-h-50 flex flex-col items-center justify-center">
              <text>请先登录才能查看成员列表。</text>
              <wd-button type="primary" @click="toLoginPage">
                去登录
              </wd-button>
            </view>
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

      <!-- 报名弹窗 -->
      <wd-popup v-model="showJoinPopup" position="center" custom-style="width:90%; border-radius: 16px 16px 0 0; z-index: 100; overflow: hidden;">
        <view class="bg-white p-6 pb-safe">
          <view class="mb-6 text-center text-lg font-bold">
            报名信息
          </view>

          <view class="mb-4">
            <text class="mb-1 block text-sm text-gray-700 font-medium">昵称</text>
            <input
              v-model="joinForm.nickname"
              type="text"
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

      <!-- 修改昵称弹窗 -->
      <wd-popup v-model="showNicknamePopup" position="center" custom-style="width:90%; border-radius: 16px 16px 0 0; z-index: 100; overflow: hidden;">
        <view class="bg-white p-6 pb-safe">
          <view class="mb-6 text-center text-lg font-bold">
            修改昵称
          </view>

          <view class="mb-6">
            <text class="mb-1 block text-sm text-gray-700 font-medium">昵称</text>
            <input
              v-model="nicknameForm.nickname"
              type="text"
              class="border-gray-300 rounded-lg border-solid p-3 text-base"
              placeholder="请输入您的昵称"
              :maxlength="50"
            >
          </view>

          <view class="mb-6 flex space-x-3">
            <button
              class="flex-1 rounded-lg bg-gray-200 py-3 text-gray-700 font-bold"
              @click="showNicknamePopup = false"
            >
              取消
            </button>
            <button
              class="flex-1 rounded-lg bg-[#a33327] py-3 text-white font-bold"
              @click="submitNicknameUpdate"
            >
              确认修改
            </button>
          </view>
        </view>
      </wd-popup>
    </view>
  </view>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
