import type {
  IMySubscription,
  ISubscribeOrderResponse,
  ISubscriptionStatus,
  IVideoAccess,
} from '@/api/subscriptions'
import {
  getMySubscriptionsAPI,
  getSubscriptionStatusAPI,
  getVideoAccessAPI,
  subscribeCollectionAPI,
} from '@/api/subscriptions'
import { getWxCode } from '@/api/login'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSubscriptionStore = defineStore(
  'subscription',
  () => {
    // 课程订阅状态缓存: collectionId -> status
    const statusMap = ref<Record<string, ISubscriptionStatus>>({})

    // 视频访问权限缓存: videoId -> access
    const accessMap = ref<Record<string, IVideoAccess>>({})

    // 我的订阅列表
    const mySubscriptions = ref<IMySubscription[]>([])
    const mySubscriptionsLoadedAt = ref<number>(0)

    // 拉取课程订阅状态(从服务端)
    async function fetchStatus(collectionId: string, force = false): Promise<ISubscriptionStatus> {
      const cached = statusMap.value[collectionId]
      // 5 分钟内的缓存可用; force=true 时强制刷新
      if (!force && cached && Date.now() - (cached._cachedAt || 0) < 5 * 60 * 1000) {
        return cached
      }
      const status = await getSubscriptionStatusAPI(collectionId)
      statusMap.value[collectionId] = { ...status, _cachedAt: Date.now() } as ISubscriptionStatus
      return status
    }

    // 拉取视频访问权限
    async function fetchAccess(videoId: string, force = false): Promise<IVideoAccess> {
      const cached = accessMap.value[videoId]
      if (!force && cached && Date.now() - (cached._cachedAt || 0) < 60 * 1000) {
        return cached
      }
      const access = await getVideoAccessAPI(videoId)
      accessMap.value[videoId] = { ...access, _cachedAt: Date.now() } as IVideoAccess
      return access
    }

    // 发起订阅
    async function subscribe(collectionId: string): Promise<ISubscribeOrderResponse> {
      let res: ISubscribeOrderResponse

      // #ifdef MP-WEIXIN
      // 小程序: 先 uni.login 取 code,后端换取 openid 完成微信支付 JSAPI 下单
      try {
        const loginRes = await getWxCode()
        res = await subscribeCollectionAPI(collectionId, loginRes.code)
      }
      catch {
        // 获取 code 失败时降级为不带 code 请求(仅影响真实支付,开发/mock 模式不受影响)
        res = await subscribeCollectionAPI(collectionId)
      }
      // #endif

      // #ifndef MP-WEIXIN
      res = await subscribeCollectionAPI(collectionId)
      // #endif

      // 不管成功失败,都强制刷新状态
      if (res.alreadySubscribed) {
        await fetchStatus(collectionId, true)
      }
      return res
    }

    // 拉取我的订阅列表
    async function fetchMySubscriptions(force = false) {
      if (!force && mySubscriptionsLoadedAt.value > 0 && Date.now() - mySubscriptionsLoadedAt.value < 60 * 1000) {
        return mySubscriptions.value
      }
      mySubscriptions.value = await getMySubscriptionsAPI()
      mySubscriptionsLoadedAt.value = Date.now()
      return mySubscriptions.value
    }

    // 支付成功后清除所有相关缓存,强制下次重新拉取
    function invalidate(collectionId?: string) {
      if (collectionId) {
        delete statusMap.value[collectionId]
        // 清除该课程下所有视频的访问缓存
        for (const videoId of Object.keys(accessMap.value)) {
          if (accessMap.value[videoId]?.collectionId === collectionId) {
            delete accessMap.value[videoId]
          }
        }
      }
      else {
        statusMap.value = {}
        accessMap.value = {}
      }
      mySubscriptionsLoadedAt.value = 0
    }

    function clear() {
      statusMap.value = {}
      accessMap.value = {}
      mySubscriptions.value = []
      mySubscriptionsLoadedAt.value = 0
    }

    return {
      statusMap,
      accessMap,
      mySubscriptions,
      mySubscriptionsLoadedAt,
      fetchStatus,
      fetchAccess,
      subscribe,
      fetchMySubscriptions,
      invalidate,
      clear,
    }
  },
  {
    // 不持久化敏感支付数据,只在内存中缓存;登录态变化时由 user store 触发 clear
    persist: false,
  },
)
