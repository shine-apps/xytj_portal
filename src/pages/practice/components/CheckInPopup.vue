<script setup lang="ts">
import type { MediaItem } from '@/components/MediaUploader.vue'
import type { CheckInPayload, CheckInResponse, PracticeCheckIn, PracticeLocation, PracticeTypeItem } from '@/service/practice'
import dayjs from 'dayjs'
import { computed, onMounted, ref, watch } from 'vue'
import MediaUploader from '@/components/MediaUploader.vue'
import { getPracticeTypesAPI, submitCheckInAPI } from '@/service/practice'
import { useSettingsStore } from '@/store/settings'
import { uploadToCos } from '@/utils/cos'
import { enqueueOfflineCheckIn } from '@/utils/practice-offline'

const props = withDefaults(defineProps<{
  visible: boolean
  /** 今日已有打卡时传入，弹层变为「编辑当日」模式并回填 */
  editData?: PracticeCheckIn | null
}>(), {
  editData: null,
})

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  /** res 为 null 表示走了离线队列（联网后自动同步） */
  (e: 'submitted', res: CheckInResponse | null): void
}>()

/** 时长快捷选项（分钟） */
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]
/** 上次选择的记忆键 */
const LAST_TYPE_KEY = 'practice_last_type'
const LAST_DURATION_KEY = 'practice_last_duration'

const practiceType = ref<string[]>([])
const typeOptions = ref<PracticeTypeItem[]>([])
const durationMinutes = ref(30)
const customDuration = ref('')
const notes = ref('')
const mediaItems = ref<MediaItem[]>([])
const location = ref<PracticeLocation | null>(null)
const submitting = ref(false)
const uploadHint = ref('')
const settingsStore = useSettingsStore()

const isEdit = computed(() => !!props.editData)

/** 打开弹层时初始化表单：编辑模式回填当日数据，新建模式记忆上次选择 */
function initForm() {
  if (props.editData) {
    practiceType.value = props.editData.practiceType
    durationMinutes.value = props.editData.durationMinutes
    customDuration.value = ''
    notes.value = props.editData.notes ?? ''
    mediaItems.value = (props.editData.medias ?? []).map(m => ({
      type: m.type,
      remoteUrl: m.url,
      size: m.size ?? undefined,
      mimeType: m.mimeType ?? undefined,
    }))
    location.value = props.editData.location ? { ...props.editData.location } : null
  }
  else {
    const lastType = uni.getStorageSync(LAST_TYPE_KEY) as string[]
    practiceType.value = Array.isArray(lastType) && lastType.length ? lastType : []
    ensureValidType()
    const lastDuration = Number(uni.getStorageSync(LAST_DURATION_KEY))
    durationMinutes.value = Number.isFinite(lastDuration) && lastDuration >= 1 && lastDuration <= 600
      ? lastDuration
      : 30
    customDuration.value = ''
    notes.value = ''
    mediaItems.value = []
    location.value = null
  }
  submitting.value = false
  uploadHint.value = ''
}

/** 若当前未选择或上次选择已不在类型列表中，则默认选中第一项（仅新建模式） */
function ensureValidType() {
  if (isEdit.value)
    return
  if (!typeOptions.value.length)
    return
  const names = typeOptions.value.map(o => o.name)
  // 过滤掉已不存在的类型
  practiceType.value = practiceType.value.filter(t => names.includes(t))
  if (practiceType.value.length === 0) {
    practiceType.value = [typeOptions.value[0].name]
  }
}

/** 切换练拳类型选中状态（多选） */
function toggleType(name: string) {
  const idx = practiceType.value.indexOf(name)
  if (idx >= 0) {
    practiceType.value.splice(idx, 1)
  }
  else {
    practiceType.value.push(name)
  }
}

watch(() => props.visible, (val) => {
  if (val) {
    initForm()
  }
})

onMounted(async () => {
  try {
    typeOptions.value = await getPracticeTypesAPI()
  }
  catch (e) {
    console.error('加载练拳类型失败', e)
    toast('练拳类型加载失败')
  }
  ensureValidType()
})

function close() {
  emit('update:visible', false)
}

function toast(title: string) {
  uni.showToast({ title, icon: 'none' })
}

function isDurationActive(d: number) {
  return !customDuration.value && durationMinutes.value === d
}

function chooseDuration(d: number) {
  customDuration.value = ''
  durationMinutes.value = d
}

// ==================== 位置 ====================

/**
 * 调起地图选点，用户确认后保存经纬度 + 地址文本。
 * 用 uni.chooseLocation 直接拿到可读的 address，避免只展示经纬度数字。
 */
function chooseLocation() {
  uni.chooseLocation({
    success: (res) => {
      location.value = {
        latitude: res.latitude,
        longitude: res.longitude,
        address: res.address || res.name || '',
      }
    },
    fail: (err) => {
      // 用户取消选择时不提示
      if (err?.errMsg && err.errMsg.includes('cancel')) {
        return
      }
      toast('获取位置失败，请检查定位权限')
    },
  })
}

/** 清除已选位置 */
function clearLocation() {
  location.value = null
}

// ==================== 提交 ====================

function buildPayload(duration: number): CheckInPayload {
  return {
    practiceType: practiceType.value,
    durationMinutes: duration,
    notes: notes.value.trim() || undefined,
    location: location.value
      ? { latitude: location.value.latitude, longitude: location.value.longitude, address: location.value.address }
      : undefined,
    medias: mediaItems.value
      .filter(m => m.remoteUrl)
      .map(m => ({ type: m.type, url: m.remoteUrl!, size: m.size, mimeType: m.mimeType })),
  }
}

async function handleSubmit() {
  if (submitting.value) {
    return
  }
  const duration = customDuration.value ? Number(customDuration.value) : durationMinutes.value
  if (!practiceType.value.length) {
    toast('请至少选择一种练拳类型')
    return
  }
  if (!Number.isInteger(duration) || duration < 1 || duration > 600) {
    toast('请填写 1~600 分钟的时长')
    return
  }
  if (notes.value.length > 500) {
    toast('心得笔记不能超过 500 字')
    return
  }

  submitting.value = true
  try {
    const locals = mediaItems.value.filter(m => !m.remoteUrl)
    const net = await uni.getNetworkType()
    const offline = net.networkType === 'none'

    // 完全离线：无法上传媒体，无本地待传媒体时直接入离线队列
    if (offline) {
      if (locals.length > 0) {
        toast('当前无网络，无法上传照片/视频')
        return
      }
      const payload = buildPayload(duration)
      // 入队需带上打卡日期，联网后按日期补录（服务端按日期幂等 upsert）
      payload.checkInDate = dayjs().format('YYYY-MM-DD')
      enqueueOfflineCheckIn(payload)
      uni.showToast({ title: '已保存，联网后自动同步', icon: 'none' })
      emit('submitted', null)
      close()
      return
    }

    // 逐个上传本地媒体（uploadToCos 内部走 cos-auth STS 临时凭证流程）
    for (let i = 0; i < locals.length; i++) {
      const item = locals[i]
      uploadHint.value = `正在上传媒体 ${i + 1}/${locals.length}…`
      item.uploading = true
      try {
        const result = await uploadToCos(item.localPath!)
        item.remoteUrl = result.url
      }
      catch (e) {
        console.error('媒体上传失败', e)
        toast('媒体上传失败，请重试')
        return
      }
      finally {
        item.uploading = false
      }
    }
    uploadHint.value = ''

    const payload = buildPayload(duration)
    try {
      const res = await submitCheckInAPI(payload)
      // 记忆上次选择
      uni.setStorageSync(LAST_TYPE_KEY, practiceType.value)
      uni.setStorageSync(LAST_DURATION_KEY, duration)
      emit('submitted', res)
      close()
    }
    catch (e: any) {
      if (typeof e?.statusCode !== 'number') {
        // 提交途中断网：转入离线队列
        payload.checkInDate = dayjs().format('YYYY-MM-DD')
        enqueueOfflineCheckIn(payload)
        uni.showToast({ title: '已保存，联网后自动同步', icon: 'none' })
        emit('submitted', null)
        close()
      }
      // 服务端校验错误：http 层已提示，停留弹层供用户修改
    }
  }
  finally {
    submitting.value = false
    uploadHint.value = ''
  }
}
</script>

<template>
  <wd-popup
    :model-value="visible"
    position="bottom"
    custom-style="height: 85vh; border-radius: 16px 16px 0 0; z-index: 1100;"
    @close="close"
  >
    <view class="h-full w-full flex flex-col">
      <!-- 标题栏 -->
      <view class="flex items-center justify-between border-b border-[#eee9df] px-4 py-3">
        <text class="text-lg text-[#1a1a1a] font-bold">{{ isEdit ? '修改今日打卡' : '快速打卡' }}</text>
        <wd-button type="icon" icon="close" size="small" @click="close" />
      </view>

      <scroll-view scroll-y :scroll-x="false" class="box-border flex-1 overflow-x-hidden px-4 py-4">
        <!-- 练拳类型 -->
        <view class="mb-5">
          <text class="mb-2 block text-sm text-[#555] font-medium">练拳类型（可多选）</text>
          <view class="flex flex-wrap gap-2">
            <view
              v-for="opt in typeOptions"
              :key="opt.id"
              class="rounded-md border-solid p-2 text-center text-sm transition-colors"
              :class="practiceType.includes(opt.name)
                ? 'bg-[#a33327] border-[#a33327] text-white font-medium'
                : 'bg-[#fffdf9] border-[#e8e4dc] text-[#555]'"
              @click="toggleType(opt.name)"
            >
              {{ opt.name }}
            </view>
          </view>
        </view>

        <!-- 时长 -->
        <view class="mb-5">
          <text class="mb-2 block text-sm text-[#555] font-medium">练习时长（分钟）</text>
          <view class="flex flex-wrap gap-2">
            <view
              v-for="d in DURATION_OPTIONS"
              :key="d"
              class="min-w-12 rounded-full border-solid px-3 py-1.5 text-center text-sm transition-colors"
              :class="isDurationActive(d)
                ? 'bg-[#a33327] border-[#a33327] text-white font-medium'
                : 'bg-[#fffdf9] border-[#e8e4dc] text-[#555]'"
              @click="chooseDuration(d)"
            >
              {{ d }}
            </view>
          </view>
          <view class="mt-2 flex items-center gap-2">
            <text class="text-sm text-[#555]">自定义</text>
            <input
              v-model="customDuration"
              type="number"
              class="w-24 border border-[#e8e4dc] rounded-md bg-[#faf8f3] px-2 py-1.5 text-center text-sm text-[#1a1a1a]"
              placeholder="1~600"
            >
            <text class="text-sm text-[#555]">分钟</text>
          </view>
        </view>

        <!-- 心得笔记 -->
        <view class="mb-5">
          <text class="mb-2 block text-sm text-[#555] font-medium">心得笔记（选填）</text>
          <textarea
            v-model="notes"
            class="w-full border border-[#e8e4dc] rounded-md bg-[#faf8f3] p-3 text-sm text-[#1a1a1a]"
            style="min-height: 100px"
            placeholder="记录今天的练拳心得..."
            :maxlength="500"
          />
          <text class="mt-1 block text-right text-2xs text-[#999]">{{ notes.length }}/500</text>
        </view>

        <!-- 媒体 -->
        <view v-if="settingsStore.showVideo" class="mb-5">
          <MediaUploader v-model="mediaItems" :disabled="submitting" />
        </view>

        <!-- 位置 -->
        <view class="mb-2">
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-1">
              <text class="i-carbon-location text-sm text-[#a33327]" />
              <text class="text-sm text-[#555]">记录位置（选填）</text>
            </view>
            <view
              class="flex items-center gap-1 border border-[#e8e4dc] rounded-full bg-[#fffdf9] px-2.5 py-1 active:opacity-70"
              @click="chooseLocation()"
            >
              <text class="i-carbon-map text-xs text-[#a33327]" />
              <text class="text-xs text-[#a33327]">{{ location?.address ? '更换' : '选择' }}</text>
            </view>
          </view>
          <view
            v-if="location?.address"
            class="mt-1 flex items-center gap-1 active:opacity-60"
            @click="chooseLocation()"
          >
            <text class="text-2xs text-[#999]">{{ location.address }}</text>
            <text
              v-if="location"
              class="i-carbon-close text-2xs text-[#bbb]"
              @click.stop="clearLocation()"
            />
          </view>
        </view>
      </scroll-view>

      <!-- 底部提交 -->
      <view class="border-t border-[#eee9df] px-4 py-3" style="padding-bottom: calc(12px + env(safe-area-inset-bottom))">
        <wd-button
          block
          :loading="submitting"
          custom-style="background-color: #a33327; border-color: #a33327;"
          @click="handleSubmit"
        >
          {{ submitting ? (uploadHint || '提交中…') : (isEdit ? '保存修改' : '提交打卡') }}
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>
