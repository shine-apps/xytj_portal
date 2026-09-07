<script lang="ts" setup>
import type { CreateChallengePayload, PracticeChallenge } from '@/service/practice'
import dayjs from 'dayjs'
import { computed, ref, watch } from 'vue'
import { createChallengeAPI } from '@/service/practice'

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

// 今天零点时间戳（开始日期不得早于今天）
const todayStart = dayjs().startOf('day').valueOf()

const form = ref(getDefaultForm())

// 结束日期选择器最早可选：开始日期的次日
const endMinDate = computed(() => {
  return dayjs(form.value.startDate).startOf('day').add(1, 'day').valueOf()
})

function getDefaultForm() {
  const startDate = dayjs().add(1, 'day').startOf('day').valueOf()
  return {
    title: '',
    description: '',
    // 默认明天开始
    startDate,
    // 默认开始 + 30 天
    endDate: dayjs(startDate).add(30, 'day').valueOf(),
  }
}

const rules = {
  title: [
    { required: true, message: '请输入挑战标题' },
    { required: false, validator: (value: string) => value.trim().length <= 50, message: '标题不能超过 50 字' },
  ],
  startDate: [
    { required: true, message: '请选择开始日期' },
    { required: false, validator: (value: number) => dayjs(value).startOf('day').valueOf() >= todayStart, message: '开始日期不能早于今天' },
  ],
  endDate: [
    { required: true, message: '请选择结束日期' },
    {
      required: false,
      validator: (value: number) => {
        return dayjs(value).startOf('day').valueOf() > dayjs(form.value.startDate).startOf('day').valueOf()
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
      startDate: dayjs(form.value.startDate).format('YYYY-MM-DD'),
      endDate: dayjs(form.value.endDate).format('YYYY-MM-DD'),
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
