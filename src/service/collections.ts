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

/** Get all collections */
export function getCollectionsAPI() {
  return http.Get<ICollection[]>('/api/collections/all')
}
