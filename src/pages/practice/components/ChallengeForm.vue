<script lang="ts" setup>
import type { CreateChallengePayload, PracticeChallenge } from '@/service/practice'
import { computed, ref, watch } from 'vue'
import { createChallengeAPI, updateChallengeAPI } from '@/service/practice'
import { addDaysStr, dateStrToLocalMidnight, shanghaiToday } from '@/utils/dateUtil'

const props = defineProps<{
  show: boolean
  challenge?: PracticeChallenge
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'success', challenge?: PracticeChallenge): void
}>()

const isEditing = computed(() => Boolean(props.challenge))

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

/** 日期选择器的本地零点时间戳转为其展示的 YYYY-MM-DD */
function pickerDateStr(value: number): string {
  const date = new Date(value)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// 结束日期选择器最早可选：开始日期的次日
const endMinDate = computed(() => {
  return dateStrToLocalMidnight(addDaysStr(pickerDateStr(form.value.startDate), 1))
})

function getDefaultForm() {
  if (props.challenge) {
    return {
      title: props.challenge.title,
      description: props.challenge.description ?? '',
      startDate: dateStrToLocalMidnight(props.challenge.startDate),
      endDate: dateStrToLocalMidnight(props.challenge.endDate),
    }
  }

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
    // 创建限制开始日期不早于今天；编辑允许保留或选择过去日期
    {
      required: false,
      validator: (value: number) => isEditing.value || pickerDateStr(value) >= shanghaiToday(),
      message: '开始日期不能早于今天',
    },
  ],
  endDate: [
    { required: true, message: '请选择结束日期' },
    {
      required: false,
      validator: (value: number) => {
        return pickerDateStr(value) > pickerDateStr(form.value.startDate)
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
      description: form.value.description.trim(),
      // 提交日期选择器展示的日历日，与后端存储口径一致
      startDate: pickerDateStr(form.value.startDate),
      endDate: pickerDateStr(form.value.endDate),
    }

    if (props.challenge) {
      await updateChallengeAPI(props.challenge.id, payload)
      uni.showToast({ title: '保存成功', icon: 'success' })
      visible.value = false
      emit('success')
      return
    }

    const challenge = await createChallengeAPI(payload)
    uni.showToast({ title: '发起成功', icon: 'success' })
    visible.value = false
    emit('success', challenge)
  }
  catch (e) {
    console.error(isEditing.value ? '保存挑战失败' : '发起挑战失败', e)
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
          <text class="mx-3 text-lg text-[#1a1a1a] font-bold tracking-widest">{{ isEditing ? '编辑挑战' : '发起挑战' }}</text>
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
            :min-date="isEditing ? undefined : todayStart"
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
          {{ isEditing ? '保存修改' : '立帖为证 · 发起挑战' }}
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>
