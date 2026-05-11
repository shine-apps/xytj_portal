<script lang="ts" setup>
import type { IActivityMember } from '@/service/activity'
import { ref } from 'vue'
import { formatDate } from '@/utils/dateUtil'

const props = defineProps<{
  activityId: string
  members: IActivityMember[]
  loading: boolean
  refreshing: boolean
  canManageMembers: boolean
  pendingMembers: IActivityMember[]
  joinedMembers: IActivityMember[]
  currentUserId: string | undefined
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'approve', memberId: string, userId: string): void
  (e: 'reject', memberId: string, userId: string): void
  (e: 'remove-member', userId: string): void
  (e: 'role-select', userId: string, role: 'ADMIN' | 'GENERAL'): void
}>()

const roleActions = ref([
  { name: '普通成员', value: 'GENERAL' },
  { name: '管理员', value: 'ADMIN' },
])

// 角色选择 Action Sheet 显示状态
const showRoleActionSheet = ref(false)
const selectedMemberId = ref('')

// 刷新数据
function onRefresh() {
  emit('refresh')
}

function handleApprove(memberId: string, userId: string) {
  emit('approve', memberId, userId)
}

function handleReject(memberId: string, userId: string) {
  emit('reject', memberId, userId)
}

function handleRemoveMember(userId: string) {
  emit('remove-member', userId)
}

function openRoleActionSheet(userId: string) {
  selectedMemberId.value = userId
  showRoleActionSheet.value = true
}

function handleRoleSelect({ item }: { item: { name: string, value: string } }) {
  if (!selectedMemberId.value)
    return
  emit('role-select', selectedMemberId.value, item.value as 'ADMIN' | 'GENERAL')
  selectedMemberId.value = ''
}
</script>

<template>
  <view>
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
            {{ formatDate(member.createdAt) }}
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
                {{ formatDate(member.createdAt) }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="h-24" />

    <!-- 角色选择 Action Sheet -->
    <wd-action-sheet
      v-model="showRoleActionSheet"
      :actions="roleActions"
      title="选择角色"
      @select="handleRoleSelect"
    />
  </view>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
