<script lang="ts" setup>
import type { IActivityMember } from '@/service/activity'
import dayjs from 'dayjs'
import { computed, ref, watch } from 'vue'
import {
  getActivityMembersAPI,
  joinActivityAPI,
  removeMemberAPI,
  updateMemberNicknameAPI,
  updateMemberRoleAPI,
  updateMemberStatusAPI,
} from '@/service/activity'
import { useUserStore } from '@/store/user'

const props = defineProps<{
  activityId: string
}>()

const emit = defineEmits<{
  (e: 'update'): void
}>()

const userStore = useUserStore()
const members = ref<IActivityMember[]>([])
const loading = ref(false)
const refreshing = ref(false)
const showJoinPopup = ref(false)
const showRoleActionSheet = ref(false)
const showNicknamePopup = ref(false)
const selectedMemberId = ref('')
const nicknameForm = ref({
  nickname: '',
})
const roleActions = ref([
  { name: '普通成员', value: 'GENERAL' },
  { name: '助教', value: 'ASSISTANT' },
  { name: '管理员', value: 'ADMIN' },
])
const joinForm = ref({
  nickname: userStore.userInfo.nickname || '',
  joinReason: '',
})

async function loadMembers(isRefresh = false) {
  if (!props.activityId)
    return
  if (isRefresh) {
    refreshing.value = true
  }
  else {
    loading.value = true
  }
  try {
    const res = await getActivityMembersAPI(props.activityId)
    members.value = res
  }
  catch (e) {
    console.log('Failed to load members, possibly not authorized')
  }
  finally {
    loading.value = false
    refreshing.value = false
  }
}

// 刷新数据
async function onRefresh() {
  await loadMembers(true)
}

watch(() => props.activityId, (newId) => {
  if (newId) {
    loadMembers()
  }
}, { immediate: true })

const currentUserId = computed(() => userStore.userInfo.userId)

const myMemberInfo = computed(() => {
  return members.value.find(m => m.userId === currentUserId.value)
})

const isAdmin = computed(() => {
  return myMemberInfo.value?.role === 'ADMIN'
})

const canManageMembers = computed(() => isAdmin.value)

const pendingMembers = computed(() => members.value.filter(m => m.status === 'JOINING'))
const joinedMembers = computed(() => members.value.filter(m => m.status === 'JOINED'))

const joinStatus = computed(() => {
  if (!myMemberInfo.value)
    return 'NOT_JOINED'
  return myMemberInfo.value.status
})

function handleJoinClick() {
  if (!userStore.hasValidLogin) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  joinForm.value.nickname = userStore.userInfo.nickname || ''
  showJoinPopup.value = true
}

async function submitJoin() {
  if (!joinForm.value.nickname) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }

  try {
    await joinActivityAPI(props.activityId, joinForm.value)
    uni.showToast({ title: '申请已提交', icon: 'success' })
    showJoinPopup.value = false
    await loadMembers()
    emit('update')
  }
  catch (e) {
    uni.showToast({ title: '申请失败', icon: 'none' })
  }
}

async function handleApprove(memberId: string, userId: string) {
  try {
    await updateMemberStatusAPI(props.activityId, userId, 'JOINED')
    uni.showToast({ title: '已通过', icon: 'success' })
    await loadMembers()
    emit('update')
  }
  catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function handleReject(memberId: string, userId: string) {
  try {
    await removeMemberAPI(props.activityId, userId)
    uni.showToast({ title: '已拒绝', icon: 'success' })
    await loadMembers()
    emit('update')
  }
  catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function handleRemoveMember(userId: string) {
  uni.showModal({
    title: '确认剔除',
    content: '确定要将该成员从活动中剔除吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await removeMemberAPI(props.activityId, userId)
          uni.showToast({ title: '已剔除', icon: 'success' })
          await loadMembers()
          emit('update')
        }
        catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

function openRoleActionSheet(userId: string) {
  selectedMemberId.value = userId
  showRoleActionSheet.value = true
}

async function handleRoleSelect({ item }: { item: { name: string, value: string } }) {
  if (!selectedMemberId.value)
    return
  try {
    await updateMemberRoleAPI(props.activityId, selectedMemberId.value, item.value as 'ADMIN' | 'ASSISTANT' | 'GENERAL')
    uni.showToast({ title: '角色已更新', icon: 'success' })
    await loadMembers()
    emit('update')
  }
  catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
  finally {
    selectedMemberId.value = ''
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
    await updateMemberNicknameAPI(props.activityId, currentUserId.value as string, nicknameForm.value.nickname.trim())
    uni.showToast({ title: '昵称已更新', icon: 'success' })
    showNicknamePopup.value = false
    await loadMembers()
    emit('update')
  }
  catch (e) {
    uni.showToast({ title: '修改失败', icon: 'none' })
  }
}

defineExpose({
  loadMembers,
  myMemberInfo,
  isAdmin,
})
</script>

<template>
  <view>
    <!-- Join Action Bar -->
    <view class="fixed bottom-0 left-0 right-0 z-5 border-t border-gray-200 bg-white p-4 pb-safe">
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
          {{ myMemberInfo?.nickname || '用户' }}，欢迎加入
        </view>
        <button
          class="rounded-full bg-blue-100 px-3 py-2 text-xs text-blue-600"
          @click="openNicknamePopup"
        >
          修改昵称
        </button>
      </view>
      <button
        v-else-if="joinStatus === 'CREATOR'"
        class="w-full rounded-full bg-gray-100 py-2 text-gray-600 font-bold"
        disabled
      >
        我是发起人
      </button>
    </view>

    <!-- Members List (for all users) -->
    <view v-if="!canManageMembers && joinedMembers.length > 0" class="m-4 rounded-lg bg-white p-4 shadow-sm">
      <view class="mb-3 flex items-center justify-between border-b border-gray-100 pb-2">
        <view class="flex items-center">
          <text class="text-lg text-gray-900 font-bold">
            已加入成员
          </text>
          <text class="ml-2 text-xs text-gray-500">
            共 {{ joinedMembers.length }} 人
          </text>
        </view>
        <wd-button
          type="icon"
          size="small"
          :loading="refreshing"
          @click="onRefresh"
        >
          <text class="i-carbon-renew text-lg" />
        </wd-button>
      </view>
      <view class="space-y-2">
        <view
          v-for="member in joinedMembers"
          :key="member.id"
          class="flex items-center justify-between border-b border-gray-50 py-2 last:border-0"
        >
          <view class="flex items-center">
            <view class="mr-3 h-8 w-8 flex items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500">
              {{ (member.nickname || 'U').charAt(0) }}
            </view>
            <text class="text-gray-800">
              {{ member.nickname || '用户' }}
            </text>
            <text v-if="member.role === 'ADMIN'" class="ml-2 rounded bg-yellow-100 px-1 text-xs text-yellow-800">
              管理员
            </text>
          </view>
          <text class="text-xs text-gray-400">
            {{ dayjs(member.createdAt).format('MM-DD') }}
          </text>
        </view>
      </view>
    </view>

    <!-- Admin Panel -->
    <view v-if="canManageMembers" class="m-4 rounded-lg bg-white p-4 shadow-sm">
      <view class="mb-3 flex items-center justify-between border-b border-gray-100 pb-2">
        <view class="flex items-center">
          <text class="text-lg text-gray-900 font-bold">
            管理面板
          </text>
          <text class="ml-2 text-xs text-gray-500">
            共 {{ members.length }} 人
          </text>
        </view>
        <wd-button
          type="icon"
          size="small"
          :loading="refreshing"
          @click="onRefresh"
        >
          <text class="i-carbon-renew text-lg" />
        </wd-button>
      </view>

      <view v-if="pendingMembers.length > 0" class="mb-6">
        <view class="mb-2 text-sm text-[#a33327] font-bold">
          待审核 ({{ pendingMembers.length }})
        </view>
        <view
          v-for="member in pendingMembers"
          :key="member.id"
          class="mb-3 border border-orange-100 rounded bg-orange-50 p-3"
        >
          <view class="flex items-start justify-between">
            <view>
              <text class="text-gray-800 font-bold">
                {{ member.nickname || '未命名' }}
              </text>
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

      <view>
        <view class="mb-2 text-sm text-green-700 font-bold">
          已加入 ({{ joinedMembers.length }})
        </view>
        <view v-if="joinedMembers.length === 0" class="py-2 text-sm text-gray-400">
          暂无成员
        </view>
        <view v-else class="space-y-2">
          <view
            v-for="member in joinedMembers"
            :key="member.id"
            class="flex items-center justify-between border-b border-gray-50 py-2 last:border-0"
          >
            <view class="flex items-center">
              <view class="mr-3 h-8 w-8 flex items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500">
                {{ (member.nickname || 'U').charAt(0) }}
              </view>
              <text class="text-gray-800">
                {{ member.nickname || '用户' }}
              </text>
            </view>
            <view class="flex items-center space-x-2">
              <wd-button
                v-if="member.userId !== currentUserId"
                type="info"
                size="small"
                plain
                @click="openRoleActionSheet(member.userId)"
              >
                {{ roleActions.find(r => r.value === member.role)?.name || '设置角色' }}
              </wd-button>
              <wd-button
                v-if="member.userId !== currentUserId"
                type="error"
                icon="delete"
                size="small"
                plain
                custom-class="border-none!"
                @click="handleRemoveMember(member.userId)"
              />
              <text class="text-xs text-gray-400">
                {{ dayjs(member.createdAt).format('MM-DD') }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Join Popup -->
    <wd-popup v-model="showJoinPopup" position="bottom" custom-style="border-radius: 16px 16px 0 0; z-index: 100; overflow: hidden;">
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

    <!-- Role Action Sheet -->
    <wd-action-sheet
      v-model="showRoleActionSheet"
      :actions="roleActions"
      title="选择角色"
      @select="handleRoleSelect"
    />

    <!-- Nickname Edit Popup -->
    <wd-popup v-model="showNicknamePopup" position="bottom" custom-style="border-radius: 16px 16px 0 0; z-index: 100; overflow: hidden;">
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

        <view class="flex space-x-3">
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

    <view class="h-24" />
  </view>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
