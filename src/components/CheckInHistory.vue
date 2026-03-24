<script setup lang="ts">
import type { IActivityCheckIn } from '@/service/checkin'
import dayjs from 'dayjs'
import { ref, watch } from 'vue'
import { getCheckInHistoryAPI } from '@/service/checkin'

const props = defineProps<{
  activityId: string
}>()

const history = ref<IActivityCheckIn[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const limit = 20

async function loadHistory(reset = false) {
  if (!props.activityId)
    return
  if (reset) {
    page.value = 1
    history.value = []
    hasMore.value = true
  }
  if (!hasMore.value && !reset)
    return

  loading.value = true
  try {
    const res = await getCheckInHistoryAPI(props.activityId, { page: page.value, limit })
    if (reset) {
      history.value = res
    }
    else {
      history.value.push(...res)
    }
    hasMore.value = res.length === limit
    if (hasMore.value)
      page.value++
  }
  catch (e) {
    console.error('加载签到历史失败', e)
  }
  finally {
    loading.value = false
  }
}

watch(() => props.activityId, (newId) => {
  if (newId) {
    loadHistory(true)
  }
}, { immediate: true })

function formatDate(date: string) {
  return dayjs(date).format('YYYY-MM-DD')
}

function onLoadMore() {
  loadHistory()
}
</script>

<template>
  <view class="check-in-history">
    <view class="history-card">
      <view class="history-header">
        <text class="title">签到历史</text>
        <text class="subtitle">共 {{ history.length }} 条记录</text>
      </view>

      <view v-if="loading && history.length === 0" class="loading-state">
        <view class="loading-spinner" />
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="history.length === 0" class="empty-state">
        <text class="i-carbon-calendar text-4xl text-gray-300" />
        <text class="empty-text">暂无签到记录</text>
      </view>

      <view v-else class="history-list">
        <view
          v-for="item in history"
          :key="item.id"
          class="history-item"
        >
          <view class="item-left">
            <image
              v-if="item.user?.avatarUrl"
              :src="item.user.avatarUrl"
              class="user-avatar"
              mode="aspectFill"
            />
            <view v-else class="user-avatar-placeholder">
              <text class="i-carbon-user text-lg text-gray-400" />
            </view>
          </view>
          <view class="item-center">
            <text class="user-name">{{ item.user?.nickname || '未知用户' }}</text>
            <view class="check-in-info">
              <text class="check-in-date">{{ formatDate(item.checkInDate) }}</text>
              <text class="check-in-time">{{ dayjs(item.createdAt).format('HH:mm') }}</text>
            </view>
          </view>
          <view class="item-right">
            <view class="consecutive-badge">
              <text class="i-carbon-fire text-xs text-white" />
              <text class="days-text">{{ item.consecutiveDays }}天</text>
            </view>
          </view>
        </view>

        <view v-if="hasMore" class="load-more" @click="onLoadMore">
          <text v-if="loading" class="load-text">加载中...</text>
          <text v-else class="load-text">点击加载更多</text>
        </view>

        <view v-else-if="history.length > 0" class="no-more">
          <text class="no-more-text">没有更多了</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.check-in-history {
  padding: 16px;
}

.history-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;

  .title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .subtitle {
    font-size: 12px;
    color: #999;
  }
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  gap: 12px;

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #a33327;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .loading-text,
  .empty-text {
    font-size: 14px;
    color: #999;
  }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;

  .item-left {
    .user-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #f0f0f0;
    }

    .user-avatar-placeholder {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .item-center {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .user-name {
      font-size: 15px;
      color: #333;
      font-weight: 500;
    }

    .check-in-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .check-in-date {
        font-size: 12px;
        color: #666;
      }

      .check-in-time {
        font-size: 12px;
        color: #999;
      }
    }
  }

  .item-right {
    .consecutive-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: #a33327;
      border-radius: 12px;

      .days-text {
        font-size: 11px;
        color: #fff;
      }
    }
  }
}

.load-more,
.no-more {
  text-align: center;
  padding: 12px 0;

  .load-text,
  .no-more-text {
    font-size: 12px;
    color: #999;
  }
}

.load-more {
  &:active {
    opacity: 0.7;
  }
}
</style>
