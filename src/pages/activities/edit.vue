<script lang="ts" setup>
import type { IActivity } from '@/service/activity'
import { onLoad } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { computed, ref } from 'vue'
import useUpload from '@/hooks/useUpload'
import { getActivityDetailAPI, getActivityMembersAPI, updateActivityAPI } from '@/service/activity'
import { useUserStore } from '@/store/user'

definePage({
  style: {
    navigationBarTitleText: '编辑活动',
  },
})

const userStore = useUserStore()
const activityId = ref('')
const activity = ref<IActivity | null>(null)
const loading = ref(false)
const saving = ref(false)

// 表单数据
const form = ref({
  title: '',
  coverUrl: '',
  summary: '',
  content: '',
  startTime: '',
  endTime: '',
  location: undefined as any,
})

// 时间选择器显示状态
const showStartTimePicker = ref(false)
const showEndTimePicker = ref(false)

// 临时存储选择器当前值
const tempStartTime = ref<number>(Date.now())
const tempEndTime = ref<number>(Date.now())

// 格式化后的时间显示
const formattedStartTime = computed(() => {
  if (!form.value.startTime)
    return '请选择开始时间'
  return dayjs(form.value.startTime).format('YYYY-MM-DD HH:mm')
})

const formattedEndTime = computed(() => {
  if (!form.value.endTime)
    return '请选择结束时间'
  return dayjs(form.value.endTime).format('YYYY-MM-DD HH:mm')
})

// 格式化位置显示
const formattedLocation = computed(() => {
  if (!form.value.location)
    return '请选择活动地点'
  if (typeof form.value.location === 'string') {
    try {
      const obj = JSON.parse(form.value.location)
      return obj.address || obj.name || '未知地点'
    }
    catch {
      return form.value.location
    }
  }
  if (typeof form.value.location === 'object') {
    return form.value.location.address || form.value.location.name || '未知地点'
  }
  return String(form.value.location)
})

// 图片上传
const { loading: uploadLoading, upload: uploadImage } = useUpload({
  fileType: 'image',
  success: (res) => {
    form.value.coverUrl = res.url
    uni.showToast({ title: '上传成功', icon: 'success' })
  },
  error: (err) => {
    console.error('Upload failed:', err)
    uni.showToast({ title: '上传失败', icon: 'none' })
  },
})

// 处理裁剪后的图片上传
function handleCroppedImage(filePath: string) {
  console.log('filePath:', filePath)
  uploadImage(filePath)
}

// 跳转到裁剪页面
function navigateToCropper() {
  // 活动封面使用 16:9 比例
  const aspectRatio = '16:9'
  uni.navigateTo({
    url: `/pages/tools/img-cropper?aspect-ratio=${aspectRatio}`,
  })
}

// 选择地图位置
function chooseLocation() {
  uni.chooseLocation({
    success: (res) => {
      form.value.location = {
        name: res.name,
        address: res.address,
        latitude: res.latitude,
        longitude: res.longitude,
      }
    },
    fail: (err) => {
      // 用户取消选择时不提示错误
      if (err.errMsg && err.errMsg.includes('cancel')) {
        return
      }
      console.error('选择位置失败:', err)
      uni.showToast({ title: '选择位置失败', icon: 'none' })
    },
  })
}

onLoad((options) => {
  // 监听全局裁剪完成事件
  uni.$on('imgCropperConfirm', (data: { url: string }) => {
    console.log('imgCropperConfirm', data)
    handleCroppedImage(data.url)
  })

  if (options && options.id) {
    activityId.value = options.id
    initPage()
  }
  else {
    uni.showToast({ title: '参数错误', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
})

async function initPage() {
  loading.value = true
  try {
    // 1. 检查权限
    const hasPermission = await checkPermission()
    if (!hasPermission)
      return

    // 2. 加载活动详情
    const res = await getActivityDetailAPI(activityId.value, false)
    activity.value = res

    // 3. 初始化表单
    form.value = {
      title: res.title || '',
      coverUrl: res.coverUrl || '',
      summary: res.summary || '',
      content: res.content || '',
      startTime: res.startTime || '',
      endTime: res.endTime || '',
      location: res.location,
    }
  }
  catch (e) {
    console.error(e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

async function checkPermission(): Promise<boolean> {
  // 1. 检查全局管理员
  if (userStore.isAdmin)
    return true

  // 2. 检查活动成员角色
  try {
    const membersRes = await getActivityMembersAPI(activityId.value)
    const myMember = membersRes.find(m => m.userId === userStore.userInfo.userId)

    if (myMember?.role !== 'ADMIN') {
      uni.showToast({ title: '无权限编辑', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1500)
      return false
    }
    return true
  }
  catch (e) {
    uni.showToast({ title: '权限检查失败', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return false
  }
}

function validateForm(): boolean {
  if (!form.value.title.trim()) {
    uni.showToast({ title: '请输入活动标题', icon: 'none' })
    return false
  }
  if (!form.value.startTime) {
    uni.showToast({ title: '请选择开始时间', icon: 'none' })
    return false
  }
  if (!form.value.endTime) {
    uni.showToast({ title: '请选择结束时间', icon: 'none' })
    return false
  }
  if (dayjs(form.value.startTime).isAfter(form.value.endTime)) {
    uni.showToast({ title: '开始时间不能晚于结束时间', icon: 'none' })
    return false
  }
  return true
}

async function handleSave() {
  if (!validateForm())
    return

  saving.value = true
  try {
    await updateActivityAPI(activityId.value, {
      title: form.value.title,
      coverUrl: form.value.coverUrl,
      summary: form.value.summary,
      content: form.value.content,
      startTime: form.value.startTime,
      endTime: form.value.endTime,
      location: form.value.location,
    })
    uni.showToast({ title: '保存成功', icon: 'success' })
    // 通知上一页刷新
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2] as any
    if (prevPage && prevPage.$vm && prevPage.$vm.loadData) {
      prevPage.$vm.loadData()
    }
    setTimeout(() => uni.navigateBack(), 1500)
  }
  catch (e) {
    console.error(e)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
  finally {
    saving.value = false
  }
}

function confirmStartTime() {
  form.value.startTime = dayjs(tempStartTime.value).toISOString()
  showStartTimePicker.value = false
}

function confirmEndTime() {
  form.value.endTime = dayjs(tempEndTime.value).toISOString()
  showEndTimePicker.value = false
}

function openStartTimePicker() {
  tempStartTime.value = new Date(form.value.startTime).getTime()
  showStartTimePicker.value = true
}

function openEndTimePicker() {
  tempEndTime.value = new Date(form.value.endTime).getTime()
  showEndTimePicker.value = true
}
</script>

<template>
  <view class="min-h-screen bg-[#f7f7f7] pb-24">
    <!-- 加载状态 -->
    <view v-if="loading" class="flex justify-center py-20">
      <wd-loading />
    </view>

    <!-- 编辑表单 -->
    <view v-else-if="activity" class="p-4 space-y-4">
      <!-- 标题 -->
      <view class="rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-2 text-sm text-gray-700 font-medium">
          活动标题 <text class="text-red-500">*</text>
        </view>
        <wd-input
          v-model="form.title"
          placeholder="请输入活动标题"
          :maxlength="100"
        />
      </view>

      <!-- 封面图片 -->
      <view class="rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-2 text-sm text-gray-700 font-medium">
          封面图片
        </view>
        <!-- 图片预览区域 -->
        <view
          class="relative h-40 w-full overflow-hidden rounded-lg bg-gray-100"
          @click="navigateToCropper"
        >
          <image
            v-if="form.coverUrl"
            :src="form.coverUrl"
            class="h-full w-full object-cover"
            mode="aspectFill"
          />
          <view v-else class="h-full flex flex-col items-center justify-center text-gray-400">
            <view class="i-carbon-add text-3xl" />
            <text class="mt-2 text-sm">点击上传封面图片</text>
          </view>
          <!-- 上传中遮罩 -->
          <view v-if="uploadLoading" class="absolute inset-0 flex items-center justify-center bg-black/50">
            <wd-loading />
          </view>
          <!-- 更换图片按钮 -->
          <view v-if="form.coverUrl && !uploadLoading" class="absolute bottom-2 right-2">
            <view class="rounded-full bg-black/50 px-3 py-1 text-xs text-white">
              更换图片
            </view>
          </view>
        </view>
      </view>

      <!-- 活动时间 -->
      <view class="rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-3 text-sm text-gray-700 font-medium">
          活动时间 <text class="text-red-500">*</text>
        </view>
        <view class="space-y-3">
          <view class="flex items-center justify-between border border-gray-200 rounded-lg bg-gray-50 px-3 py-3" @click="openStartTimePicker">
            <text class="text-sm text-gray-600">开始时间</text>
            <view class="flex items-center">
              <text class="text-sm" :class="form.startTime ? 'text-gray-900' : 'text-gray-400'">
                {{ formattedStartTime }}
              </text>
              <view class="i-carbon-chevron-right ml-2 text-gray-400" />
            </view>
          </view>
          <view class="flex items-center justify-between border border-gray-200 rounded-lg bg-gray-50 px-3 py-3" @click="openEndTimePicker">
            <text class="text-sm text-gray-600">结束时间</text>
            <view class="flex items-center">
              <text class="text-sm" :class="form.endTime ? 'text-gray-900' : 'text-gray-400'">
                {{ formattedEndTime }}
              </text>
              <view class="i-carbon-chevron-right ml-2 text-gray-400" />
            </view>
          </view>
        </view>
      </view>

      <!-- 活动地点 -->
      <view class="rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-3 text-sm text-gray-700 font-medium">
          活动地点
        </view>
        <view class="flex items-center justify-between border border-gray-200 rounded-lg bg-gray-50 px-3 py-3" @click="chooseLocation">
          <text class="text-sm" :class="form.location ? 'text-gray-900' : 'text-gray-400'">
            {{ formattedLocation }}
          </text>
          <view class="i-carbon-chevron-right ml-2 text-gray-400" />
        </view>
      </view>

      <!-- 活动摘要 -->
      <view class="rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-2 text-sm text-gray-700 font-medium">
          活动摘要
        </view>
        <wd-textarea
          v-model="form.summary"
          placeholder="请输入活动摘要（选填）"
          :maxlength="500"
          show-count
        />
      </view>

      <!-- 活动内容 -->
      <!-- <view class="rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-2 text-sm text-gray-700 font-medium">
          活动内容
        </view>
        <wd-textarea
          v-model="form.content"
          placeholder="请输入活动内容（支持HTML）"
          :maxlength="5000"
          show-count
          :rows="6"
        />
      </view> -->

      <!-- 底部占位 -->
      <view class="h-8" />
    </view>

    <!-- 保存按钮 -->
    <view class="fixed bottom-4 left-0 right-0 border-t border-gray-200 bg-white p-4 pb-safe">
      <wd-button
        type="primary"
        block
        :loading="saving"
        @click="handleSave"
      >
        保存修改
      </wd-button>
    </view>

    <!-- 开始时间选择器 Popup -->
    <wd-popup v-model="showStartTimePicker" position="bottom" :safe-area-inset-bottom="true">
      <view class="bg-white">
        <view class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <text class="text-sm text-gray-500" @click="showStartTimePicker = false">取消</text>
          <text class="text-base font-medium">选择开始时间</text>
          <text class="text-sm text-[#a33327] font-medium" @click="confirmStartTime">确定</text>
        </view>
        <wd-datetime-picker-view
          v-model="tempStartTime"
          type="datetime"
        />
      </view>
    </wd-popup>

    <!-- 结束时间选择器 Popup -->
    <wd-popup v-model="showEndTimePicker" position="bottom" :safe-area-inset-bottom="true">
      <view class="bg-white">
        <view class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <text class="text-sm text-gray-500" @click="showEndTimePicker = false">取消</text>
          <text class="text-base font-medium">选择结束时间</text>
          <text class="text-sm text-[#a33327] font-medium" @click="confirmEndTime">确定</text>
        </view>
        <wd-datetime-picker-view
          v-model="tempEndTime"
          type="datetime"
        />
      </view>
    </wd-popup>
  </view>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
