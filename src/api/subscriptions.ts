import type { CustomRequestOptions } from '@/http/types'
import { http } from '@/http/http'

// 订阅状态(用于课程详情页)
export interface ISubscriptionStatus {
  isPaid: boolean
  // 单位:分
  price: number
  durationDays: number
  hasActiveSubscription: boolean
  expiresAt: string | null
  remainingDays: number
  subscription: { id: string, status: string, expiresAt: string } | null
}

// 单视频访问权限
export type AccessReason
  = | 'public'
    | 'not_paid'
    | 'not_subscribed'
    | 'subscription_expired'
    | 'active_subscription'

export interface IVideoAccess {
  allowed: boolean
  reason: AccessReason
  collectionId?: string
  collectionTitle?: string
  collectionPrice?: number
}

// 支付成功后主动同步订单的结果（微信回调延迟/丢失时由前端触发查单补单）
export interface ISyncOrderResult {
  // 本地订阅是否已激活（PAID）
  status: 'PAID' | 'PENDING'
  alreadyPaid?: boolean
  expiresAt?: string
  wxTransactionId?: string
  // 微信侧交易状态（PENDING 时可能为 null）
  tradeState?: string | null
  tradeStateDesc?: string
  notFound?: boolean
  mocked?: boolean
}

// 微信支付参数
export interface IWxPayParams {
  timeStamp: string
  nonceStr: string
  package: string
  signType: 'MD5' | 'HMAC-SHA256' | 'RSA'
  paySign: string
}

// 订阅订单响应
export interface ISubscribeOrderResponse {
  alreadySubscribed?: boolean
  // 免费课程（价格为 0）订阅：后端直接激活，无 payParams
  free?: boolean
  subscription?: { id: string, expiresAt: string }
  orderId?: string
  payParams?: IWxPayParams
  mocked?: boolean
}

// 我的订阅列表
export interface IMySubscription {
  id: string
  status: string
  startedAt: string
  expiresAt: string
  remainingDays: number
  isActive: boolean
  collection: { id: string, title: string, coverUrl: string | null, durationDays: number }
}

/**
 * 获取课程订阅状态
 * @param collectionId 课程(视频合集)ID
 * @param options 额外请求选项（支付后静默刷新可传 hideErrorToast）
 */
export function getSubscriptionStatusAPI(
  collectionId: string,
  options?: Partial<CustomRequestOptions>,
) {
  return http.Get<ISubscriptionStatus>(
    `/api/collections/${collectionId}/subscription-status`,
    undefined,
    undefined,
    options,
  )
}

/**
 * 发起订阅(创建订单 + 调起微信支付)
 * @param collectionId 课程(视频合集)ID
 * @param code 小程序端 uni.login 获取的 code(可选,用于后端换取 openid 完成 JSAPI 下单)
 */
export function subscribeCollectionAPI(collectionId: string, code?: string) {
  return http.Post<ISubscribeOrderResponse>(`/api/collections/${collectionId}/subscribe`, { code })
}

/**
 * 单视频访问权限检查
 * @param videoId 视频ID
 * @param options 额外请求选项（支付后静默刷新可传 hideErrorToast）
 */
export function getVideoAccessAPI(
  videoId: string,
  options?: Partial<CustomRequestOptions>,
) {
  return http.Get<IVideoAccess>(
    `/api/videos/${videoId}/access`,
    undefined,
    undefined,
    options,
  )
}

/**
 * 获取我的订阅列表
 */
export function getMySubscriptionsAPI() {
  return http.Get<IMySubscription[]>('/api/my/subscriptions')
}

/**
 * 仅 mock 模式：模拟支付成功后主动完成订单以激活订阅
 * @param orderId 订单ID
 */
export function mockCompleteOrderAPI(orderId: string) {
  return http.Post<{ success: boolean, alreadyPaid?: boolean, expiresAt?: string }>(
    `/api/orders/${orderId}/mock-complete`,
    {},
  )
}

/**
 * 真实支付成功后主动同步订单：服务端查微信交易状态，若已支付则幂等补单激活订阅。
 * 用于支付回调延迟/丢失时的用户侧补偿（支付成功后立即调用 + 短轮询）。
 * @param orderId 订单ID
 */
export function syncSubscriptionOrderAPI(orderId: string) {
  return http.Post<ISyncOrderResult>(
    `/api/orders/${orderId}/sync`,
    {},
    undefined,
    undefined,
    { hideErrorToast: true },
  )
}
