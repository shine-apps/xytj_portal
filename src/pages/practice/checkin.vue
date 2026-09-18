<script setup lang="ts">
import type { MediaItem } from '@/components/MediaUploader.vue'
import type { BadgeLevel, CheckInPayload, CheckInResponse, PracticeChallenge, PracticeCheckIn, PracticeLocation, PracticeTypeItem } from '@/service/practice'
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import MediaUploader from '@/components/MediaUploader.vue'
import { getChallengesAPI, getCheckInByDateAPI, getPracticeTypesAPI, submitCheckInAPI } from '@/service/practice'
import { useSettingsStore } from '@/store/settings'
import { useUserStore } from '@/store/user'
import { uploadToCos } from '@/utils/cos'
import { shanghaiToday } from '@/utils/dateUtil'
import { enqueueOfflineCheckIn } from '@/utils/practice-offline'
import { toLoginPage } from '@/utils/toLoginPage'

definePage({
  style: {
    navigationBarTitleText: '快速打卡',
  },
})

/** 时长快捷选项（分钟） */
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]
/** 上次选择的记忆键 */
const LAST_TYPE_KEY = 'practice_last_type'
const LAST_DURATION_KEY = 'practice_last_duration'
const LAST_CHALLENGES_KEY = 'practice_last_challenges'

/** 勋章等级 → 文案（与后端 badges.get.ts 的勋章名保持一致） */
const BADGE_LABELS: Record<BadgeLevel, string> = {
  BRONZE: '铜牌',
  SILVER: '银牌',
  GOLD: '金牌',
}

const userStore = useUserStore()
const settingsStore = useSettingsStore()

/** 编辑模式：回填今日已有打卡；新建模式：记忆上次选择 */
const isEdit = ref(false)
/** 编辑模式拉取当日记录期间展示加载态 */
const pageLoading = ref(false)
const todayStr = ref(shanghaiToday())

const practiceType = ref<string[]>([])
const typeOptions = ref<PracticeTypeItem[]>([])
/** 可勾选的挑战（本人已参加且进行中，已排除总打卡挑战） */
const challengeOptions = ref<PracticeChallenge[]>([])
/** 本次打卡勾选的普通挑战 ID（总打卡挑战由后端自动追加，不在此列） */
const selectedChallengeIds = ref<string[]>([])
const durationMinutes = ref(30)
const customDuration = ref('')
const notes = ref('')
const mediaItems = ref<MediaItem[]>([])
const location = ref<PracticeLocation | null>(null)
const submitting = ref(false)
const uploadHint = ref('')

onLoad((options) => {
  if (!userStore.hasValidLogin) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    toLoginPage()
    return
  }
  const editMode = options?.edit === '1' || options?.edit === 'true'
  initPage(editMode)
})

/** 页面初始化：加载类型/挑战选项；编辑模式拉取当日打卡回填 */
async function initPage(editMode: boolean) {
  if (editMode) {
    isEdit.value = true
    pageLoading.value = true
    uni.setNavigationBarTitle({ title: '修改今日打卡' })
  }

  // 编辑记录 404（当日无打卡）时降级为新建模式
  let record: PracticeCheckIn | null = null
  if (editMode) {
    try {
      record = await getCheckInByDateAPI(todayStr.value)
    }
    catch (e) {
      console.error('获取当日打卡失败', e)
      isEdit.value = false
      uni.setNavigationBarTitle({ title: '快速打卡' })
      uni.showToast({ title: '今日暂无打卡，已切换为新建', icon: 'none' })
    }
    finally {
      pageLoading.value = false
    }
  }

  try {
    typeOptions.value = await getPracticeTypesAPI()
  }
  catch (e) {
    console.error('加载练拳类型失败', e)
    toast('练拳类型加载失败')
  }
  await loadChallengeOptions()
  initForm(record)
}

/** 初始化表单：编辑模式回填当日数据，新建模式记忆上次选择 */
function initForm(editData: PracticeCheckIn | null) {
  if (editData) {
    practiceType.value = editData.practiceType
    durationMinutes.value = editData.durationMinutes
    customDuration.value = ''
    notes.value = editData.notes ?? ''
    mediaItems.value = (editData.medias ?? []).map(m => ({
      type: m.type,
      remoteUrl: m.url,
      size: m.size ?? undefined,
      mimeType: m.mimeType ?? undefined,
    }))
    location.value = editData.location ? { ...editData.location } : null
    // 回填已计入的挑战（排除总打卡挑战，它由后端隐式维护）
    selectedChallengeIds.value = (editData.challengeIds ?? []).filter(
      id => id !== settingsStore.globalChallengeId,
    )
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
    const lastChallenges = uni.getStorageSync(LAST_CHALLENGES_KEY) as string[]
    selectedChallengeIds.value = Array.isArray(lastChallenges) ? lastChallenges : []
  }
  // 过滤掉已失效（退出/结束）的勾选项
  normalizeSelectedChallenges()
  submitting.value = false
  uploadHint.value = ''
}

/** 保证已选挑战仍存在于可选列表且不含总打卡挑战 */
function normalizeSelectedChallenges() {
  const globalId = settingsStore.globalChallengeId
  const validIds = new Set(challengeOptions.value.map(c => c.id))
  selectedChallengeIds.value = selectedChallengeIds.value.filter(
    id => id !== globalId && validIds.has(id),
  )
}

/** 切换挑战选中状态 */
function toggleChallenge(id: string) {
  const idx = selectedChallengeIds.value.indexOf(id)
  if (idx >= 0) {
    selectedChallengeIds.value.splice(idx, 1)
  }
  else {
    selectedChallengeIds.value.push(id)
  }
}

/** 加载本人已加入且进行中的挑战（总打卡挑战不展示，后端自动计入） */
async function loadChallengeOptions() {
  try {
    await settingsStore.fetchSettings()
    const res = await getChallengesAPI({ status: 'ongoing', pageSize: 50, joined: true })
    const globalId = settingsStore.globalChallengeId
    challengeOptions.value = res.challenges.filter(
      c => !c.isGlobal && c.id !== globalId,
    )
    normalizeSelectedChallenges()
  }
  catch (e) {
    console.error('加载可参加挑战失败', e)
  }
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

// ==================== 提交与返回 ====================

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
    challengeIds: [...selectedChallengeIds.value],
  }
}

/** 返回上一级页面；页面栈为空（如分享链路直接进入）时回到打卡主页 */
function navigateBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack()
  }
  else {
    uni.reLaunch({ url: '/pages/practice/index' })
  }
}

/**
 * 提交完成后的提示与返回：
 * - 在线成功：积分 toast；若获得新勋章先弹勋章框，确认后返回
 * - 离线路径（res 为 null）：提示已暂存后延迟返回，上一页 onShow 会自动刷新
 */
function finishSubmitted(res: CheckInResponse | null) {
  if (!res) {
    setTimeout(navigateBack, 700)
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
        complete: navigateBack,
      })
    }, 800)
  }
  else {
    setTimeout(navigateBack, 600)
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
      // 入队需带上打卡日期（上海日历日，与服务端口径一致），联网后按日期补录（服务端按日期幂等 upsert）
      payload.checkInDate = shanghaiToday()
      enqueueOfflineCheckIn(payload)
      uni.showToast({ title: '已保存，联网后自动同步', icon: 'none' })
      finishSubmitted(null)
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
      uni.setStorageSync(LAST_CHALLENGES_KEY, selectedChallengeIds.value)
      finishSubmitted(res)
    }
    catch (e: any) {
      if (typeof e?.statusCode !== 'number') {
        // 提交途中断网：转入离线队列（日期按上海日历日，与在线打卡口径一致）
        payload.checkInDate = shanghaiToday()
        enqueueOfflineCheckIn(payload)
        uni.showToast({ title: '已保存，联网后自动同步', icon: 'none' })
        finishSubmitted(null)
      }
      // 服务端校验错误：http 层已提示，停留页面供用户修改
    }
  }
  finally {
    submitting.value = false
    uploadHint.value = ''
  }
}
</script>

<template>
  <view
    class="min-h-screen bg-[#f7f7f7] pb-28 font-serif"
    style="font-family: 'KaiTi', 'STKaiti', 'serif'"
  >
    <!-- 编辑模式数据加载中 -->
    <view v-if="pageLoading" class="flex flex-col items-center justify-center py-32">
      <wd-loading color="#a33327" />
      <text class="mt-3 text-sm text-[#888]">正在载入今日打卡…</text>
    </view>

    <template v-else>
      <!-- 提示信息 -->
      <view class="mx-4 mt-4 flex items-start gap-2 border border-[#e8d9c8] rounded-lg bg-[#fdf6ec] px-4 py-3">
        <text class="i-carbon-information-filled mt-0.5 shrink-0 text-sm text-[#a33327]" />
        <text v-if="isEdit" class="flex-1 text-xs text-[#8a6d3b] leading-relaxed">
          正在修改 {{ todayStr }} 的打卡，保存后积分与挑战榜单将同步更新。
        </text>
        <text v-else class="flex-1 text-xs text-[#8a6d3b] leading-relaxed">
          每日仅可打卡一次，重复提交将更新当日记录；无网络时打卡将自动暂存，联网后同步。
        </text>
      </view>

      <!-- 练拳类型 / 参与挑战 -->
      <view class="mx-4 mt-4 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
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

        <!-- 参与挑战（总打卡挑战由系统自动计入，不在此展示） -->
        <view v-if="challengeOptions.length">
          <text class="mb-2 block text-sm text-[#555] font-medium">参与挑战（可多选）</text>
          <view class="flex flex-wrap gap-2">
            <view
              v-for="ch in challengeOptions"
              :key="ch.id"
              class="max-w-full rounded-md border-solid px-3 py-2 text-sm transition-colors"
              :class="selectedChallengeIds.includes(ch.id)
                ? 'bg-[#3d5a66] border-[#3d5a66] text-white font-medium'
                : 'bg-[#fffdf9] border-[#e8e4dc] text-[#555]'"
              @click="toggleChallenge(ch.id)"
            >
              <text class="i-carbon-trophy mr-1" />{{ ch.title }}
            </view>
          </view>
        </view>
      </view>

      <!-- 时长 -->
      <view class="mx-4 mt-4 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
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
        <view class="mt-3 flex items-center gap-2">
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
      <view class="mx-4 mt-4 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
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

      <!-- 媒体 / 位置 -->
      <view class="mx-4 mt-4 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
        <!-- 媒体 -->
        <view v-if="settingsStore.showVideo" class="mb-5">
          <MediaUploader v-model="mediaItems" :disabled="submitting" />
        </view>

        <!-- 位置 -->
        <view>
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
      </view>

      <!-- 底部装饰 -->
      <view class="flex justify-center py-6 opacity-30">
        <text class="text-xs text-[#888] tracking-[0.5em]">—— 持之以恒 · 日有所成 ——</text>
      </view>
    </template>

    <!-- 底部固定提交栏 -->
    <view
      class="fixed bottom-0 left-0 right-0 z-40 border-t border-[#eee9df] bg-[#fffdf9]/95 px-4 pt-3"
      style="padding-bottom: calc(12px + env(safe-area-inset-bottom))"
    >
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
</template>
