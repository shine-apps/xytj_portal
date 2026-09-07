<script setup lang="ts">
import type { BadgeLevel, PointsLedgerItem, PracticeBadge, PracticeGoal, PracticeStats } from '@/service/practice'
import dayjs from 'dayjs'
import { computed, onMounted, ref } from 'vue'
import { getBadgesAPI, getGoalAPI, getPointsLedgerAPI, getPracticeStatsAPI, saveGoalAPI } from '@/service/practice'

definePage({
  style: {
    navigationBarTitleText: '练拳统计',
  },
})

// ==================== 常量 ====================

/** 练拳类型色板（按顺序循环取色，动态功法名） */
const TYPE_COLOR_PALETTE = [
  '#4a6b8a', // 墨青
  '#b5493a', // 朱红
  '#a8763e', // 赭石
  '#6b8e5a', // 苔绿
  '#8a6ba8', // 紫
  '#a3a3a3', // 淡灰
]

/** 取练拳类型的稳定色点（按名称哈希取色板） */
function typeColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return TYPE_COLOR_PALETTE[hash % TYPE_COLOR_PALETTE.length]
}

/** 勋章样式 */
const BADGE_META: Record<BadgeLevel, { char: string, color: string }> = {
  BRONZE: { char: '铜', color: '#b0784a' },
  SILVER: { char: '银', color: '#8fa3b0' },
  GOLD: { char: '金', color: '#c9a227' },
}

const BADGE_ORDER: BadgeLevel[] = ['BRONZE', 'SILVER', 'GOLD']

/** 积分变动原因 → 中文标签 */
const REASON_LABELS: Record<string, string> = {
  checkin: '练拳打卡',
  checkin_edit: '打卡调整',
  checkin_delete: '打卡取消',
}

/** 柱状图最大高度百分比（顶部预留数值标签空间） */
const CHART_MAX_PERCENT = 90
/** 无数据月份的最小可见高度百分比 */
const MIN_VISIBLE_PERCENT = 6

// ==================== 状态 ====================

const stats = ref<PracticeStats | null>(null)
const badges = ref<PracticeBadge[]>([])
const ledger = ref<PointsLedgerItem[]>([])
const goal = ref<PracticeGoal | null>(null)
const loading = ref(true)

const showGoalEditor = ref(false)
const goalSaving = ref(false)
const editForm = ref({ weeklyTargetCount: 3, minDurationMinutes: 30 })

// ==================== 计算属性 ====================

const isEmpty = computed(() => !!stats.value && stats.value.totalDays === 0)

const totalHours = computed(() => {
  if (!stats.value)
    return 0
  return Math.round((stats.value.totalMinutes / 60) * 10) / 10
})

const trendBars = computed(() => {
  const trend = stats.value?.monthlyTrend ?? []
  const maxMinutes = Math.max(...trend.map(item => item.minutes), 0)
  const currentMonth = dayjs().format('YYYY-MM')
  return trend.map((item) => {
    const heightPercent = item.minutes > 0 && maxMinutes > 0
      ? (item.minutes / maxMinutes) * CHART_MAX_PERCENT
      : MIN_VISIBLE_PERCENT
    return {
      month: item.month,
      monthLabel: item.month.slice(5),
      hours: formatHours(item.minutes),
      heightPercent: Math.round(heightPercent * 10) / 10,
      isCurrent: item.month === currentMonth,
    }
  })
})

const typeRows = computed(() => {
  const dist = stats.value?.typeDistribution
  if (!dist)
    return []
  const entries = Object.entries(dist) as [string, number][]
  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  // 按次数降序展示
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => {
      return {
        type,
        label: type,
        color: typeColor(type),
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
      }
    })
})

const sortedBadges = computed(() => {
  return [...badges.value].sort(
    (a, b) => BADGE_ORDER.indexOf(a.level) - BADGE_ORDER.indexOf(b.level),
  )
})

/** 目标展示（优先统计接口的周进度，其次目标设置） */
const goalDisplay = computed(() => {
  const wg = stats.value?.weeklyGoal
  if (wg) {
    return {
      targetCount: wg.targetCount,
      minDuration: wg.minDurationMinutes,
      completedCount: wg.completedCount,
      achieved: wg.achieved,
    }
  }
  const g = goal.value
  if (g) {
    return {
      targetCount: g.weeklyTargetCount,
      minDuration: g.minDurationMinutes,
      completedCount: 0,
      achieved: false,
    }
  }
  return null
})

const goalProgressPercent = computed(() => {
  const g = goalDisplay.value
  if (!g || g.targetCount <= 0)
    return 0
  return Math.min(Math.round((g.completedCount / g.targetCount) * 100), 100)
})

// ==================== 方法 ====================

function formatHours(minutes: number): string {
  const hours = Math.round((minutes / 60) * 10) / 10
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
}

function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? '积分变动'
}

function formatLedgerTime(iso: string): string {
  const d = dayjs(iso)
  const now = dayjs()
  const time = d.format('HH:mm')
  const diffDays = now.startOf('day').diff(d.startOf('day'), 'day')
  if (diffDays === 0)
    return `今天 ${time}`
  if (diffDays === 1)
    return `昨天 ${time}`
  if (diffDays === 2)
    return `前天 ${time}`
  return d.isSame(now, 'year') ? d.format('M月D日 HH:mm') : d.format('YYYY年M月D日 HH:mm')
}

async function loadLedger() {
  try {
    const res = await getPointsLedgerAPI({ page: 1, pageSize: 10 })
    ledger.value = res.items ?? []
  }
  catch (e) {
    console.error('加载积分流水失败', e)
  }
}

async function loadGoal() {
  try {
    const res = await getGoalAPI()
    goal.value = res.goal ?? null
  }
  catch (e) {
    console.error('加载周目标失败', e)
  }
}

async function refreshStats() {
  try {
    stats.value = await getPracticeStatsAPI()
  }
  catch (e) {
    console.error('刷新练拳统计失败', e)
  }
}

function openGoalEditor() {
  const wg = stats.value?.weeklyGoal
  editForm.value = {
    weeklyTargetCount: goal.value?.weeklyTargetCount ?? wg?.targetCount ?? 3,
    minDurationMinutes: goal.value?.minDurationMinutes ?? wg?.minDurationMinutes ?? 30,
  }
  showGoalEditor.value = true
}

async function saveGoal() {
  if (goalSaving.value)
    return
  goalSaving.value = true
  try {
    goal.value = await saveGoalAPI({
      weeklyTargetCount: editForm.value.weeklyTargetCount,
      minDurationMinutes: editForm.value.minDurationMinutes,
    })
    showGoalEditor.value = false
    uni.showToast({ title: '目标已保存', icon: 'success' })
    await refreshStats()
  }
  catch (e) {
    console.error('保存周目标失败', e)
  }
  finally {
    goalSaving.value = false
  }
}

// ==================== 生命周期 ====================

onMounted(async () => {
  try {
    const [statsRes, badgesRes] = await Promise.all([getPracticeStatsAPI(), getBadgesAPI()])
    stats.value = statsRes
    badges.value = badgesRes.badges ?? []
  }
  catch (e) {
    console.error('加载练拳统计失败', e)
  }
  finally {
    loading.value = false
  }
  // 流水与目标独立加载，失败不影响主统计
  loadLedger()
  loadGoal()
})
</script>

<template>
  <view class="min-h-screen bg-[#f7f4ed] pb-10" :style="{ fontFamily: 'KaiTi, STKaiti, serif' }">
    <!-- 加载态 -->
    <view v-if="loading" class="h-screen flex flex-col items-center justify-center gap-3">
      <wd-loading color="#a33327" />
      <text class="text-sm text-[#999]">正在统计习拳数据…</text>
    </view>

    <template v-else>
      <!-- 主统计加载失败 -->
      <view v-if="!stats" class="mx-4 mt-6 flex flex-col items-center gap-2 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-8 shadow-sm">
        <text class="i-carbon-chart-line text-4xl text-[#d8d2c4]" />
        <text class="text-sm text-[#999]">统计数据加载失败，请稍后再试</text>
      </view>

      <template v-else>
        <!-- 空数据 -->
        <view v-if="isEmpty" class="mx-4 mt-4 flex flex-col items-center gap-2 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-8 shadow-sm">
          <text class="i-carbon-accessibility-alt text-5xl text-[#d8d2c4]" />
          <text class="mt-1 text-base text-[#1a1a1a] font-bold">开始你的第一次打卡吧</text>
          <text class="text-xs text-[#999]">日日行，不怕千万里</text>
        </view>

        <template v-else>
          <!-- 1. 数据卡片网格 -->
          <view class="grid grid-cols-2 mx-4 mt-4 gap-3">
            <view class="border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
              <view class="flex items-center gap-1 text-[#999]">
                <text class="i-carbon-calendar text-sm" />
                <text class="text-2xs">总打卡天数</text>
              </view>
              <view class="mt-2 flex items-baseline gap-1">
                <text class="text-3xl text-[#1a1a1a] font-bold">{{ stats.totalDays }}</text>
                <text class="text-xs text-[#999]">天</text>
              </view>
            </view>
            <view class="border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
              <view class="flex items-center gap-1 text-[#999]">
                <text class="i-carbon-fire text-sm" />
                <text class="text-2xs">当前连续</text>
              </view>
              <view class="mt-2 flex items-baseline gap-1">
                <text class="text-3xl text-[#1a1a1a] font-bold">{{ stats.currentStreak }}</text>
                <text class="text-xs text-[#999]">天</text>
              </view>
              <text class="mt-1 block text-2xs text-[#999]">最长连续 {{ stats.longestStreak }} 天</text>
            </view>
            <view class="border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
              <view class="flex items-center gap-1 text-[#999]">
                <text class="i-carbon-chart-line text-sm" />
                <text class="text-2xs">月均打卡</text>
              </view>
              <view class="mt-2 flex items-baseline gap-1">
                <text class="text-3xl text-[#1a1a1a] font-bold">{{ stats.monthlyAvg }}</text>
                <text class="text-xs text-[#999]">次/月</text>
              </view>
            </view>
            <view class="border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
              <view class="flex items-center gap-1 text-[#999]">
                <text class="i-carbon-trophy text-sm" />
                <text class="text-2xs">累计积分</text>
              </view>
              <view class="mt-2 flex items-baseline gap-1">
                <text class="text-3xl text-[#1a1a1a] font-bold">{{ stats.totalPoints }}</text>
                <text class="text-xs text-[#999]">分</text>
              </view>
              <text class="mt-1 block text-2xs text-[#999]">总时长 {{ totalHours }} 小时</text>
            </view>
          </view>

          <!-- 2. 近6个月训练时长趋势 -->
          <view class="mx-4 mb-3 mt-6 flex items-center">
            <view class="mr-2 h-5 w-1 rounded-full bg-[#a33327]" />
            <text class="text-lg text-[#1a1a1a] font-bold">近6个月训练时长</text>
          </view>
          <view class="mx-4 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
            <view class="h-40 flex items-end">
              <view
                v-for="bar in trendBars"
                :key="bar.month"
                class="h-full flex flex-1 flex-col items-center justify-end"
              >
                <text class="mb-1 text-2xs text-[#666]">{{ bar.hours }}</text>
                <view
                  class="w-6 rounded-t-sm from-[#2f2f2f] to-[#7a7a7a] bg-gradient-to-t"
                  :class="bar.isCurrent ? 'border border-[#a33327]' : ''"
                  :style="{ height: `${bar.heightPercent}%` }"
                />
              </view>
            </view>
            <view class="mt-2 flex border-t border-[#e0dbd0] border-dashed pt-2">
              <text
                v-for="bar in trendBars"
                :key="`${bar.month}-label`"
                class="flex-1 text-center text-2xs"
                :class="bar.isCurrent ? 'text-[#a33327] font-bold' : 'text-[#999]'"
              >
                {{ bar.monthLabel }}
              </text>
            </view>
          </view>

          <!-- 3. 训练类型分布 -->
          <view class="mx-4 mb-3 mt-6 flex items-center">
            <view class="mr-2 h-5 w-1 rounded-full bg-[#a33327]" />
            <text class="text-lg text-[#1a1a1a] font-bold">训练类型分布</text>
          </view>
          <view class="mx-4 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
            <view v-for="row in typeRows" :key="row.type" class="mb-4 last:mb-0">
              <view class="mb-1.5 flex items-center justify-between">
                <view class="flex items-center gap-1.5">
                  <view class="h-2 w-2 rounded-full" :style="{ backgroundColor: row.color }" />
                  <text class="text-sm text-[#1a1a1a]">{{ row.label }}</text>
                </view>
                <text class="text-2xs text-[#999]">{{ row.count }} 次 · {{ row.percent }}%</text>
              </view>
              <view class="h-1.5 overflow-hidden rounded-full bg-[#efeade]">
                <view
                  class="h-full rounded-full"
                  :style="{ width: `${row.percent}%`, backgroundColor: row.color }"
                />
              </view>
            </view>
          </view>
        </template>
      </template>

      <!-- 4. 勋章墙 -->
      <template v-if="badges.length > 0">
        <view class="mx-4 mb-3 mt-6 flex items-center">
          <view class="mr-2 h-5 w-1 rounded-full bg-[#a33327]" />
          <text class="text-lg text-[#1a1a1a] font-bold">勋章墙</text>
        </view>
        <view class="mx-4 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
          <view class="flex items-start justify-around">
            <view
              v-for="badge in sortedBadges"
              :key="badge.level"
              class="flex flex-col items-center"
              :class="badge.earned ? '' : 'opacity-50'"
            >
              <view
                class="h-16 w-16 flex items-center justify-center rounded-full text-2xl font-bold"
                :class="badge.earned
                  ? 'border-2 border-[#d4af37] text-white shadow-md'
                  : 'border-2 border-dashed border-[#c9c4b8] bg-[#f0ece2] text-[#b0aaa0]'"
                :style="badge.earned ? { backgroundColor: BADGE_META[badge.level].color } : {}"
              >
                {{ BADGE_META[badge.level].char }}
              </view>
              <text class="mt-2 text-sm font-bold" :class="badge.earned ? 'text-[#1a1a1a]' : 'text-[#999]'">
                {{ badge.name }}
              </text>
              <text class="mt-1 text-2xs text-[#999]">
                {{ badge.earned && badge.earnedAt ? `获得于 ${dayjs(badge.earnedAt).format('YYYY-MM-DD')}` : `连续 ${badge.threshold} 天解锁` }}
              </text>
            </view>
          </view>
        </view>
      </template>

      <!-- 5. 积分流水 -->
      <view class="mx-4 mb-3 mt-6 flex items-center">
        <view class="mr-2 h-5 w-1 rounded-full bg-[#a33327]" />
        <text class="text-lg text-[#1a1a1a] font-bold">积分流水</text>
      </view>
      <view class="mx-4 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
        <template v-if="ledger.length > 0">
          <view
            v-for="(item, index) in ledger"
            :key="item.id"
            class="flex items-center justify-between py-2.5"
            :class="index > 0 ? 'border-t border-[#efeade]' : ''"
          >
            <view class="flex flex-col gap-0.5">
              <text class="text-sm text-[#1a1a1a]">{{ reasonLabel(item.reason) }}</text>
              <text class="text-2xs text-[#999]">{{ formatLedgerTime(item.createdAt) }}</text>
            </view>
            <text class="text-base font-bold" :class="item.delta >= 0 ? 'text-[#4a6b8a]' : 'text-[#b5493a]'">
              {{ item.delta > 0 ? `+${item.delta}` : item.delta }}
            </text>
          </view>
        </template>
        <view v-else class="flex flex-col items-center gap-1 py-6">
          <text class="i-carbon-time text-3xl text-[#d8d2c4]" />
          <text class="text-xs text-[#999]">暂无积分记录</text>
        </view>
      </view>

      <!-- 6. 目标设置 -->
      <view class="mx-4 mb-3 mt-6 flex items-center justify-between">
        <view class="flex items-center">
          <view class="mr-2 h-5 w-1 rounded-full bg-[#a33327]" />
          <text class="text-lg text-[#1a1a1a] font-bold">目标设置</text>
        </view>
        <view class="flex items-center gap-1 active:opacity-70" @click="openGoalEditor">
          <text class="i-carbon-edit text-sm text-[#a33327]" />
          <text class="text-xs text-[#a33327]">{{ goalDisplay ? '编辑目标' : '设置目标' }}</text>
        </view>
      </view>
      <view class="mx-4 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
        <view v-if="goalDisplay">
          <view class="flex items-center justify-between">
            <text class="text-sm text-[#1a1a1a]">每周 {{ goalDisplay.targetCount }} 次 · 每次 ≥ {{ goalDisplay.minDuration }} 分钟</text>
            <view v-if="goalDisplay.achieved" class="flex-shrink-0 rounded-full bg-[#a33327] px-2 py-0.5 text-2xs text-white">
              本周目标达成
            </view>
          </view>
          <view class="mt-3 h-2 overflow-hidden rounded-full bg-[#efeade]">
            <view
              class="h-full rounded-full from-[#4a6b8a] to-[#33506b] bg-gradient-to-r"
              :style="{ width: `${goalProgressPercent}%` }"
            />
          </view>
          <text class="mt-2 block text-2xs text-[#999]">本周已完成 {{ goalDisplay.completedCount }}/{{ goalDisplay.targetCount }} 次</text>
        </view>
        <view v-else class="flex flex-col items-center gap-1 py-3">
          <text class="text-sm text-[#666]">尚未设置打卡目标</text>
          <text class="text-2xs text-[#999]">定个小目标，贵在坚持</text>
        </view>
      </view>

      <!-- 底部装饰 -->
      <view class="mt-8 flex justify-center opacity-30">
        <text class="text-2xs text-[#888] tracking-[0.5em]">拳不离手 曲不离口</text>
      </view>
    </template>

    <!-- 编辑目标弹层 -->
    <wd-popup
      v-model="showGoalEditor"
      position="bottom"
      closable
      :safe-area-inset-bottom="true"
      custom-style="background: #fffdf9; border-radius: 12px 12px 0 0;"
    >
      <view class="px-6 pb-8 pt-8">
        <text class="mb-6 block text-center text-lg text-[#1a1a1a] font-bold">编辑打卡目标</text>
        <view class="mb-6 flex items-center justify-between">
          <view>
            <text class="block text-sm text-[#1a1a1a]">每周打卡次数</text>
            <text class="mt-1 block text-2xs text-[#999]">范围 1 ~ 7 次</text>
          </view>
          <wd-input-number v-model="editForm.weeklyTargetCount" :min="1" :max="7" />
        </view>
        <view class="mb-8 flex items-center justify-between">
          <view>
            <text class="block text-sm text-[#1a1a1a]">单次最短时长（分钟）</text>
            <text class="mt-1 block text-2xs text-[#999]">范围 10 ~ 120，步进 10</text>
          </view>
          <wd-input-number v-model="editForm.minDurationMinutes" :min="10" :max="120" :step="10" />
        </view>
        <wd-button
          block
          :loading="goalSaving"
          custom-style="background: #a33327; border-color: #a33327; color: #fff;"
          @click="saveGoal"
        >
          保存目标
        </wd-button>
      </view>
    </wd-popup>
  </view>
</template>
