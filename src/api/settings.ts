import { http } from '@/http/http'

export interface ISetting {
  id: number
  key: string
  value: string
  createdAt: string
  updatedAt: string
}

export function getSettings() {
  return http.Get<ISetting[]>('/api/settings')
}
