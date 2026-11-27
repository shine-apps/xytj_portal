import type { CustomRequestOptions } from '@/http/types'
import { http } from '@/http/http'

// ==================== 类型定义 ====================

/** 允许的查询半径（公里），后端仅接受 5 / 10 / 30，非法值回退 5 */
export type NearbyRadius = 5 | 10 | 30 | 50

/** 我的位置发布状态（GET /nearby/me 的 location 字段） */
export interface NearbyLocationStatus {
  id: string
  isActive: boolean
  locationName: string | null
  address: string | null
  publishedAt: string
}

/** GET /nearby/me 响应 */
export interface NearbyMeResponse {
  bio: string | null
  location: NearbyLocationStatus | null
}

/** PUT /nearby/location 请求体 */
export interface PublishLocationPayload {
  latitude: number
  longitude: number
  /** 地点名称（如「朝阳公园」），≤50 字 */
  locationName?: string
  /** 详细地址，≤100 字 */
  address?: string
}

/** PUT /nearby/location 响应 */
export interface PublishLocationResponse {
  location: {
    id: string
    isActive: boolean
    locationName: string | null
  }
}

/** 附近拳友列表项（响应不得包含他人经纬度） */
export interface NearbyUser {
  userId: string
  name: string
  avatar: string | null
  bio: string | null
  locationName: string | null
  /** 与当前用户的球面距离，单位米，已按距离升序 */
  distanceM: number
  /** 常练功法 Top3，无打卡记录时为空数组，标签区不渲染 */
  topForms: string[]
}

/** GET /nearby/users 响应 */
export interface NearbyUsersResponse {
  radius: number
  page: number
  pageSize: number
  total: number
  users: NearbyUser[]
}

/** 会话对方资料 */
export interface NearbyPeer {
  id: string
  name: string
  avatar: string | null
}

/** 会话列表项 */
export interface NearbyConversationItem {
  id: string
  lastMessageContent: string | null
  lastMessageAt: string | null
  unreadCount: number
  peer: NearbyPeer
}

/** 一条私信消息 */
export interface NearbyMessage {
  id: string
  senderId: string
  content: string
  createdAt: string
}

/** GET messages 响应（后端固定返回最新 20 条，倒序） */
export interface NearbyMessagesResponse {
  messages: NearbyMessage[]
  pageSize: number
}

// ==================== 接口封装 ====================

/** 我的发布状态 + 简介 */
export function getNearbyMeAPI() {
  return http.get<NearbyMeResponse>('/api/nearby/me')
}

/** 发布 / 更新我的位置（upsert 并激活） */
export function publishLocationAPI(payload: PublishLocationPayload) {
  return http.put<PublishLocationResponse>('/api/nearby/location', payload)
}

/** 关闭位置公开（isActive=false） */
export function closeLocationAPI(options?: Partial<CustomRequestOptions>) {
  return http.delete<{ success: boolean }>('/api/nearby/location', undefined, undefined, options)
}

/** 更新一句话简介（≤50 字；微信小程序端由前端前置调 /api/text-security-check，H5 端跳过审核） */
export function updateNearbyBioAPI(bio: string) {
  return http.put<{ bio: string }>('/api/nearby/profile', { bio })
}

/** 附近拳友分页列表（radius 仅允许 5/10/30）。
 *  默认静默拦截器 toast：409 LOCATION_NOT_PUBLISHED 由页面切回引导空态，
 *  其他错误在页面 catch 中自行提示，避免与 UI 状态切换重复弹 toast。 */
export function getNearbyUsersAPI(
  params: { radius: NearbyRadius, page: number },
  options?: Partial<CustomRequestOptions>,
) {
  return http.get<NearbyUsersResponse>('/api/nearby/users', params, undefined, options)
}

/** 我的会话列表（lastMessageAt 倒序，含对方资料与未读数） */
export function getConversationsAPI() {
  return http.get<{ conversations: NearbyConversationItem[] }>('/api/nearby/conversations')
}

/** 幂等建 / 取与目标用户的会话 */
export function createConversationAPI(targetUserId: string) {
  return http.post<{ conversation: { id: string } }>('/api/nearby/conversations', { targetUserId })
}

/** 会话消息历史（最新 20 条，倒序；后端暂无游标分页入参）。
 *  支持静默选项：403 非成员由聊天页自定义 toast 后 navigateBack，避免拦截器重复弹窗。 */
export function getMessagesAPI(conversationId: string, options?: Partial<CustomRequestOptions>) {
  return http.get<NearbyMessagesResponse>(
    `/api/nearby/conversations/${conversationId}/messages`,
    undefined,
    undefined,
    options,
  )
}

/** 发送消息（1~500 字，后端成员校验 + 事务；微信小程序端由前端前置调 /api/text-security-check，H5 端跳过审核）。
 *  不静默：审核 400/503/409 的中文提示由 http 拦截器统一 toast，页面只保留输入内容。 */
export function sendMessageAPI(conversationId: string, content: string) {
  return http.post<{ message: NearbyMessage }>(
    `/api/nearby/conversations/${conversationId}/messages`,
    { content },
  )
}

/** 标记会话已读 */
export function markConversationReadAPI(conversationId: string) {
  return http.post<{ success: boolean }>(`/api/nearby/conversations/${conversationId}/read`)
}

/** 全部会话总未读数（驱动首页红点） */
export function getUnreadCountAPI() {
  return http.get<{ unreadCount: number }>('/api/nearby/unread-count')
}
