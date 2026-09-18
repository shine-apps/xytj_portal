<script lang="ts" setup>
import type { CreateChallengePayload, PracticeChallenge } from '@/service/practice'
import { computed, ref, watch } from 'vue'
import { createChallengeAPI } from '@/service/practice'
import { addDaysStr, dateStrToLocalMidnight, shanghaiDateStr, shanghaiToday } from '@/utils/dateUtil'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'success', challenge: PracticeChallenge): void
}>()

const visible = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value),
})

const formRef = ref()
const submitting = ref(false)

// 上海今天的本地零点时间戳（开始日期不得早于上海今天，与后端创建校验同口径）。
// computed：弹层可能长期挂载，跨零点打开时取最新值。
const todayStart = computed(() => dateStrToLocalMidnight(shanghaiToday()))

const form = ref(getDefaultForm())

// 结束日期选择器最早可选：开始日期的次日（先把选中时间戳还原为上海日历日再 +1 天）
const endMinDate = computed(() => {
  return dateStrToLocalMidnight(addDaysStr(shanghaiDateStr(form.value.startDate), 1))
})

function getDefaultForm() {
  // 默认上海明天开始、开始 + 30 天结束；值用对应日历日的设备本地零点时间戳
  const startDateStr = addDaysStr(shanghaiToday(), 1)
  const endDateStr = addDaysStr(startDateStr, 30)
  return {
    title: '',
    description: '',
    startDate: dateStrToLocalMidnight(startDateStr),
    endDate: dateStrToLocalMidnight(endDateStr),
  }
}

const rules = {
  title: [
    { required: true, message: '请输入挑战标题' },
    { required: false, validator: (value: string) => value.trim().length <= 50, message: '标题不能超过 50 字' },
  ],
  startDate: [
    { required: true, message: '请选择开始日期' },
    // 字符串字典序比较即日历序；日期统一按上海日历日
    { required: false, validator: (value: number) => shanghaiDateStr(value) >= shanghaiToday(), message: '开始日期不能早于今天' },
  ],
  endDate: [
    { required: true, message: '请选择结束日期' },
    {
      required: false,
      validator: (value: number) => {
        return shanghaiDateStr(value) > shanghaiDateStr(form.value.startDate)
      },
      message: '结束日期须晚于开始日期',
    },
  ],
}

watch(() => props.show, (show) => {
  if (show)
    form.value = getDefaultForm()
})

async function handleSubmit() {
  if (submitting.value)
    return

  const { valid } = await formRef.value.validate()
  if (!valid)
    return

  submitting.value = true
  try {
    const payload: CreateChallengePayload = {
      title: form.value.title.trim(),
      // 提交上海日历日，与后端校验/存储口径一致
      startDate: shanghaiDateStr(form.value.startDate),
      endDate: shanghaiDateStr(form.value.endDate),
    }
    const description = form.value.description.trim()
    if (description)
      payload.description = description

    const challenge = await createChallengeAPI(payload)
    uni.showToast({ title: '发起成功', icon: 'success' })
    visible.value = false
    emit('success', challenge)
  }
  catch (e) {
    console.error('发起挑战失败', e)
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <wd-popup v-model="visible" position="bottom" :safe-area-inset-bottom="true">
    <view class="rounded-t-2xl bg-[#fffdf9] px-4 pb-6 pt-3" style="font-family: 'KaiTi', 'STKaiti', 'serif'">
      <!-- 弹层标题 -->
      <view class="mb-3 flex items-center justify-between">
        <view class="w-6" />
        <view class="flex items-center">
          <view class="h-[1px] w-8 bg-[#a33327] opacity-50" />
          <text class="mx-3 text-lg text-[#1a1a1a] font-bold tracking-widest">发起挑战</text>
          <view class="h-[1px] w-8 bg-[#a33327] opacity-50" />
        </view>
        <view class="h-6 w-6 flex items-center justify-center" @click="visible = false">
          <wd-icon name="close" size="18px" color="#888" />
        </view>
      </view>

      <wd-form ref="formRef" :model="form" :rules="rules">
        <wd-cell-group border>
          <wd-input
            v-model="form.title"
            label="挑战标题"
            placeholder="请输入标题（1~50 字）"
            prop="title"
            required
            :maxlength="50"
            clearable
          />
          <wd-datetime-picker
            v-model="form.startDate"
            type="date"
            label="开始日期"
            placeholder="请选择开始日期"
            prop="startDate"
            required
            :min-date="todayStart"
          />
          <wd-datetime-picker
            v-model="form.endDate"
            type="date"
            label="结束日期"
            placeholder="请选择结束日期"
            prop="endDate"
            required
            :min-date="endMinDate"
          />
        </wd-cell-group>

        <view class="mt-4">
          <text class="mb-2 block px-1 text-sm text-[#555]">挑战说明（可选）</text>
          <view class="border border-[#e8e4dc] rounded-lg bg-white">
            <wd-textarea
              v-model="form.description"
              placeholder="写下挑战的缘起与规矩（≤500 字）"
              :maxlength="500"
              show-word-limit
              auto-height
            />
          </view>
        </view>
      </wd-form>

      <view class="mt-5">
        <wd-button
          block
          :loading="submitting"
          custom-style="background-color:#a33327;border-color:#a33327;border-radius:9999px;height:96rpx;font-size:32rpx;letter-spacing:8rpx"
          @click="handleSubmit"
        >
          立帖为证 · 发起挑战
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>
