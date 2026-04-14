import { http } from '@/http/http'

export interface Coach {
  id: string
  name: string
  title?: string
  avatar?: string
  photo?: string
  description?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CoachListResponse {
  total: number
  list: Coach[]
}

/**
 * 获取教练列表
 */
export function getCoaches(params: { page: number, pageSize: number }) {
  return http.get<CoachListResponse>('/api/coaches', params)
}

/**
 * 获取单名教练详情
 */
export function getCoachById(id: string) {
  return http.get<Coach>(`/api/coaches/${id}`)
}
