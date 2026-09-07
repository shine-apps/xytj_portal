import type { CheckInPayload } from '@/service/practice'
import { submitCheckInAPI } from '@/service/practice'

/** 离线队列存储 key */
const OFFLINE_QUEUE_KEY = 'practice_offline_queue'

/** 离线打卡队列条目（打卡数据 + 本地唯一标识 + 入队时间） */
export interface OfflineCheckInItem {
  /** 本地唯一标识（时间戳 + 随机数） */
  id: string
  /** submitCheckInAPI 的请求体（补录时含 checkInDate，服务端按日期幂等 upsert） */
  payload: CheckInPayload
  /** 入队时间戳（ms） */
  queuedAt: number
}

/** http 层 reject 的失败对象：网络错误仅有 errMsg，服务端错误带有 statusCode */
interface RequestFailure {
  statusCode?: number
  errMsg?: string
}

/** 同步锁，避免重入（手动同步与网络恢复监听可能并发触发） */
let syncing = false

/** 网络状态监听是否已注册（防重复注册标记） */
let listenerRegistered = false

/** 读取队列（存储损坏时视为空队列） */
function readQueue(): OfflineCheckInItem[] {
  try {
    const raw = uni.getStorageSync(OFFLINE_QUEUE_KEY)
    if (!raw)
      return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? (parsed as OfflineCheckInItem[]) : []
  }
  catch {
    return []
  }
}

/** 写入队列 */
function writeQueue(queue: OfflineCheckInItem[]): void {
  uni.setStorageSync(OFFLINE_QUEUE_KEY, queue)
}

/**
 * 无网络时入队一条打卡
 * 补录场景由调用方在 payload.checkInDate 填好入队当天的 YYYY-MM-DD，同步时直接提交，服务端按日期幂等 upsert
 */
export function enqueueOfflineCheckIn(payload: CheckInPayload): void {
  const queue = readQueue()
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    payload,
    queuedAt: Date.now(),
  })
  writeQueue(queue)
}

/**
 * 获取当前离线队列（按入队顺序，返回新数组，可安全遍历）
 */
export function getOfflineQueue(): OfflineCheckInItem[] {
  return readQueue()
}

/**
 * 从队列中移除指定条目
 * @param id 本地唯一标识
 */
export function removeOfflineItem(id: string): void {
  writeQueue(readQueue().filter(item => item.id !== id))
}

/**
 * 判断是否还有待同步的离线打卡
 */
export function hasOfflinePending(): boolean {
  return readQueue().length > 0
}

/**
 * 判断同步中遇到的错误是否为网络错误（应中断本轮、保留队列等下次）
 * http 层：网络失败 reject 的对象只有 errMsg；服务端有响应时 reject 的对象带 statusCode
 * 401（登录失效）同样中断保留——http 层已引导重新登录，避免误删离线数据
 */
function isNetworkOrAuthError(error: RequestFailure): boolean {
  return typeof error.statusCode !== 'number' || error.statusCode === 401
}

/**
 * 同步离线队列：按入队顺序逐条提交
 * - 成功：从队列删除该条，继续下一条
 * - 非网络错误（如 400 校验失败，重试也不可能成功）：console.warn 后删除该条，继续下一条
 * - 网络错误 / 登录失效：中断本轮，保留剩余队列等待下次同步
 * @param onProgress 每处理完一条后的进度回调（累计值）
 */
export async function syncOfflineQueue(onProgress?: (result: { synced: number, failed: number }) => void): Promise<void> {
  if (syncing)
    return
  syncing = true
  let synced = 0
  let failed = 0
  try {
    const queue = readQueue()
    for (const item of queue) {
      try {
        await submitCheckInAPI(item.payload, { hideErrorToast: true })
        removeOfflineItem(item.id)
        synced += 1
        onProgress?.({ synced, failed })
      }
      catch (error) {
        if (isNetworkOrAuthError(error as RequestFailure))
          break
        // 服务端校验失败等永久错误：丢弃该条，避免阻塞后续队列
        console.warn('[practice-offline] 离线打卡同步失败，已丢弃：', item.id, error)
        removeOfflineItem(item.id)
        failed += 1
        onProgress?.({ synced, failed })
      }
    }
  }
  finally {
    syncing = false
  }
}

/**
 * 初始化离线同步监听（App 启动时调用一次，重复调用不会重复注册）
 * 网络恢复时自动触发一轮同步
 */
export function initOfflineSyncListener(): void {
  if (listenerRegistered)
    return
  listenerRegistered = true
  uni.onNetworkStatusChange((res) => {
    if (res.isConnected)
      syncOfflineQueue()
  })
}
