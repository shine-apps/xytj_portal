import { http } from '@/http/http'

export interface Article {
  id: string
  title: string
  type: 'ORIGINAL' | 'LINK'
  coverUrl?: string
  summary?: string
  content?: string
  linkUrl?: string
  isPublished: boolean
  sortOrder: number
  viewCount: number
  userId: string
  createdAt: string
  updatedAt: string
}

export interface ArticleListResponse {
  total: number
  list: Article[]
}

export function getArticles(params: { page: number, pageSize: number, isPublished?: boolean }) {
  return http.get<ArticleListResponse>('/api/articles', params)
}

export function getArticleById(id: string) {
  return http.get<Article>(`/api/articles/${id}`)
}
