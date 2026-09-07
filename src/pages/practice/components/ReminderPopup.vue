<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/** 提醒配置（存 uni storage 键 practice_reminder） */
interface PracticeReminderSetting {
  enabled: boolean
  /** 提醒时间 HH:mm */
  time: string
  /** 每周几提醒，1~7（周一~周日），[1..7] 表示每天 */
  days: number[]
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
}>()

const REMINDER_KEY = 'practice_reminder'

const DEFAULT_REMINDER: PracticeReminderSetting = {
  enabled: false,
  time: '20:00',
  days: [1, 2, 3, 4, 5, 6, 7],
}

const DAY_OPTIONS = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 7, label: '日' },
]

const form = ref<PracticeReminderSetting>({ ...DEFAULT_REMINDER, days: [...DEFAULT_REMINDER.days] })

watch(() => props.visible, (val) => {
  if (val) {
    const saved = uni.getStorageSync(REMINDER_KEY) as Partial<PracticeReminderSetting> | undefined
    form.value = saved
      ? {
          enabled: !!saved.enabled,
          time: typeof saved.time === 'string' && /^\d{2}:\d{2}$/.test(saved.time) ? saved.time : DEFAULT_REMINDER.time,
          days: Array.isArray(saved.days) ? saved.days.filter(d => d >= 1 && d <= 7) : [...DEFAULT_REMINDER.days],
        }
      : { ...DEFAULT_REMINDER, days: [...DEFAULT_REMINDER.days] }
  }
})

const isEveryDay = computed(() => DAY_OPTIONS.every(d => form.value.days.includes(d.value)))

function toggleEveryDay() {
  form.value.days = [1, 2, 3, 4, 5, 6, 7]
}

function toggleDay(v: number) {
  const index = form.value.days.indexOf(v)
  if (index >= 0) {
    form.value.days.splice(index, 1)
  }
  else {
    form.value.days.push(v)
  }
}

function close() {
  emit('update:visible', false)
}

function save() {
  if (form.value.enabled && form.value.days.length === 0) {
    uni.showToast({ title: '请至少选择一个提醒日', icon: 'none' })
    return
  }
  uni.setStorageSync(REMINDER_KEY, form.value)
  uni.showToast({ title: '已保存', icon: 'success' })
  close()
}
</script>

<template>
  <wd-popup
    :model-value="visible"
    position="bottom"
    custom-style="border-radius: 16px 16px 0 0; z-index: 1100;"
    @close="close"
  >
    <view class="px-4 pb-6">
      <!-- 标题栏 -->
      <view class="flex items-center justify-between border-b border-[#eee9df] py-3">
        <text class="text-lg text-[#1a1a1a] font-bold">打卡提醒设置</text>
        <wd-button type="icon" icon="close" size="small" @click="close" />
      </view>

      <view class="py-4">
        <!-- 启用开关 -->
        <view class="mb-4 flex items-center justify-between">
          <view class="flex items-center gap-1">
            <text class="i-carbon-alarm text-sm text-[#a33327]" />
            <text class="text-sm text-[#1a1a1a] font-medium">启用提醒</text>
          </view>
          <wd-switch v-model="form.enabled" size="20px" />
        </view>

        <!-- 时间选择 -->
        <wd-datetime-picker
          v-model="form.time"
          type="time"
          label="提醒时间"
          title="选择提醒时间"
        />

        <!-- 频率 -->
        <view class="mb-2 mt-4">
          <text class="mb-2 block text-sm text-[#555] font-medium">提醒频率</text>
          <view class="flex flex-wrap gap-2">
            <view
              class="border rounded-full px-3 py-1.5 text-sm transition-colors"
              :class="isEveryDay
                ? 'bg-[#a33327] border-[#a33327] text-white font-medium'
                : 'bg-[#fffdf9] border-[#e8e4dc] text-[#555]'"
              @click="toggleEveryDay"
            >
              每天
            </view>
            <view
              v-for="d in DAY_OPTIONS"
              :key="d.value"
              class="w-10 border rounded-full py-1.5 text-center text-sm transition-colors"
              :class="form.days.includes(d.value)
                ? 'bg-[#a33327] border-[#a33327] text-white font-medium'
                : 'bg-[#fffdf9] border-[#e8e4dc] text-[#555]'"
              @click="toggleDay(d.value)"
            >
              {{ d.label }}
            </view>
          </view>
          <text class="mt-2 block text-2xs text-[#999]">
            到达提醒时间且当日未打卡时，会在打卡主页内横幅提示
          </text>
        </view>
      </view>

      <!-- 保存 -->
      <view style="padding-bottom: env(safe-area-inset-bottom)">
        <wd-button block custom-style="background-color: #a33327; border-color: #a33327;" @click="save">
          保存
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>
