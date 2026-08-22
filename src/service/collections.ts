import { http } from '@/http/http'

export interface ICollection {
  id: string
  title: string
  description?: string | null
  coverUrl?: string | null
  userId: string
  createdAt: string
  updatedAt: string
  // 订阅相关字段(后端透出,可空)
  /** 是否为付费课程 */
  isPaid?: boolean
  /** 订阅价格(单位:分) */
  price?: number
  /** 订阅有效天数 */
  durationDays?: number
  _count?: {
    videos: number
  }
}

export interface IVideo {
  id: string
  title: string
  url: string
  coverUrl?: string | null
  size: number
  mimeType: string
  collectionId: string
  userId: string
  createdAt: string
  viewCount?: number
  // 订阅相关字段(后端透出,可空)
  /** 是否公开试看 */
  isPublic?: boolean
  /** 当前用户是否可访问(true 表示可观看, false 表示被订阅保护) */
  isAccessible?: boolean
}

export interface ICollectionDetail extends ICollection {
  videos: IVideo[]
}

/** Get all collections */
export function getCollectionsAPI() {
  return http.Get<ICollection[]>('/api/collections')
}

/** Get collection detail */
export function getCollectionDetailAPI(id: string) {
  return http.Get<ICollectionDetail>(`/api/collections/${id}`)
}

/** Record video view */
export function recordVideoViewAPI(id: string) {
  return http.Post<{ success: boolean }>(`/api/videos/${id}/view`)
}
