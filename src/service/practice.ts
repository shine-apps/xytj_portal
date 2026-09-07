import type { CustomRequestOptions } from '@/http/types'
import { http } from '@/http/http'

// ==================== 类型定义 ====================

/** 打卡媒体类型 */
export type PracticeMediaType = 'IMAGE' | 'VIDEO'

/** 练拳类型（动态加载，存储值为后端返回的 name 数组，支持多选） */
export type PracticeType = string[]

/** 练拳类型选项（后端动态下发） */
export interface PracticeTypeItem {
  id: string
  name: string
  description: string | null
}

/** 勋章等级 */
export type BadgeLevel = 'BRONZE' | 'SILVER' | 'GOLD'

/** 挑战状态 */
export type ChallengeStatus = 'ongoing' | 'ended'

/** 打卡位置 */
export interface PracticeLocation {
  latitude: number
  longitude: number
  address?: string
}

/** 打卡媒体（提交） */
export interface PracticeMediaInput {
  type: PracticeMediaType
  url: string
  size?: number
  mimeType?: string
}

/** 打卡提交参数 */
export interface CheckInPayload {
  practiceType: PracticeType
  /** 时长（分钟），1~600 */
  durationMinutes: number
  /** 打卡心得，≤500 字 */
  notes?: string
  location?: PracticeLocation
  /** 媒体列表，最多 9 项 */
  medias?: PracticeMediaInput[]
  /** 补录日期（YYYY-MM-DD），可选，仅允许今天及最近 7 天，默认今天 */
  checkInDate?: string
}

/** 打卡媒体（响应） */
export interface PracticeCheckInMedia {
  type: PracticeMediaType
  url: string
  size: number | null
  mimeType: string | null
}

/** 打卡记录（响应） */
export interface PracticeCheckIn {
  id: string
  userId: string
  /** 打卡日期（ISO 字符串，UTC 零点，取 slice(0, 10) 即 YYYY-MM-DD） */
  checkInDate: string
  practiceType: PracticeType
  durationMinutes: number
  notes: string | null
  location: PracticeLocation | null
  /** 本次打卡获得的积分 */
  points: number
  createdAt: string
  updatedAt: string
  medias: PracticeCheckInMedia[]
}

/** 打卡提交响应 */
export interface CheckInResponse {
  checkIn: PracticeCheckIn
  /** 本次积分变动（新建为本次积分，编辑为 新-旧 差额） */
  pointsEarned: number
  /** 本次新授予的勋章等级 */
  newBadges: BadgeLevel[]
  /** 当前连续打卡天数 */
  consecutiveDays: number
  /** 积分流水累计 */
  totalPoints: number
}

/** 月度打卡查询响应 */
export interface MonthlyCheckInsResponse {
  /** 查询的月份 YYYY-MM */
  month: string
  /** 按 checkInDate 升序 */
  checkIns: PracticeCheckIn[]
  totalDays: number
  totalMinutes: number
}

/** 本周目标完成进度（统计接口返回） */
export interface WeeklyGoalProgress {
  targetCount: number
  completedCount: number
  achieved: boolean
  minDurationMinutes: number
}

/** 月度趋势项（近 6 个月，旧→新） */
export interface MonthlyTrendItem {
  /** 月份 YYYY-MM */
  month: string
  days: number
  minutes: number
}

/** 练拳统计 */
export interface PracticeStats {
  totalDays: number
  currentStreak: number
  longestStreak: number
  /** 近 90 天月均打卡次数（保留 1 位小数） */
  monthlyAvg: number
  totalMinutes: number
  totalPoints: number
  /** 各练拳类型打卡次数（键为功法名称） */
  typeDistribution: Record<string, number>
  monthlyTrend: MonthlyTrendItem[]
  /** 未设置目标时为 null */
  weeklyGoal: WeeklyGoalProgress | null
}

/** 勋章 */
export interface PracticeBadge {
  level: BadgeLevel
  name: string
  /** 达成所需的连续天数 */
  threshold: number
  description: string
  earned: boolean
  /** 获得时间（ISO 字符串），未获得为 null */
  earnedAt: string | null
  /** 获得时的连续天数，未获得为 null */
  consecutiveDays: number | null
}

/** 积分流水条目 */
export interface PointsLedgerItem {
  id: string
  /** 积分变动（正/负） */
  delta: number
  /** 如 'checkin' | 'checkin_edit' | 'checkin_delete' */
  reason: string
  checkInId: string | null
  createdAt: string
}

/** 积分流水响应 */
export interface PointsLedgerResponse {
  total: number
  totalPoints: number
  /** 按 createdAt 倒序 */
  items: PointsLedgerItem[]
}

/** 练拳周目标 */
export interface PracticeGoal {
  /** 每周目标次数，1~7 */
  weeklyTargetCount: number
  /** 单次最短有效时长（分钟），10~120 */
  minDurationMinutes: number
  createdAt: string
  updatedAt: string
}

/** 保存周目标参数 */
export interface SaveGoalPayload {
  /** 每周目标次数，1~7 */
  weeklyTargetCount: number
  /** 单次最短有效时长（分钟），10~120 */
  minDurationMinutes: number
}

/** 挑战创建者 */
export interface ChallengeCreator {
  id: string
  name: string
}

/** 练拳挑战 */
export interface PracticeChallenge {
  id: string
  title: string
  description: string | null
  /** YYYY-MM-DD */
  startDate: string
  /** YYYY-MM-DD */
  endDate: string
  participantCount: number
  isJoined: boolean
  creator: ChallengeCreator
}

/** 挑战列表响应 */
export interface ChallengesResponse {
  challenges: PracticeChallenge[]
  total: number
  page: number
  pageSize: number
}

/** 挑战排行榜条目 */
export interface ChallengeLeaderboardEntry {
  userId: string
  nickname: string
  checkInDays: number
  rank: number
}

/** 挑战详情响应 */
export interface ChallengeDetail {
  challenge: PracticeChallenge & { status: ChallengeStatus }
  /** 按打卡天数降序，最多 50 条，并列天数同排名 */
  leaderboard: ChallengeLeaderboardEntry[]
}

/** 创建挑战参数 */
export interface CreateChallengePayload {
  /** 标题，1~50 字 */
  title: string
  /** 描述，≤500 字 */
  description?: string
  /** YYYY-MM-DD，不早于今天 */
  startDate: string
  /** YYYY-MM-DD，晚于开始日期，周期 ≤366 天 */
  endDate: string
}

// ==================== API 函数 ====================

/**
 * 提交/更新打卡（服务端按日期幂等 upsert）
 * @param payload 打卡数据
 * @param options 额外请求选项（离线后台同步时可传 hideErrorToast 抑制错误弹窗）
 */
export function submitCheckInAPI(payload: CheckInPayload, options?: Partial<CustomRequestOptions>) {
  return http.post<CheckInResponse>('/api/practice/checkin', payload, undefined, undefined, options)
}

/**
 * 练拳类型列表（按 sortOrder 升序，无需登录）
 */
export function getPracticeTypesAPI() {
  return http.get<PracticeTypeItem[]>('/api/practice/types')
}

/**
 * 月度打卡查询
 * @param month 月份 YYYY-MM（缺省为服务端本月）
 */
export function getMonthlyCheckInsAPI(month?: string) {
  return http.get<MonthlyCheckInsResponse>('/api/practice', month ? { month } : undefined)
}

/**
 * 单日打卡详情（当日无记录时接口返回 404）
 * @param date 日期 YYYY-MM-DD
 */
export function getCheckInByDateAPI(date: string) {
  return http.get<PracticeCheckIn>(`/api/practice/checkin/${date}`)
}

/**
 * 删除某日打卡
 * @param date 日期 YYYY-MM-DD
 */
export function deleteCheckInAPI(date: string) {
  return http.delete<{ success: boolean }>(`/api/practice/checkin/${date}`)
}

/**
 * 练拳统计
 */
export function getPracticeStatsAPI() {
  return http.get<PracticeStats>('/api/practice/stats')
}

/**
 * 勋章列表（含获得状态）
 */
export function getBadgesAPI() {
  return http.get<{ badges: PracticeBadge[] }>('/api/practice/badges')
}

/**
 * 积分流水（分页）
 * @param params 分页参数
 */
export function getPointsLedgerAPI(params?: { page?: number, pageSize?: number }) {
  return http.get<PointsLedgerResponse>('/api/practice/points', params)
}

/**
 * 获取本人周目标
 */
export function getGoalAPI() {
  return http.get<{ goal: PracticeGoal | null }>('/api/practice/goals')
}

/**
 * 保存本人周目标（每用户唯一，upsert）
 * @param data 目标数据
 */
export function saveGoalAPI(data: SaveGoalPayload) {
  return http.post<PracticeGoal>('/api/practice/goals', data)
}

/**
 * 挑战列表（分页）
 * @param params 状态筛选与分页参数
 */
export function getChallengesAPI(params?: { status?: ChallengeStatus, page?: number, pageSize?: number }) {
  return http.get<ChallengesResponse>('/api/practice/challenges', params)
}

/**
 * 创建挑战（创建者自动加入）
 * @param data 挑战数据
 */
export function createChallengeAPI(data: CreateChallengePayload) {
  return http.post<PracticeChallenge>('/api/practice/challenges', data)
}

/**
 * 挑战详情（含排行榜）
 * @param id 挑战ID
 */
export function getChallengeDetailAPI(id: string) {
  return http.get<ChallengeDetail>(`/api/practice/challenges/${id}`)
}

/**
 * 加入挑战（幂等）
 * @param id 挑战ID
 */
export function joinChallengeAPI(id: string) {
  return http.post<{ success: boolean }>(`/api/practice/challenges/${id}/join`)
}

/**
 * 退出挑战（幂等）
 * @param id 挑战ID
 */
export function leaveChallengeAPI(id: string) {
  return http.post<{ success: boolean }>(`/api/practice/challenges/${id}/leave`)
}

// ==================== 工具函数 ====================

/**
 * 获取练拳类型的中文标签
 * 动态加载后 practiceType 存储的即为后端 name（中文显示名）数组，用顿号连接
 * @param type 练拳类型数组
 */
export function practiceTypeLabel(type: PracticeType): string {
  return Array.isArray(type) ? type.join('、') : String(type)
}
