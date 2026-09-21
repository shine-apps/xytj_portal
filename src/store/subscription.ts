import type {
  IMySubscription,
  ISubscribeOrderResponse,
  ISubscriptionStatus,
  IVideoAccess,
} from '@/api/subscriptions'
import type { CustomRequestOptions } from '@/http/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getWxCode } from '@/api/login'
import {
  getMySubscriptionsAPI,
  getSubscriptionStatusAPI,
  getVideoAccessAPI,
  subscribeCollectionAPI,
} from '@/api/subscriptions'

export const useSubscriptionStore = defineStore(
  'subscription',
  () => {
    // 前端缓存项:在接口类型上附加本地缓存时间戳
    type CachedStatus = ISubscriptionStatus & { _cachedAt?: number }
    type CachedAccess = IVideoAccess & { _cachedAt?: number }

    // 课程订阅状态缓存: collectionId -> status
    const statusMap = ref<Record<string, CachedStatus>>({})

    // 视频访问权限缓存: videoId -> access
    const accessMap = ref<Record<string, CachedAccess>>({})

    // 我的订阅列表
    const mySubscriptions = ref<IMySubscription[]>([])
    const mySubscriptionsLoadedAt = ref<number>(0)

    // 拉取课程订阅状态(从服务端)
    async function fetchStatus(
      collectionId: string,
      force = false,
      options?: Partial<CustomRequestOptions>,
    ): Promise<ISubscriptionStatus> {
      const cached = statusMap.value[collectionId]
      // 5 分钟内的缓存可用; force=true 时强制刷新
      if (!options && !force && cached && Date.now() - (cached._cachedAt || 0) < 5 * 60 * 1000) {
        return cached
      }
      const status = await getSubscriptionStatusAPI(collectionId, options)
      statusMap.value[collectionId] = { ...status, _cachedAt: Date.now() } as ISubscriptionStatus
      return status
    }

    // 拉取视频访问权限
    async function fetchAccess(
      videoId: string,
      force = false,
      options?: Partial<CustomRequestOptions>,
    ): Promise<IVideoAccess> {
      const cached = accessMap.value[videoId]
      if (!options && !force && cached && Date.now() - (cached._cachedAt || 0) < 60 * 1000) {
        return cached
      }
      const access = await getVideoAccessAPI(videoId, options)
      accessMap.value[videoId] = { ...access, _cachedAt: Date.now() } as IVideoAccess
      return access
    }

    // 发起订阅
    async function subscribe(collectionId: string): Promise<ISubscribeOrderResponse> {
      let res: ISubscribeOrderResponse

      // #ifdef MP-WEIXIN
      // 小程序: 先 uni.login 取 code,后端换取 openid 完成微信支付 JSAPI 下单
      // 注意: catch 只覆盖 getWxCode();下单接口本身失败(如 500)必须继续向外抛出,
      // 否则会误触发"不带 code 重试",在真实支付模式下报出具有误导性的 openid 缺失错误。
      let wxCode: string | undefined
      try {
        wxCode = (await getWxCode()).code
      }
      catch {
        // 获取 code 失败时降级为不带 code 请求(仅影响真实支付,开发/mock 模式不受影响)
        console.warn('[subscription] uni.login failed, subscribe without wx code')
      }
      res = await subscribeCollectionAPI(collectionId, wxCode)
      // #endif

      // #ifndef MP-WEIXIN
      res = await subscribeCollectionAPI(collectionId)
      // #endif

      // 订阅状态刷新由调用方(页面)统一处理,避免重复请求
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
