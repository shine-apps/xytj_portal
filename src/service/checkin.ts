import { http } from '@/http/http'

/**
 * 签到记录模型
 */
export interface IActivityCheckIn {
  id: string
  userId: string
  activityId: string
  checkInDate: string
  consecutiveDays: number
  createdAt: string
  user: {
    id: string
    nickname: string
    avatarUrl: string | null
  }
}

/**
 * 签到二维码模型
 */
export interface IActivityCheckInCode {
  id: string
  activityId: string
  code: string
  validFrom: string
  validUntil: string
  isActive: boolean
  createdBy: string
  wxaCodeUrl?: string
  createdAt: string
}

/**
 * 签到状态
 */
export interface ICheckInStatus {
  todayCheckedIn: boolean
  todayCheckIn: IActivityCheckIn | null
  consecutiveDays: number
  totalDays: number
}

/**
 * 生成签到二维码（管理员）
 * @param activityId 活动ID
 * @param validMinutes 有效期（分钟，默认60）
 * @param envVersion 小程序环境版本: 'release' | 'trial' | 'develop'
 */
export const generateCheckInCodeAPI = (activityId: string, validMinutes?: number, envVersion?: 'release' | 'trial' | 'develop') => {
  return http.post<IActivityCheckInCode>(`/api/activities/${activityId}/check-in-code`, {
    validMinutes: validMinutes || 60,
    envVersion: envVersion || 'release',
  })
}

/**
 * 获取当前有效二维码（管理员）
 * @param activityId 活动ID
 */
export const getCurrentCheckInCodeAPI = (activityId: string) => {
  return http.get<IActivityCheckInCode | null>(`/api/activities/${activityId}/check-in-code`)
}

/**
 * 使二维码失效（管理员）
 * @param activityId 活动ID
 * @param codeId 二维码ID
 */
export const invalidateCheckInCodeAPI = (activityId: string, codeId: string) => {
  return http.delete<void>(`/api/activities/${activityId}/check-in-code/${codeId}`)
}

/**
 * 扫码签到（成员）
 * @param code 二维码code
 */
export const scanCheckInAPI = (code: string) => {
  return http.post<IActivityCheckIn>('/api/check-in/scan', { code })
}

/**
 * 获取签到状态（成员）
 * @param activityId 活动ID
 */
export const getCheckInStatusAPI = (activityId: string) => {
  return http.get<ICheckInStatus>(`/api/activities/${activityId}/check-in/status`)
}

/**
 * 获取签到历史（成员）
 * @param activityId 活动ID
 * @param params 分页参数
 */
export const getCheckInHistoryAPI = (activityId: string, params?: { page?: number; limit?: number }) => {
  return http.get<IActivityCheckIn[]>(`/api/activities/${activityId}/check-in/history`, params)
}

/**
 * 获取今日签到人数（管理员）
 * @param activityId 活动ID
 */
export const getTodayCheckInCountAPI = (activityId: string) => {
  return http.get<{ count: number }>(`/api/activities/${activityId}/check-in/today-count`)
}
