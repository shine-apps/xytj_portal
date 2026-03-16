import { http } from '@/http/http'

export interface ICollection {
  id: string
  title: string
  description?: string | null
  coverUrl?: string | null
  userId: string
  createdAt: string
  updatedAt: string
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
