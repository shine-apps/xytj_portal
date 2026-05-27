import { http } from '@/http/http'

// ==================== 类型定义 ====================

export type TrainingGroundMediaType = 'IMAGE' | 'VIDEO'

export interface TrainingGroundPostSource {
  url: string
  title: string
  type: 'activity' | 'video'
}

export interface TrainingGroundPost {
  id: string
  userId: string
  type: TrainingGroundMediaType
  url: string
  description: string | null
  score: number
  source: TrainingGroundPostSource | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
  }
  commentCount: number
  likeCount: number
  isLiked: boolean
}

export interface TrainingGroundComment {
  id: string
  postId: string
  userId: string
  content: string
  createdAt: string
  user: {
    id: string
    name: string
  }
}

export interface PaginatedPostsResponse {
  posts: TrainingGroundPost[]
  total: number
  page: number
  limit: number
}

export interface PaginatedCommentsResponse {
  comments: TrainingGroundComment[]
  total: number
  page: number
  limit: number
}

// ==================== API 函数 ====================

/**
 * 获取练功场帖子列表
 */
export function getTrainingGroundPosts(params: {
  page?: number
  limit?: number
  userId?: string
}) {
  return http.get<PaginatedPostsResponse>('/api/training-ground', params)
}

/**
 * 获取单个帖子详情
 */
export function getTrainingGroundPost(id: string) {
  return http.get<TrainingGroundPost>(`/api/training-ground/${id}`)
}

/**
 * 创建帖子（发布）
 */
export function createTrainingGroundPost(data: {
  type: TrainingGroundMediaType
  url: string
  description?: string
  source?: TrainingGroundPostSource
}) {
  return http.post<TrainingGroundPost>('/api/training-ground', data)
}

/**
 * 更新帖子描述
 */
export function updateTrainingGroundPost(id: string, data: { description: string }) {
  return http.patch<TrainingGroundPost>(`/api/training-ground/${id}`, data)
}

/**
 * 删除帖子
 */
export function deleteTrainingGroundPost(id: string) {
  return http.delete<{ success: boolean }>(`/api/training-ground/${id}`)
}

/**
 * 获取帖子评论列表
 */
export function getComments(
  postId: string,
  params: { page?: number, limit?: number },
) {
  return http.get<PaginatedCommentsResponse>(
    `/api/training-ground/${postId}/comments`,
    params,
  )
}

/**
 * 发表评论
 */
export function createComment(postId: string, data: { content: string }) {
  return http.post<TrainingGroundComment>(
    `/api/training-ground/${postId}/comments`,
    data,
  )
}

/**
 * 删除评论
 */
export function deleteComment(postId: string, commentId: string) {
  return http.delete<{ success: boolean }>(
    `/api/training-ground/${postId}/comments/${commentId}`,
  )
}

/**
 * 切换点赞状态
 */
export function toggleLike(postId: string) {
  return http.post<{ liked: boolean }>(
    `/api/training-ground/${postId}/like`,
  )
}
