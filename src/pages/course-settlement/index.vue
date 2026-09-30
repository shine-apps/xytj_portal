<script lang="ts" setup>
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

definePage({
  style: {
    navigationBarTitleText: '课程分账计算器',
  },
})

// ----------------------- 固定分成规则（不可修改） -----------------------
// 老师方渠道（老师及助教招来的学员）：老师方 60%，接待方 40%
const TEACHER_SHARE_OWN = 0.6
// 接待方渠道（接待方招来的学员）：老师方 35%，接待方 65%
const TEACHER_SHARE_VENUE = 0.35
// 老师方保底课酬（元/期），不足部分由接待方补足
const GUARANTEE = 3000
// 最低开班人数（仅提醒）
const MIN_STUDENTS = 15

const FEE_PRESETS = [598, 648, 698]
const PACKAGE_PRESETS = [
  { label: '度假酒店', desc: '2天2晚 · 5餐 · 茶歇物料', value: 320 },
]

// ----------------------- 可输入项 -----------------------
const fee = ref(648)
const packageCost = ref(320)
const nTeacher = ref(13)
const nVenue = ref(12)

function selectPackage(value: number) {
  packageCost.value = value
}

function resetAll() {
  fee.value = 648
  packageCost.value = 320
  nTeacher.value = 13
  nVenue.value = 12
}

// ----------------------- 工具函数 -----------------------
function num(v: number | string): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function groupThousands(n: number): string {
  const sign = n < 0 ? '-' : ''
  const intPart = Math.abs(Math.round(n)).toString()
  return sign + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function yuan(n: number): string {
  return `¥${groupThousands(n)}`
}

// ----------------------- 分账计算 -----------------------
const feeVal = computed(() => num(fee.value))
const packageVal = computed(() => num(packageCost.value))
const nTeacherVal = computed(() => num(nTeacher.value))
const nVenueVal = computed(() => num(nVenue.value))

const totalStudents = computed(() => nTeacherVal.value + nVenueVal.value)
const totalRevenue = computed(() => totalStudents.value * feeVal.value)
const totalPackage = computed(() => totalStudents.value * packageVal.value)
const netPerStudent = computed(() => feeVal.value - packageVal.value)
const totalNet = computed(() => totalRevenue.value - totalPackage.value)

// 老师方渠道
const ownNet = computed(() => nTeacherVal.value * netPerStudent.value)
const ownTeacherSplit = computed(() => Math.round(ownNet.value * TEACHER_SHARE_OWN))
const ownVenueSplit = computed(() => ownNet.value - ownTeacherSplit.value)

// 接待方渠道
const venueChanNet = computed(() => nVenueVal.value * netPerStudent.value)
const venueChanTeacherSplit = computed(() =>
  Math.round(venueChanNet.value * TEACHER_SHARE_VENUE),
)
const venueChanVenueSplit = computed(() => venueChanNet.value - venueChanTeacherSplit.value)

// 老师方（保底前 → 保底补足）
const teacherPreGuarantee = computed(
  () => ownTeacherSplit.value + venueChanTeacherSplit.value,
)
const guaranteeTopup = computed(() =>
  Math.max(0, GUARANTEE - teacherPreGuarantee.value),
)
const teacherFinal = computed(() => teacherPreGuarantee.value + guaranteeTopup.value)

// 接待方最终所得 = 总收入 - 老师方（含接待包、保底补差）
const venueFinal = computed(() => totalRevenue.value - teacherFinal.value)

// ----------------------- 分享（参数随链接传递，打开即还原同一笔账） -----------------------
const SHARE_PATH = '/pages/course-settlement/index'

function buildShareQuery(): string {
  return [
    `fee=${feeVal.value}`,
    `pkg=${packageVal.value}`,
    `t=${nTeacherVal.value}`,
    `v=${nVenueVal.value}`,
  ].join('&')
}

const shareTitle = computed(
  () =>
    `周末两天养生课分账 · 共${totalStudents.value}人：老师方${yuan(teacherFinal.value)}，接待方${yuan(venueFinal.value)}`,
)

onLoad((options) => {
  if (!options)
    return
  if (options.fee != null)
    fee.value = num(options.fee)
  if (options.pkg != null)
    packageCost.value = num(options.pkg)
  if (options.t != null)
    nTeacher.value = num(options.t)
  if (options.v != null)
    nVenue.value = num(options.v)
})

// 微信小程序：转发给好友 / 分享到朋友圈
onShareAppMessage(() => ({
  title: shareTitle.value,
  path: `${SHARE_PATH}?${buildShareQuery()}`,
}))

onShareTimeline(() => ({
  title: shareTitle.value,
  query: buildShareQuery(),
}))

// #ifdef H5
function buildH5ShareUrl(): string {
  if (import.meta.client && typeof window !== 'undefined') {
    return `${window.location.origin}${window.location.pathname}#${SHARE_PATH}?${buildShareQuery()}`
  }
  return `${SHARE_PATH}?${buildShareQuery()}`
}
// #endif

async function handleShare() {
  // #ifdef H5
  if (import.meta.client && typeof navigator !== 'undefined' && (navigator as any).share) {
    try {
      await (navigator as any).share({
        title: shareTitle.value,
        url: buildH5ShareUrl(),
      })
      return
    }
    catch {
      // 用户取消系统分享面板，不提示错误
      return
    }
  }
  // #endif
  // H5 不支持系统分享面板时，复制链接兜底
  // #ifdef H5
  uni.setClipboardData({
    data: buildH5ShareUrl(),
    success: () => {
      uni.showToast({ title: '链接已复制，可粘贴分享', icon: 'none' })
    },
  })
  // #endif
}

// ----------------------- 提醒 -----------------------
const warnings = computed<string[]>(() => {
  const list: string[] = []
  if (totalStudents.value === 0) {
    list.push('请输入各方招生人数')
  }
  else if (totalStudents.value < MIN_STUDENTS) {
    list.push(`当前 ${totalStudents.value} 人，低于 ${MIN_STUDENTS} 人最低开班人数，建议不成班或改期`)
  }
  if (netPerStudent.value <= 0) {
    list.push('接待包成本已达到或超过人均课费，没有可分配的净池，请检查输入')
  }
  if (guaranteeTopup.value > 0 && totalStudents.value > 0) {
    list.push(`老师方分成不足保底，接待方需补足保底差额 ${yuan(guaranteeTopup.value)}`)
  }
  return list
})
</script>

<template>
  <view class="min-h-screen bg-[#f6f4ef] pb-10">
    <!-- 顶部标题 -->
    <view class="px-4 pb-3 pt-5">
      <view class="text-[34rpx] text-[#2b2b2b] font-bold">
        课程分账计算器
      </view>
      <view class="mt-1 text-[24rpx] text-[#8c8578] leading-relaxed">
        老师方（老师及助教内部分配自行处理）与接待方（书院 / 度假酒店）按招生来源分账
      </view>
    </view>

    <!-- 提醒 -->
    <view v-for="(warning, i) in warnings" :key="i" class="mx-4 mb-2">
      <view class="flex items-start border border-[#e8d8b8] rounded-lg bg-[#fbf6ea] px-3 py-2">
        <text class="mr-2 text-[24rpx] text-[#b9892f] leading-6">⚠</text>
        <text class="flex-1 text-[24rpx] text-[#8a6d3b] leading-6">{{ warning }}</text>
      </view>
    </view>

    <!-- 输入：课费 -->
    <view class="mx-4 mt-2 rounded-xl bg-white p-4 shadow-sm">
      <view class="mb-3 flex items-center">
        <view class="mr-2 h-4 w-[6rpx] rounded bg-[#2b2b2b]" />
        <text class="text-[28rpx] text-[#2b2b2b] font-semibold">人均课费</text>
      </view>
      <view class="flex flex-wrap items-center gap-2">
        <view
          v-for="preset in FEE_PRESETS"
          :key="preset"
          class="rounded-full px-4 py-1.5 text-[26rpx]"
          :class="feeVal === preset
            ? 'bg-[#2b2b2b] text-white'
            : 'bg-[#f2efe8] text-[#5c5648]'"
          @click="fee = preset"
        >
          {{ preset }} 元
        </view>
        <view class="ml-auto flex items-center">
          <text class="mr-2 text-[24rpx] text-[#8c8578]">自定义</text>
          <wd-input-number
            v-model="fee"
            :min="0"
            :step="10"
          />
        </view>
      </view>
    </view>

    <!-- 输入：接待类型 -->
    <view class="mx-4 mt-3 rounded-xl bg-white p-4 shadow-sm">
      <view class="mb-3 flex items-center">
        <view class="mr-2 h-4 w-[6rpx] rounded bg-[#2b2b2b]" />
        <text class="text-[28rpx] text-[#2b2b2b] font-semibold">接待方式</text>
        <text class="ml-2 text-[22rpx] text-[#a8a094]">接待包归接待方，不参与分成</text>
      </view>
      <view class="mt-3 flex items-center justify-between border-t border-[#f2efe8] pt-3">
        <view>
          <view class="text-[27rpx] text-[#2b2b2b]">
            接待包人均成本
          </view>
          <view class="mt-[2rpx] text-[22rpx] text-[#a8a094]">
            默认 320 元/人，可按实际报价修改
          </view>
        </view>
        <wd-input-number v-model="packageCost" :min="0" :step="10" />
      </view>
      <view class="mt-3 rounded-lg bg-[#f7f5f0] px-3 py-2 text-[24rpx] text-[#6f685b]">
        人均可分净池：<text class="text-[#2b2b2b] font-semibold">{{ yuan(netPerStudent) }}</text>
        （课费 {{ yuan(feeVal) }} − 接待包 {{ yuan(packageVal) }}）
      </view>
    </view>

    <!-- 输入：招生人数 -->
    <view class="mx-4 mt-3 rounded-xl bg-white p-4 shadow-sm">
      <view class="mb-3 flex items-center justify-between">
        <view class="flex items-center">
          <view class="mr-2 h-4 w-[6rpx] rounded bg-[#2b2b2b]" />
          <text class="text-[28rpx] text-[#2b2b2b] font-semibold">招生人数</text>
        </view>
        <text class="text-[24rpx] text-[#8c8578]">
          共 {{ totalStudents }} 人
        </text>
      </view>
      <view class="flex items-center justify-between border-b border-[#f2efe8] pb-3">
        <view>
          <view class="text-[27rpx] text-[#2b2b2b]">
            老师方招生
          </view>
          <view class="mt-[2rpx] text-[22rpx] text-[#a8a094]">
            含老师本人及助教招来的学员
          </view>
        </view>
        <wd-input-number v-model="nTeacher" :min="0" />
      </view>
      <view class="flex items-center justify-between pt-3">
        <view>
          <view class="text-[27rpx] text-[#2b2b2b]">
            接待方招生
          </view>
          <view class="mt-[2rpx] text-[22rpx] text-[#a8a094]">
            书院 / 酒店自有渠道招来的学员
          </view>
        </view>
        <wd-input-number v-model="nVenue" :min="0" />
      </view>
    </view>

    <!-- 固定规则说明 -->
    <view class="mx-4 mt-3 border border-[#d8d2c4] rounded-xl border-dashed bg-[#faf8f3] p-4">
      <view class="mb-2 flex items-center">
        <text class="mr-2 text-[24rpx] text-[#a54a32]">❖</text>
        <text class="text-[26rpx] text-[#5c5648] font-semibold">固定分成规则</text>
      </view>
      <view class="text-[24rpx] text-[#7c7568] leading-6 space-y-1">
        <view>· 老师方渠道学员：净池老师方分 60%，接待方分 40%</view>
        <view>· 接待方渠道学员：净池老师方分 35%，接待方分 65%</view>
        <view>· 老师方保底课酬 {{ yuan(GUARANTEE) }}/期，不足由接待方补足</view>
        <view>· 最低开班 {{ MIN_STUDENTS }} 人；助教分配属老师方内部事务</view>
      </view>
    </view>

    <!-- 总览 -->
    <view class="grid grid-cols-2 mx-4 mt-4 gap-3">
      <view class="rounded-xl bg-white p-3 shadow-sm">
        <view class="text-[22rpx] text-[#a8a094]">
          总人数
        </view>
        <view class="mt-1 text-[34rpx] text-[#2b2b2b] font-bold">
          {{ totalStudents }} <text class="text-[22rpx] font-normal">人</text>
        </view>
      </view>
      <view class="rounded-xl bg-white p-3 shadow-sm">
        <view class="text-[22rpx] text-[#a8a094]">
          课费总收入
        </view>
        <view class="mt-1 text-[34rpx] text-[#2b2b2b] font-bold">
          {{ yuan(totalRevenue) }}
        </view>
      </view>
      <view class="rounded-xl bg-white p-3 shadow-sm">
        <view class="text-[22rpx] text-[#a8a094]">
          接待包（归接待方）
        </view>
        <view class="mt-1 text-[34rpx] text-[#2b2b2b] font-bold">
          {{ yuan(totalPackage) }}
        </view>
      </view>
      <view class="rounded-xl bg-[#2b2b2b] p-3 shadow-sm">
        <view class="text-[22rpx] text-[#b9b2a4]">
          可分净池
        </view>
        <view class="mt-1 text-[34rpx] text-white font-bold">
          {{ yuan(totalNet) }}
        </view>
      </view>
    </view>

    <!-- 分账结果 -->
    <view class="mx-4 mt-4">
      <view class="mb-2 flex items-center">
        <view class="mr-2 h-4 w-[6rpx] rounded bg-[#a54a32]" />
        <text class="text-[28rpx] text-[#2b2b2b] font-semibold">各方应得</text>
      </view>

      <!-- 老师方 -->
      <view class="border border-[#e4d9d4] rounded-xl bg-[#fbf5f3] p-4">
        <view class="flex items-center justify-between">
          <text class="text-[28rpx] text-[#2b2b2b] font-medium">老师方（老师 + 助教）</text>
          <text class="text-[40rpx] text-[#a54a32] font-bold">{{ yuan(teacherFinal) }}</text>
        </view>
        <view class="mt-3 border-t border-[#eee5e1] pt-3 text-[24rpx] text-[#7c7568] space-y-2">
          <view class="flex items-start justify-between">
            <text class="mr-3 flex-1">老师方渠道分成（{{ nTeacherVal }} 人 × {{ yuan(netPerStudent) }} × 60%）</text>
            <text class="text-[#2b2b2b]">{{ yuan(ownTeacherSplit) }}</text>
          </view>
          <view class="flex items-start justify-between">
            <text class="mr-3 flex-1">接待方渠道分成（{{ nVenueVal }} 人 × {{ yuan(netPerStudent) }} × 35%）</text>
            <text class="text-[#2b2b2b]">{{ yuan(venueChanTeacherSplit) }}</text>
          </view>
          <view v-if="guaranteeTopup > 0" class="flex items-start justify-between">
            <text class="mr-3 flex-1">保底课酬补足（接待方支付）</text>
            <text class="text-[#b9892f]">+{{ yuan(guaranteeTopup) }}</text>
          </view>
        </view>
      </view>

      <!-- 接待方 -->
      <view class="mt-3 border border-[#d8e0d6] rounded-xl bg-[#f4f7f2] p-4">
        <view class="flex items-center justify-between">
          <text class="text-[28rpx] text-[#2b2b2b] font-medium">接待方（书院 / 酒店）</text>
          <text class="text-[40rpx] text-[#3f6b4a] font-bold">{{ yuan(venueFinal) }}</text>
        </view>
        <view class="mt-3 border-t border-[#e4ebe2] pt-3 text-[24rpx] text-[#7c7568] space-y-2">
          <view class="flex items-start justify-between">
            <text class="mr-3 flex-1">接待包（{{ totalStudents }} 人 × {{ yuan(packageCost) }}）</text>
            <text class="text-[#2b2b2b]">{{ yuan(totalPackage) }}</text>
          </view>
          <view class="flex items-start justify-between">
            <text class="mr-3 flex-1">老师方渠道分成（40%）</text>
            <text class="text-[#2b2b2b]">{{ yuan(ownVenueSplit) }}</text>
          </view>
          <view class="flex items-start justify-between">
            <text class="mr-3 flex-1">接待方渠道分成（65%）</text>
            <text class="text-[#2b2b2b]">{{ yuan(venueChanVenueSplit) }}</text>
          </view>
          <view v-if="guaranteeTopup > 0" class="flex items-start justify-between">
            <text class="mr-3 flex-1">老师保底补足</text>
            <text class="text-[#b9892f]">-{{ yuan(guaranteeTopup) }}</text>
          </view>
        </view>
      </view>

      <!-- 合计校验 -->
      <view class="mt-3 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-[24rpx] text-[#8c8578] shadow-sm">
        <text>两方合计校验</text>
        <text class="text-[#2b2b2b] font-semibold">
          {{ yuan(teacherFinal + venueFinal) }}
          <text class="text-[#b9b2a4] font-normal"> / {{ yuan(totalRevenue) }}</text>
        </text>
      </view>
    </view>

    <!-- 渠道明细 -->
    <view class="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm">
      <view class="mb-3 flex items-center">
        <view class="mr-2 h-4 w-[6rpx] rounded bg-[#2b2b2b]" />
        <text class="text-[28rpx] text-[#2b2b2b] font-semibold">渠道明细</text>
      </view>
      <view class="flex text-[23rpx] text-[#a8a094]">
        <text class="w-[150rpx]">渠道</text>
        <text class="flex-1 text-right">人数</text>
        <text class="flex-1 text-right">净池</text>
        <text class="w-[130rpx] text-right">老师方</text>
        <text class="w-[130rpx] text-right">接待方</text>
      </view>
      <view class="mt-2 flex items-center border-t border-[#f2efe8] pt-2 text-[24rpx] text-[#2b2b2b]">
        <text class="w-[150rpx]">老师方渠道</text>
        <text class="flex-1 text-right">{{ nTeacherVal }}</text>
        <text class="flex-1 text-right">{{ yuan(ownNet) }}</text>
        <text class="w-[130rpx] text-right">{{ yuan(ownTeacherSplit) }}</text>
        <text class="w-[130rpx] text-right">{{ yuan(ownVenueSplit) }}</text>
      </view>
      <view class="mt-2 flex items-center border-t border-[#f2efe8] pt-2 text-[24rpx] text-[#2b2b2b]">
        <text class="w-[150rpx]">接待方渠道</text>
        <text class="flex-1 text-right">{{ nVenueVal }}</text>
        <text class="flex-1 text-right">{{ yuan(venueChanNet) }}</text>
        <text class="w-[130rpx] text-right">{{ yuan(venueChanTeacherSplit) }}</text>
        <text class="w-[130rpx] text-right">{{ yuan(venueChanVenueSplit) }}</text>
      </view>
    </view>

    <!-- 分享 / 重置 -->
    <view class="mx-4 mt-5 flex gap-3">
      <wd-button plain block @click="resetAll">
        重置数据
      </wd-button>
      <!-- #ifdef H5 -->
      <wd-button block type="primary" @click="handleShare">
        分享结果
      </wd-button>
      <!-- #endif -->
    </view>

    <!-- #ifndef H5 -->
    <view class="mx-4 mt-3 rounded-lg bg-[#f2efe8] px-3 py-2 text-center text-[22rpx] text-[#a8a094]">
      点右上角「···」可转发给好友或分享到朋友圈，对方打开即看到同一笔分账
    </view>
    <!-- #endif -->
  </view>
</template>
