import { http } from '@/http/http'

/**
 * 活动相册媒体类型
 */
export type ActivityAlbumMediaType = 'IMAGE' | 'VIDEO'

/**
 * 活动相册模型
 */
export interface IActivityAlbum {
  id: string
  activityId: string
  userId: string
  type: ActivityAlbumMediaType
  url: string
  coverUrl?: string
  description?: string
  size: number
  mimeType: string
  width?: number
  height?: number
  duration?: number
  createdAt: string
  updatedAt?: string
  user?: {
    id: string
    nickname: string
    avatarUrl?: string
  }
}

/**
 * 获取活动相册列表
 * @param activityId 活动ID
 * @param params 查询参数
 */
export const getActivityAlbumsAPI = (activityId: string, params?: { page?: number; limit?: number }) => {
  return http.get<IActivityAlbum[]>(`/api/activities/${activityId}/albums`, params)
}

/**
 * 上传相册文件
 * @param activityId 活动ID
 * @param data FormData 包含 file, type, description
 */
export const uploadAlbumAPI = (activityId: string, data: FormData) => {
  return http.post<IActivityAlbum>(`/api/activities/${activityId}/albums`, data, {
    header: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

/**
 * 创建相册记录
 * @param activityId 活动ID
 * @param data 相册数据
 */
export const createAlbumAPI = (activityId: string, data: { type: 'IMAGE' | 'VIDEO'; url: string; size: number; description?: string }) => {
  return http.post<IActivityAlbum>(`/api/activities/${activityId}/albums`, data)
}

/**
 * 更新相册描述
 * @param activityId 活动ID
 * @param albumId 相册ID
 * @param description 描述内容
 */
export const updateAlbumDescriptionAPI = (activityId: string, albumId: string, description: string) => {
  return http.patch<IActivityAlbum>(`/api/activities/${activityId}/albums/${albumId}`, { description })
}

/**
 * 删除相册文件
 * @param activityId 活动ID
 * @param albumId 相册ID
 */
export const deleteAlbumAPI = (activityId: string, albumId: string) => {
  return http.delete<{ success: boolean }>(`/api/activities/${activityId}/albums/${albumId}`)
}
