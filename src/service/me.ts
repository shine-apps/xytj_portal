import { http } from '@/http/http'

export interface HomeRecentChallenge {
  id: string
  title: string
  joinedAt: string
  startDate: string
  endDate: string
}

export interface HomeRecentCourse {
  videoId: string
  collectionId: string
  title: string
  collectionTitle: string
  coverUrl: string | null
  lastViewedAt: string
}

export interface HomeRecentActivity {
  id: string
  title: string
  joinedAt: string
  startTime: string
  endTime: string
}

export interface HomeRecentResponse {
  challenges: HomeRecentChallenge[]
  courses: HomeRecentCourse[]
  activities: HomeRecentActivity[]
}

export function getHomeRecentAPI() {
  return http.get<HomeRecentResponse>('/api/me/home-recent')
}
