import { http } from '@/http/http'

export interface ILocation {
  name?: string
  address?: string
  latitude?: number
  longitude?: number
}

export interface ITeacherInvitation {
  id: string
  userId: string
  contactName: string
  startTime: string
  endTime: string
  location?: ILocation
  description?: string
  minStudents: number
  maxStudents: number
  accommodationCover: boolean
  travelCover: boolean
  fee?: number
  feeNegotiable: boolean
  phone: string
  email?: string
  status: 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'CLOSED'
  reviewedBy?: string
  reviewedAt?: string
  reviewMessage?: string
  createdAt: string
  updatedAt: string
}

export interface CreateInvitationData {
  contactName: string
  startTime: string
  endTime: string
  location?: ILocation
  description?: string
  minStudents: number
  maxStudents: number
  accommodationCover?: boolean
  travelCover?: boolean
  fee?: number
  feeNegotiable?: boolean
  phone: string
  email?: string
}

export interface UpdateInvitationData {
  contactName?: string
  startTime?: string
  endTime?: string
  location?: ILocation
  description?: string
  minStudents?: number
  maxStudents?: number
  accommodationCover?: boolean
  travelCover?: boolean
  fee?: number
  feeNegotiable?: boolean
  phone?: string
  email?: string
  status?: 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'CLOSED'
}

export interface ReviewInvitationData {
  status: 'ACCEPTED' | 'REJECTED'
  message?: string
}

export const listMyInvitationsAPI = () => {
  return http.get<ITeacherInvitation[]>('/api/teacher-invitations/list-mine')
}

export const getTeacherInvitationDetailAPI = (id: string) => {
  return http.get<ITeacherInvitation>(`/api/teacher-invitations/${id}`)
}

export const createTeacherInvitationAPI = (data: CreateInvitationData) => {
  return http.post<ITeacherInvitation>('/api/teacher-invitations', data)
}

export const updateTeacherInvitationAPI = (id: string, data: UpdateInvitationData) => {
  return http.patch<ITeacherInvitation>(`/api/teacher-invitations/${id}`, data)
}

export const deleteTeacherInvitationAPI = (id: string) => {
  return http.delete<void>(`/api/teacher-invitations/${id}`)
}

export const reviewTeacherInvitationAPI = (id: string, data: ReviewInvitationData) => {
  return http.patch<ITeacherInvitation>(`/api/teacher-invitations/${id}/review`, data)
}

// 分页响应格式
export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// 获取所有邀请（管理员，分页）
export const listAllInvitationsAPI = (params?: {
  page?: number
  pageSize?: number
  status?: string
}) => {
  return http.get<PaginatedResponse<ITeacherInvitation>>('/api/teacher-invitations', params)
}

// 获取待审核数量
export const getPendingInvitationsCountAPI = () => {
  return http.get<number>('/api/teacher-invitations/admin/pending-count')
}
