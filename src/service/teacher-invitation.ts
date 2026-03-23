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
  status: 'OPEN' | 'FILLED' | 'CANCELLED' | 'CLOSED'
  createdAt: string
  updatedAt: string
  applications?: ITeacherApplication[]
}

export interface ITeacherApplication {
  id: string
  invitationId: string
  userId: string
  message?: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
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
  status?: 'OPEN' | 'FILLED' | 'CANCELLED' | 'CLOSED'
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

export const applyTeacherInvitationAPI = (id: string, data?: { message?: string }) => {
  return http.post<ITeacherApplication>(`/api/teacher-invitations/${id}/apply`, data || {})
}

export const getTeacherApplicationsAPI = (invitationId: string) => {
  return http.get<ITeacherApplication[]>(`/api/teacher-invitations/${invitationId}/applications`)
}

export const handleTeacherApplicationAPI = (
  invitationId: string,
  userId: string,
  status: 'ACCEPTED' | 'REJECTED',
) => {
  return http.patch<ITeacherApplication>(
    `/api/teacher-invitations/${invitationId}/applications/${userId}`,
    { status },
  )
}
