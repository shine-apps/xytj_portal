import type { BetterAuthResponse, BetterAuthUser } from './types/better-auth'
import { http } from '@/http/http'

/**
 * Better Auth 登录参数
 */
export interface SignInParams {
  email: string
  password: string
}

/**
 * Better Auth 注册参数
 */
export interface SignUpParams {
  email: string
  password: string
  name: string
  image?: string
}

/**
 * 手机号登录参数
 */
export interface SignInPhoneParams {
  phoneNumber: string
  password?: string
  code?: string // OTP code
}

export interface SignInSuccessResponse {
  token: string
  user: BetterAuthUser
}

const AUTH_BASE = '/api/auth'

/**
 * 邮箱登录
 */
export function signInEmail(data: SignInParams) {
  // 使用 returnFullResponse 来获取响应头
  return http.post<SignInSuccessResponse>(`${AUTH_BASE}/sign-in/email`, data, {}, {}, { isRaw: true })
}

/**
 * 手机号密码登录
 */
export function signInPhone(data: { phoneNumber: string, password: string }) {
  return http.post<SignInSuccessResponse>(`${AUTH_BASE}/sign-in/phone-number`, data, {}, {}, { isRaw: true })
}

/**
 * 发送手机验证码
 */
export function sendPhoneOtp(data: { phoneNumber: string }) {
  // 注意：Better Auth 的手机号OTP发送端点可能不同，这里假设是 /phone-number/verify
  // 或者如果是单纯发送验证码，可能是 /phone-number/send-otp
  // 假设使用 Better Auth phone-number plugin 标准路径
  return http.post<any>(`${AUTH_BASE}/phone-number/send-otp`, data, {}, {}, { isRaw: true })
}

/**
 * 验证手机号OTP并登录
 */
export function verifyPhoneOtp(data: { phoneNumber: string, code: string }) {
  return http.post<SignInSuccessResponse>(`${AUTH_BASE}/phone-number/verify`, data, {}, {}, { isRaw: true })
}

/**
 * 邮箱注册
 */
export function signUpEmail(data: SignUpParams) {
  return http.post<UniApp.RequestSuccessCallbackResult>(`${AUTH_BASE}/sign-up/email`, data, {}, {}, { returnFullResponse: true })
}

/**
 * 获取当前会话
 */
export function getSession() {
  return http.get<BetterAuthResponse>(`${AUTH_BASE}/get-session`, {}, {}, { isRaw: true })
}

/**
 * 退出登录
 */
export function signOut() {
  return http.post<{ success: boolean }>(`${AUTH_BASE}/sign-out`, {}, {}, {}, { isRaw: true })
}
