import { http } from '@/http/http'

/**
 * 活动集合模型
 */
export interface IActivityCollection {
  id: string
  title: string
  description?: string
  coverUrl?: string
  userId: string
  createdAt: string
  updatedAt: string
  activities?: IActivity[]
}

/**
 * 活动模型
 */
export interface IActivity {
  id: string
  title: string
  coverUrl?: string
  summary?: string
  content?: string
  location?: any
  startTime: string
  endTime: string
  collectionId: string
  userId: string
  createdAt: string
  updatedAt: string
  collection?: IActivityCollection
  members?: IActivityMember[]
}

/**
 * 活动成员模型
 */
export interface IActivityMember {
  id: string
  userId: string
  activityId: string
  nickname?: string
  role: 'ADMIN' | 'ASSISTANT' | 'GENERAL'
  status: 'JOINED' | 'JOINING'
  joinReason?: string
  createdAt: string
  updatedAt: string
  activity?: IActivity
}

/**
 * 获取活动列表
 * @param params 查询参数
 */
export const getActivitiesAPI = (params?: { collectionId?: string }) => {
  return http.get<IActivity[]>('/api/activities', params)
}

/**
 * 获取活动详情
 * @param id 活动ID
 */
export const getActivityDetailAPI = (id: string) => {
  return http.get<IActivity>(`/api/activities/${id}`)
}

/**
 * 加入活动
 * @param id 活动ID
 * @param data 加入信息
 */
export const joinActivityAPI = (id: string, data: { nickname?: string; joinReason?: string }) => {
  return http.post<IActivityMember>(`/api/activities/${id}/join`, data)
}

/**
 * 获取活动成员列表
 * @param id 活动ID
 */
export const getActivityMembersAPI = (id: string) => {
  return http.get<IActivityMember[]>(`/api/activities/${id}/members`)
}

/**
 * 更新成员状态
 * @param activityId 活动ID
 * @param userId 用户ID
 * @param status 状态
 */
export const updateMemberStatusAPI = (activityId: string, userId: string, status: 'JOINED' | 'JOINING') => {
  return http.patch<IActivityMember>(
    `/api/activities/${activityId}/members/${userId}`,
    { status },
  )
}

/**
 * 移除成员
 * @param activityId 活动ID
 * @param userId 用户ID
 */
export const removeMemberAPI = (activityId: string, userId: string) => {
  return http.delete<void>(`/api/activities/${activityId}/members/${userId}`)
}
