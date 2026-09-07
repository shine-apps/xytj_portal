<script setup lang="ts">
import type { PracticeCheckIn } from '@/service/practice'
import dayjs from 'dayjs'
import { computed } from 'vue'

const props = defineProps<{
  /** 展示月份 YYYY-MM */
  month: string
  /** 当月打卡记录 */
  checkIns: PracticeCheckIn[]
  /** 今天 YYYY-MM-DD */
  today: string
}>()

const emit = defineEmits<{
  (e: 'month-change', month: string): void
  (e: 'day-click', checkIn: PracticeCheckIn): void
}>()

/** 练拳类型色板（按名称哈希稳定取色） */
const TYPE_DOT_PALETTE = ['#3a5f6f', '#a33327', '#9c6b3f', '#6b8e5a', '#8a6ba8', '#b8b3ab']

function typeColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return TYPE_DOT_PALETTE[hash % TYPE_DOT_PALETTE.length]
}

/** 图例：从当月实际打卡记录中提取出现过的练拳类型（展开多选数组） */
const legendItems = computed(() => {
  const seen = new Map<string, string>()
  for (const item of props.checkIns) {
    for (const name of item.practiceType) {
      if (!seen.has(name)) {
        seen.set(name, typeColor(name))
      }
    }
  }
  const items: { label: string, color: string }[] = []
  seen.forEach((color, label) => items.push({ label, color }))
  return items
})

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

const monthTitle = computed(() => dayjs(`${props.month}-01`).format('YYYY年M月'))

const checkInMap = computed(() => {
  const map = new Map<string, PracticeCheckIn>()
  for (const item of props.checkIns) {
    map.set(item.checkInDate.slice(0, 10), item)
  }
  return map
})

interface CalendarCell {
  day: number
  date: string
  record?: PracticeCheckIn
  isToday: boolean
  isFuture: boolean
}

/** 当月网格（周一起始，前置空白格 day=0） */
const cells = computed<CalendarCell[]>(() => {
  const first = dayjs(`${props.month}-01`)
  const daysInMonth = first.daysInMonth()
  const leading = (first.day() + 6) % 7
  const list: CalendarCell[] = []
  for (let i = 0; i < leading; i++) {
    list.push({ day: 0, date: '', isToday: false, isFuture: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = first.date(d).format('YYYY-MM-DD')
    list.push({
      day: d,
      date,
      record: checkInMap.value.get(date),
      isToday: date === props.today,
      isFuture: date > props.today,
    })
  }
  return list
})

function switchMonth(delta: number) {
  emit('month-change', dayjs(`${props.month}-01`).add(delta, 'month').format('YYYY-MM'))
}

function onCellClick(cell: CalendarCell) {
  if (cell.record) {
    emit('day-click', cell.record)
  }
}

function dotColor(types: string[]) {
  // 日历单日只展示一个色点，取第一个功法的颜色
  return types.length ? typeColor(types[0]) : '#b8b3ab'
}
</script>

<template>
  <view>
    <!-- 月份切换 -->
    <view class="mb-1 flex items-center justify-between">
      <view class="h-8 w-8 flex items-center justify-center rounded-full active:bg-[#f0ece3]" @click="switchMonth(-1)">
        <text class="i-carbon-chevron-left text-base text-[#666]" />
      </view>
      <text class="text-base text-[#1a1a1a] font-bold tracking-widest">{{ monthTitle }}</text>
      <view class="h-8 w-8 flex items-center justify-center rounded-full active:bg-[#f0ece3]" @click="switchMonth(1)">
        <text class="i-carbon-chevron-right text-base text-[#666]" />
      </view>
    </view>

    <!-- 星期表头（周一起始） -->
    <view class="grid grid-cols-7">
      <view v-for="label in WEEK_LABELS" :key="label" class="py-1 text-center text-2xs text-[#999]">
        {{ label }}
      </view>
    </view>

    <!-- 日历网格 -->
    <view class="grid grid-cols-7">
      <view
        v-for="(cell, index) in cells"
        :key="index"
        class="h-14 flex flex-col items-center justify-center gap-0.5"
        :class="[
          cell.isToday ? 'border border-[#a33327] rounded-lg' : '',
          cell.record ? 'active:bg-[#f0ece3]' : '',
        ]"
        @click="onCellClick(cell)"
      >
        <template v-if="cell.day > 0">
          <text
            class="text-sm leading-none"
            :class="cell.isFuture ? 'text-[#c9c4bb]' : cell.isToday ? 'text-[#a33327] font-bold' : 'text-[#333]'"
          >
            {{ cell.day }}
          </text>
          <view v-if="cell.record" class="flex items-center gap-1">
            <view class="h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: dotColor(cell.record.practiceType) }" />
            <text class="text-2xs text-[#666] leading-none">{{ cell.record.durationMinutes }}分</text>
          </view>
        </template>
      </view>
    </view>

    <!-- 类型图例 -->
    <view class="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      <view v-for="item in legendItems" :key="item.label" class="flex items-center gap-1">
        <view class="h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: item.color }" />
        <text class="text-2xs text-[#999]">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>
