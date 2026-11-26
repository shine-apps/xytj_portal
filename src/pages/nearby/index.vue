<script setup lang="ts">
import type { NearbyLocationStatus, NearbyRadius, NearbyUser } from '@/service/nearby'
import { onShow } from '@dcloudio/uni-app'
import { computed, nextTick, ref } from 'vue'
import useZPaging from 'z-paging/components/z-paging/js/hooks/useZPaging.js'
import FriendCard from './components/FriendCard.vue'
import LocationPublishCard from './components/LocationPublishCard.vue'
import {
  closeLocationAPI,
  createConversationAPI,
  getNearbyMeAPI,
  getNearbyUsersAPI,
  publishLocationAPI,
  updateNearbyBioAPI,
} from '@/service/nearby'
import { useNearbyStore } from '@/store/nearby'
import { useUserStore } from '@/store/user'

defineOptions({
  name: 'NearbyIndex',
})
definePage({
  style: {
    navigationBarTitleText: '附近拳友',
  },
})

const userStore = useUserStore()
const nearbyStore = useNearbyStore()

const paging = ref<any>(null)
useZPaging(paging)

const radiusOptions: NearbyRadius[] = [5, 10, 30]
const radius = ref<NearbyRadius>(5)
const friends = ref<NearbyUser[]>([])

const myLocation = ref<NearbyLocationStatus | null>(null)
const myBio = ref<string | null>(null)
const meLoaded = ref(false)
const savingBio = ref(false)
const locationCardRef = ref<InstanceType<typeof LocationPublishCard> | null>(null)

/** 已发布且处于公开状态才允许加载列表 */
const isPublished = computed(() => !!myLocation.value?.isActive)

async function loadMyStatus() {
  if (!userStore.hasValidLogin) {
    meLoaded.value = true
    return
  }
  try {
    const res = await getNearbyMeAPI()
    myLocation.value = res.location
    myBio.value = res.bio
  }
  catch (e) {
    console.error('加载附近发布状态失败', e)
  }
  finally {
    meLoaded.value = true
  }
}

onShow(() => {
  void (async () => {
    await loadMyStatus()
    if (userStore.hasValidLogin) {
      await nearbyStore.fetchUnreadCount()
    }
    // z-paging 关闭 auto（见模板 :auto="false"），等发布状态就绪后再首次查询，
    // 避免组件挂载即触发 @query 时 isPublished 仍为 false 而锁空
    if (isPublished.value) {
      paging.value?.reload()
    }
  })()
})

/** z-paging 查询回调：未发布直接返回空，不发起列表请求 */
async function queryList(pageNo: number, pageSize: number) {
  if (!isPublished.value) {
    paging.value?.completeByTotal([], 0)
    return
  }
  try {
    // 静默拦截器 toast：409 切引导态，其他错误在此手动提示一次
    const res = await getNearbyUsersAPI(
      { radius: radius.value, page: pageNo },
      { hideErrorToast: true },
    )
    paging.value?.completeByTotal(res.users, res.total)
  }
  catch (e: any) {
    if (e?.statusCode === 409 && e?.data?.statusMessage === 'LOCATION_NOT_PUBLISHED') {
      myLocation.value = null
      paging.value?.completeByTotal([], 0)
      return
    }
    uni.showToast({ icon: 'none', title: e?.data?.message || e?.data?.msg || '加载失败，请稍后重试' })
    paging.value?.complete(false)
  }
}

function switchRadius(next: NearbyRadius) {
  if (radius.value === next) {
    return
  }
  radius.value = next
  paging.value?.reload()
}

/** 选点：取消静默；授权拒绝引导 openSetting；其余 toast */
function choosePublishLocation() {
  uni.chooseLocation({
    success: async (res) => {
      try {
        const data = await publishLocationAPI({
          latitude: res.latitude,
          longitude: res.longitude,
          locationName: res.name || '',
          address: res.address || res.name || '',
        })
        myLocation.value = {
          id: data.location.id,
          isActive: data.location.isActive,
          locationName: data.location.locationName,
          address: res.address || res.name || '',
          publishedAt: new Date().toISOString(),
        }
        uni.showToast({ title: '位置已公开', icon: 'none' })
        // z-paging 随 v-if 刚挂载，等待 nextTick 后再触发首次查询
        await nextTick()
        paging.value?.reload()
      }
      catch (e) {
        console.error('发布位置失败', e)
      }
    },
    fail: (err) => {
      const msg = String(err?.errMsg ?? '')
      if (msg.includes('cancel')) {
        return
      }
      if (msg.includes('auth') || msg.includes('deny') || msg.includes('authorize')) {
        uni.showModal({
          title: '需要定位权限',
          content: '需要使用你的位置信息来展示附近拳友，是否前往设置开启？',
          confirmText: '去设置',
          success: (modal) => {
            if (modal.confirm) {
              uni.openSetting()
            }
          },
        })
        return
      }
      // #ifdef H5
      uni.showToast({ title: '定位失败，请重试', icon: 'none' })
      // #endif
      // #ifndef H5
      uni.showToast({ title: '获取位置失败，请检查定位权限', icon: 'none' })
      // #endif
    },
  })
}

/** 开关：打开走选点；关闭二次确认后调 DELETE */
function onToggleActive(nextActive: boolean) {
  if (nextActive) {
    choosePublishLocation()
    return
  }
  uni.showModal({
    title: '关闭公开位置',
    content: '关闭后附近拳友将看不到你，确定关闭吗？',
    confirmText: '关闭',
    success: async (modal) => {
      if (!modal.confirm) {
        return
      }
      try {
        await closeLocationAPI({ hideErrorToast: true })
        if (myLocation.value) {
          myLocation.value = { ...myLocation.value, isActive: false }
        }
        friends.value = []
        uni.showToast({ title: '已关闭公开', icon: 'none' })
      }
      catch (e: any) {
        // 已静默拦截器，这里手动提示一次；开关为受控组件，失败后状态自动保持公开
        uni.showToast({ icon: 'none', title: e?.data?.message || e?.data?.msg || '关闭失败，请稍后重试' })
        console.error('关闭公开失败', e)
      }
    },
  })
}

async function onSaveBio(bio: string) {
  savingBio.value = true
  try {
    const res = await updateNearbyBioAPI(bio)
    myBio.value = res.bio
    locationCardRef.value?.closeBioPopup()
    uni.showToast({ title: '简介已更新', icon: 'none' })
  }
  catch (e) {
    // 审核 400 / 503 / 409 的中文提示已由 http 拦截器统一 toast
    console.error('更新简介失败', e)
  }
  finally {
    savingBio.value = false
  }
}

async function onMessage(user: NearbyUser) {
  try {
    const res = await createConversationAPI(user.userId)
    uni.navigateTo({
      url: `/pages/nearby/chat?id=${res.conversation.id}&peerName=${encodeURIComponent(user.name)}`,
    })
  }
  catch (e) {
    console.error('创建会话失败', e)
  }
}

function goMessages() {
  uni.navigateTo({ url: '/pages/nearby/messages' })
}
</script>

<template>
  <view class="min-h-screen bg-[#f7f7f7] p-3">
    <!-- 右上角消息入口 -->
    <view class="mb-3 flex justify-end">
      <view class="relative" @click="goMessages">
        <view class="flex items-center gap-1 rounded-full border border-[#e8e4dc] bg-[#fffdf9] px-3 py-1.5">
          <text class="i-carbon-chat text-base text-[#a33327]" />
          <text class="text-sm text-[#333]">消息</text>
        </view>
        <wd-badge
          v-if="nearbyStore.hasUnread"
          :model-value="nearbyStore.unreadCount"
          :max="99"
          class="absolute -right-1 -top-1"
        />
      </view>
    </view>

    <LocationPublishCard
      ref="locationCardRef"
      :location="myLocation"
      :bio="myBio"
      :saving-bio="savingBio"
      @choose-location="choosePublishLocation"
      @toggle-active="onToggleActive"
      @save-bio="onSaveBio"
    />

    <!-- 距离筛选条 -->
    <view v-if="isPublished" class="mt-4 flex gap-2">
      <view
        v-for="item in radiusOptions"
        :key="item"
        class="rounded-full px-4 py-1.5 text-sm transition-colors"
        :class="radius === item
          ? 'bg-[#a33327] text-white'
          : 'border border-[#e8e4dc] bg-[#fffdf9] text-[#666]'"
        @click="switchRadius(item)"
      >
        {{ item }}km
      </view>
    </view>

    <!-- 未发布引导空态：不渲染 z-paging，不请求列表 -->
    <view
      v-if="meLoaded && !isPublished"
      class="mt-6 flex flex-col items-center rounded-lg border border-dashed border-[#d9c4b8] bg-[#fffdf9] px-6 py-12 text-center"
    >
      <text class="i-carbon-location text-4xl text-[#d9c4b8]" />
      <text class="mt-3 text-base text-[#333] font-bold">发布我的位置，发现附近拳友</text>
      <text class="mt-2 text-sm text-[#999] leading-relaxed">公开位置后可查看 5/10/30 公里内的拳友，随时可以关闭</text>
      <wd-button
        class="mt-5"
        custom-style="background-color: #a33327; border-color: #a33327; border-radius: 999px;"
        @click="choosePublishLocation"
      >
        立即发布位置
      </wd-button>
    </view>

    <!-- 已发布：z-paging 分页列表（auto=false，由 onShow 状态就绪后手动 reload） -->
    <z-paging
      v-else
      ref="paging"
      v-model="friends"
      use-page-scroll
      class="mt-3 min-h-300px"
      :auto="false"
      :default-page-size="20"
      empty-view-text="附近暂未发现公开位置的拳友"
      @query="queryList"
    >
      <view class="space-y-3 pb-6">
        <FriendCard
          v-for="friend in friends"
          :key="friend.userId"
          :user="friend"
          @message="onMessage"
        />
      </view>
    </z-paging>
  </view>
</template>
