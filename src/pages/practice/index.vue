<script setup lang="ts">
import type { BadgeLevel, CheckInResponse, PracticeCheckIn, PracticeStats } from '@/service/practice'
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { getMonthlyCheckInsAPI, getPracticeStatsAPI, practiceTypeLabel } from '@/service/practice'
import { useUserStore } from '@/store/user'
import { getEnvBaseUrl } from '@/utils'
import { getOfflineQueue, syncOfflineQueue } from '@/utils/practice-offline'
import { toLoginPage } from '@/utils/toLoginPage'
import CheckInPopup from './components/CheckInPopup.vue'
import DayDetailPopup from './components/DayDetailPopup.vue'
import PracticeCalendar from './components/PracticeCalendar.vue'
import ReminderPopup from './components/ReminderPopup.vue'

definePage({
  style: {
    navigationBarTitleText: '练拳打卡',
  },
})

/**
 * 将当前时间转为 Asia/Shanghai (UTC+8) 时区的 Date 对象
 * 不使用 Intl.DateTimeFormat，兼容微信小程序真机等 Intl 不可用的环境
 */
function toShanghaiDate(): Date {
  const now = new Date()
  const tzOffsetMs = 8 * 60 * 60 * 1000
  return new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000 + tzOffsetMs)
}

/** Asia/Shanghai 时区的今天日期 YYYY-MM-DD */
function shanghaiToday(): string {
  return toShanghaiDate().toISOString().slice(0, 10)
}

/** Asia/Shanghai 时区的当前时间 HH:mm（24小时制） */
function shanghaiNowTime(): string {
  const d = toShanghaiDate()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** 提醒配置（与 ReminderPopup 共用的 storage 结构，键 practice_reminder） */
interface PracticeReminderSetting {
  enabled: boolean
  time: string
  days: number[]
}

const REMINDER_KEY = 'practice_reminder'
const REMINDER_SHOWN_DATE_KEY = 'practice_reminder_shown_date'

/** 勋章等级 → 文案（与后端 badges.get.ts 的勋章名保持一致） */
const BADGE_LABELS: Record<BadgeLevel, string> = {
  BRONZE: '铜牌',
  SILVER: '银牌',
  GOLD: '金牌',
}

/** 入口区配置 */
const ENTRIES = [
  { key: 'stats', title: '统计明细', icon: 'i-carbon-chart-bar' },
  { key: 'challenges', title: '打卡挑战', icon: 'i-carbon-trophy' },
  { key: 'reminder', title: '提醒设置', icon: 'i-carbon-alarm' },
]

const userStore = useUserStore()

const todayStr = ref(shanghaiToday())
const currentMonth = ref(shanghaiToday().slice(0, 7))
const stats = ref<PracticeStats | null>(null)
const monthlyCheckIns = ref<PracticeCheckIn[]>([])
const todayCheckIn = ref<PracticeCheckIn | null>(null)
const offlineCount = ref(0)
const syncing = ref(false)

const showCheckIn = ref(false)
const showDetail = ref(false)
const detailCheckIn = ref<PracticeCheckIn | null>(null)
const showReminder = ref(false)
const showReminderBanner = ref(false)

const weeklyGoalPercent = computed(() => {
  const goal = stats.value?.weeklyGoal
  if (!goal || !goal.targetCount) {
    return 0
  }
  return Math.min(100, Math.round((goal.completedCount / goal.targetCount) * 100))
})

onShow(() => {
  loadAll()
})

async function loadAll() {
  todayStr.value = shanghaiToday()
  offlineCount.value = getOfflineQueue().length
  if (!userStore.hasValidLogin) {
    return
  }
  currentMonth.value = shanghaiToday().slice(0, 7)
  await Promise.all([loadStats(), loadMonthly(currentMonth.value)])
  checkReminder()
}

async function loadStats() {
  try {
    stats.value = await getPracticeStatsAPI()
  }
  catch (e) {
    console.error('获取练拳统计失败', e)
  }
}

async function loadMonthly(month: string) {
  try {
    const res = await getMonthlyCheckInsAPI(month)
    monthlyCheckIns.value = res.checkIns
    if (month === shanghaiToday().slice(0, 7)) {
      todayCheckIn.value = res.checkIns.find(c => c.checkInDate.slice(0, 10) === todayStr.value) ?? null
    }
  }
  catch (e) {
    console.error('获取月度打卡记录失败', e)
  }
}

/**
 * 提醒检查（页面 onShow 时）：
 * 当日未打卡 && 当前时间已过提醒时间 && 今天在提醒日内 && 今日未提示过 → 页内横幅提示；
 * App 端额外尝试本地推送（uni.createPushMessage 在部分基座/设备不可用，失败时仅保留横幅）
 */
function checkReminder() {
  showReminderBanner.value = false
  if (todayCheckIn.value) {
    return
  }
  const saved = uni.getStorageSync(REMINDER_KEY) as Partial<PracticeReminderSetting> | undefined
  if (!saved || !saved.enabled || !Array.isArray(saved.days) || saved.days.length === 0) {
    return
  }
  const nowTime = shanghaiNowTime()
  if (typeof saved.time !== 'string' || !/^\d{2}:\d{2}$/.test(saved.time) || nowTime < saved.time) {
    return
  }
  const day = new Date(`${shanghaiToday()}T00:00:00.000Z`).getUTCDay() // 0(周日)~6
  const weekday = day === 0 ? 7 : day
  if (!saved.days.includes(weekday)) {
    return
  }
  if (uni.getStorageSync(REMINDER_SHOWN_DATE_KEY) === todayStr.value) {
    return
  }
  uni.setStorageSync(REMINDER_SHOWN_DATE_KEY, todayStr.value)
  showReminderBanner.value = true

  // #ifdef APP-PLUS
  // App 端尝试本地推送提醒；不支持时跳过（仅保留页内横幅）
  try {
    const createPushMessage = (uni as any).createPushMessage as ((opts: { title: string, content: string, sound?: string }) => void) | undefined
    if (typeof createPushMessage === 'function') {
      createPushMessage({
        title: '练拳打卡提醒',
        content: '今日还未打卡，别忘了坚持练习哦',
        sound: 'default',
      })
    }
  }
  catch (e) {
    // 部分设备不支持本地推送，忽略
  }
  // #endif
}

function ensureLogin(): boolean {
  if (!userStore.hasValidLogin) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    toLoginPage()
    return false
  }
  return true
}

// ==================== 打卡 ====================

function openCheckIn() {
  if (!ensureLogin()) {
    return
  }
  showReminderBanner.value = false
  showCheckIn.value = true
}

function startEditToday() {
  showCheckIn.value = true
}

async function onSubmitted(res: CheckInResponse | null) {
  showReminderBanner.value = false
  offlineCount.value = getOfflineQueue().length
  await Promise.all([loadStats(), loadMonthly(currentMonth.value)])
  if (!res) {
    return
  }
  const delta = res.pointsEarned
  uni.showToast({
    title: delta > 0 ? `打卡成功 +${delta} 积分` : '打卡已更新',
    icon: delta > 0 ? 'success' : 'none',
  })
  if (res.newBadges && res.newBadges.length > 0) {
    const names = res.newBadges.map(b => BADGE_LABELS[b] ?? b).join('、')
    setTimeout(() => {
      uni.showModal({
        title: '恭喜获得新勋章',
        content: `连续打卡 ${res.consecutiveDays} 天，获得「${names}」勋章！`,
        showCancel: false,
      })
    }, 800)
  }
}

async function onDeleted() {
  await Promise.all([loadStats(), loadMonthly(currentMonth.value)])
}

function onCheckInEdit(checkIn: PracticeCheckIn) {
  // 仅当日记录可编辑（服务端按日期 upsert）
  if (checkIn.checkInDate.slice(0, 10) === todayStr.value) {
    showCheckIn.value = true
  }
}

// ==================== 日历 ====================

function onMonthChange(month: string) {
  currentMonth.value = month
  loadMonthly(month)
}

function openDetail(checkIn: PracticeCheckIn) {
  detailCheckIn.value = checkIn
  showDetail.value = true
}

// ==================== 离线同步 ====================

async function syncNow() {
  if (syncing.value) {
    return
  }
  syncing.value = true
  try {
    await syncOfflineQueue(() => {
      offlineCount.value = getOfflineQueue().length
    })
    offlineCount.value = getOfflineQueue().length
    if (offlineCount.value === 0) {
      uni.showToast({ title: '同步完成', icon: 'success' })
      await Promise.all([loadStats(), loadMonthly(currentMonth.value)])
    }
  }
  finally {
    syncing.value = false
  }
}

// ==================== 入口区 ====================

function onEntry(key: string) {
  if (!ensureLogin()) {
    return
  }
  if (key === 'stats') {
    uni.navigateTo({
      url: '/pages/practice/stats',
      fail: () => uni.showToast({ title: '页面暂未开放', icon: 'none' }),
    })
  }
  else if (key === 'challenges') {
    uni.navigateTo({
      url: '/pages/practice/challenges',
      fail: () => uni.showToast({ title: '页面暂未开放', icon: 'none' }),
    })
  }
  else if (key === 'reminder') {
    showReminder.value = true
  }
  else if (key === 'export') {
    handleExport()
  }
}

/** 导出本人全部打卡记录（GET /api/practice/export，CSV） */
function handleExport() {
  const token = userStore.tokenInfo.token
  if (!token) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  uni.showLoading({ title: '正在导出', mask: true })

  // #ifdef H5
  // H5：经请求拦截器自动拼接基准地址/代理前缀，拉取 CSV 后转 Blob 触发浏览器下载
  uni.request({
    url: '/api/practice/export',
    method: 'GET',
    responseType: 'arraybuffer',
    header: { Authorization: `Bearer ${token}` },
    success: (res) => {
      uni.hideLoading()
      if (res.statusCode !== 200) {
        uni.showToast({ title: '导出失败', icon: 'none' })
        return
      }
      const blob = new Blob([res.data as ArrayBuffer], { type: 'text/csv;charset=utf-8' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `practice-checkins-${shanghaiToday().replace(/-/g, '')}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
      uni.showToast({ title: '导出成功', icon: 'success' })
    },
    fail: () => {
      uni.hideLoading()
      uni.showToast({ title: '导出失败，请重试', icon: 'none' })
    },
  })
  // #endif

  // #ifndef H5
  // 小程序 / App：downloadFile 携带 token 下载后打开文档（可转发/保存）
  uni.downloadFile({
    url: `${getEnvBaseUrl()}/api/practice/export`,
    header: { Authorization: `Bearer ${token}` },
    success: (res) => {
      uni.hideLoading()
      if (res.statusCode === 200) {
        uni.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          // 部分环境（如微信小程序）不支持预览 CSV，提供剪贴板复制兜底
          fail: offerCopyCsvContent,
        })
      }
      else {
        uni.showToast({ title: '导出失败', icon: 'none' })
      }
    },
    fail: () => {
      uni.hideLoading()
      uni.showToast({ title: '导出失败，请重试', icon: 'none' })
    },
  })
  // #endif
}

/**
 * 当前环境不支持预览 CSV 时的兜底：拉取 CSV 文本复制到剪贴板，
 * 用户可粘贴到 Excel / 备忘录等工具中使用
 */
function offerCopyCsvContent() {
  uni.showModal({
    title: '不支持预览 CSV',
    content: '当前环境无法直接打开 CSV 文件，可将内容复制到剪贴板后粘贴使用',
    confirmText: '复制内容',
    success: (modalRes) => {
      if (!modalRes.confirm) {
        return
      }
      // 经请求拦截器自动携带基准地址与登录凭证
      uni.request({
        url: '/api/practice/export',
        method: 'GET',
        success: (res) => {
          if (res.statusCode === 200 && typeof res.data === 'string' && res.data) {
            uni.setClipboardData({ data: res.data })
          }
          else {
            uni.showToast({ title: '复制失败', icon: 'none' })
          }
        },
        fail: () => {
          uni.showToast({ title: '复制失败', icon: 'none' })
        },
      })
    },
  })
}
</script>

<template>
  <view class="min-h-screen bg-[#f7f7f7] pb-8">
    <!-- 离线待同步提示条 -->
    <view
      v-if="offlineCount > 0"
      class="mx-4 mt-3 flex items-center justify-between border border-[#e8d9c8] rounded-lg bg-[#fdf6ec] px-4 py-2"
      @click="syncNow"
    >
      <view class="flex items-center gap-1.5">
        <text class="i-carbon-renew text-sm text-[#a33327]" :class="syncing ? 'animate-spin' : ''" />
        <text class="text-xs text-[#8a6d3b]">有 {{ offlineCount }} 条打卡待同步，点击立即同步</text>
      </view>
      <text class="i-carbon-chevron-right text-xs text-[#b8a880]" />
    </view>

    <!-- 未打卡提醒横幅 -->
    <view
      v-if="showReminderBanner"
      class="mx-4 mt-3 flex items-center justify-between border border-[#f0d7d3] rounded-lg bg-[#fdf1ef] px-4 py-2"
    >
      <view class="flex items-center gap-1.5">
        <text class="i-carbon-alarm text-sm text-[#a33327]" />
        <text class="text-xs text-[#a33327]">今日还未打卡，坚持练习哦</text>
      </view>
      <view class="rounded-full bg-[#a33327] px-3 py-0.5" @click="openCheckIn">
        <text class="text-2xs text-white">去打卡</text>
      </view>
    </view>

    <!-- 今日打卡状态卡 -->
    <view class="mx-4 mt-4 overflow-hidden border border-[#e8e4dc] rounded-lg bg-[#fffdf9] shadow-md">
      <view class="px-5 pb-5 pt-4">
        <view class="mb-3 flex items-center justify-between">
          <view class="flex items-center gap-2">
            <view class="mr-1 h-5 w-1 rounded-full bg-[#a33327]" />
            <text class="text-base text-[#1a1a1a] font-bold">今日打卡</text>
          </view>
          <view v-if="todayCheckIn" class="flex items-center gap-1 rounded-full bg-green-50 px-2 py-1">
            <text class="i-carbon-checkmark-filled text-2xs text-green-500" />
            <text class="text-2xs text-green-600">已打卡</text>
          </view>
        </view>

        <!-- 未打卡 -->
        <view v-if="!todayCheckIn">
          <view class="mb-4 text-sm text-[#666]">
            今日还未打卡{{ stats?.currentStreak ? `，已连续坚持 ${stats.currentStreak} 天` : '' }}
          </view>
          <view class="mb-5 flex items-center justify-around border border-[#e8e4dc] rounded-lg bg-[#faf8f3] py-3">
            <view class="flex flex-col items-center gap-0.5">
              <text class="text-2xl text-[#a33327] font-bold">{{ stats?.currentStreak ?? '-' }}</text>
              <text class="text-2xs text-[#999]">连续打卡（天）</text>
            </view>
            <view class="h-8 w-px bg-[#e8e4dc]" />
            <view class="flex flex-col items-center gap-0.5">
              <text class="text-2xl text-[#a33327] font-bold">{{ stats?.totalDays ?? '-' }}</text>
              <text class="text-2xs text-[#999]">累计打卡（天）</text>
            </view>
            <view class="h-8 w-px bg-[#e8e4dc]" />
            <view class="flex flex-col items-center gap-0.5">
              <text class="text-2xl text-[#a33327] font-bold">{{ stats?.totalPoints ?? '-' }}</text>
              <text class="text-2xs text-[#999]">累计积分</text>
            </view>
          </view>
          <wd-button block custom-style="background-color: #a33327; border-color: #a33327;" @click="openCheckIn">
            去打卡
          </wd-button>
        </view>

        <!-- 已打卡 -->
        <view v-else>
          <view class="mb-4 flex items-center gap-2">
            <text class="text-sm text-[#1a1a1a] font-medium">{{ practiceTypeLabel(todayCheckIn.practiceType) }}</text>
            <view class="flex items-center gap-0.5 text-sm text-[#555]">
              <text class="i-carbon-time" />
              <text>{{ todayCheckIn.durationMinutes }} 分钟</text>
            </view>
            <text class="text-sm text-[#a33327] font-medium">+{{ todayCheckIn.points }} 积分</text>
            <text v-if="todayCheckIn.medias?.length" class="text-2xs text-[#999]">含 {{ todayCheckIn.medias.length }} 个媒体</text>
          </view>
          <view class="mb-4 flex items-center justify-around border border-[#e8e4dc] rounded-lg bg-[#faf8f3] py-3">
            <view class="flex flex-col items-center gap-0.5">
              <text class="text-2xl text-[#a33327] font-bold">{{ stats?.currentStreak ?? '-' }}</text>
              <text class="text-2xs text-[#999]">连续打卡（天）</text>
            </view>
            <view class="h-8 w-px bg-[#e8e4dc]" />
            <view class="flex flex-col items-center gap-0.5">
              <text class="text-2xl text-[#a33327] font-bold">{{ stats?.totalDays ?? '-' }}</text>
              <text class="text-2xs text-[#999]">累计打卡（天）</text>
            </view>
            <view class="h-8 w-px bg-[#e8e4dc]" />
            <view class="flex flex-col items-center gap-0.5">
              <text class="text-2xl text-[#a33327] font-bold">{{ stats?.totalPoints ?? '-' }}</text>
              <text class="text-2xs text-[#999]">累计积分</text>
            </view>
          </view>
          <view class="flex gap-3">
            <wd-button
              class="flex-1"
              plain
              custom-style="background-color: #fffdf9; color: #555; border-color: #e8e4dc;"
              @click="openDetail(todayCheckIn)"
            >
              查看详情
            </wd-button>
            <wd-button class="flex-1" custom-style="background-color: #a33327; border-color: #a33327;" @click="startEditToday">
              修改打卡
            </wd-button>
          </view>
        </view>
      </view>
    </view>

    <!-- 本周目标进度 -->
    <view v-if="stats?.weeklyGoal" class="mx-4 mt-4 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
      <view class="mb-2 flex items-center justify-between">
        <view class="flex items-center gap-2">
          <view class="mr-1 h-5 w-1 rounded-full bg-[#a33327]" />
          <text class="text-sm text-[#1a1a1a] font-bold">本周目标</text>
        </view>
        <text class="text-xs" :class="stats.weeklyGoal.achieved ? 'text-green-600' : 'text-[#999]'">
          {{ stats.weeklyGoal.achieved ? '🎉 本周目标达成' : `已完成 ${stats.weeklyGoal.completedCount}/${stats.weeklyGoal.targetCount} 次` }}
        </text>
      </view>
      <wd-progress :percentage="weeklyGoalPercent" color="#a33327" />
    </view>

    <!-- 月度日历 -->
    <view class="mx-4 mt-4 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
      <PracticeCalendar
        :month="currentMonth"
        :check-ins="monthlyCheckIns"
        :today="todayStr"
        @month-change="onMonthChange"
        @day-click="openDetail"
      />
    </view>

    <!-- 入口区 -->
    <view class="mx-4 mt-4 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
      <view class="grid grid-cols-3 gap-2">
        <view
          v-for="entry in ENTRIES"
          :key="entry.key"
          class="flex flex-col items-center gap-1.5 py-2 active:opacity-60"
          @click="onEntry(entry.key)"
        >
          <view class="h-10 w-10 flex items-center justify-center border border-[#333]/20 rounded-full bg-white">
            <text :class="entry.icon" class="text-lg text-[#1a1a1a]" />
          </view>
          <text class="text-xs text-[#555]">{{ entry.title }}</text>
        </view>
      </view>
    </view>

    <!-- 快速打卡弹层（今日已打卡时自动进入编辑模式） -->
    <CheckInPopup v-model:visible="showCheckIn" :edit-data="todayCheckIn" @submitted="onSubmitted" />

    <!-- 当日详情弹层 -->
    <DayDetailPopup
      v-model:visible="showDetail"
      :check-in="detailCheckIn"
      @deleted="onDeleted"
      @edit="onCheckInEdit"
    />

    <!-- 提醒设置弹层 -->
    <ReminderPopup v-model:visible="showReminder" />
  </view>
</template>
