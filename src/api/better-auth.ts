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

function signInCallback(res: UniApp.RequestSuccessCallbackResult) {
  if (res.statusCode >= 200 && res.statusCode < 300) {
    // 提取响应头中的token（如果有）
    const token = res.header['set-auth-token'] || ''
    console.log('token:', token)
    const responseData = res.data as SignInSuccessResponse
    if (token)
      responseData.token = token
    // 构建符合原接口格式的响应
    return responseData
  }
  else {
    throw new Error(`请求失败: ${res.statusCode}`)
  }
}

/**
 * 邮箱登录 - 使用uni.request实现
 */
export function signInEmail(data: SignInParams) {
  return new Promise<SignInSuccessResponse>((resolve, reject) => {
    uni.request({
      url: `${AUTH_BASE}/sign-in/email`,
      method: 'POST',
      data,
      header: {
        'Content-Type': 'application/json',
      },
      success: (res) => {
        try {
          const result = signInCallback(res)
          resolve(result)
        }
        catch (error) {
          reject(error)
        }
      },
      fail: (err) => {
        reject(err)
      },
    })
  })
}

/**
 * 手机号密码登录 - 使用uni.request实现
 */
export function signInPhone(data: { phoneNumber: string, password: string }) {
  return new Promise<SignInSuccessResponse>((resolve, reject) => {
    uni.request({
      url: `${AUTH_BASE}/sign-in/phone-number`,
      method: 'POST',
      data,
      header: {
        'Content-Type': 'application/json',
      },
      success: (res) => {
        try {
          const result = signInCallback(res)
          resolve(result)
        }
        catch (error) {
          reject(error)
        }
      },
      fail: (err) => {
        reject(err)
      },
    })
  })
}

/**
 * 发送手机验证码 - 使用uni.request实现
 */
export function sendPhoneOtp(data: { phoneNumber: string }) {
  return new Promise<any>((resolve, reject) => {
    uni.request({
      url: `${AUTH_BASE}/phone-number/send-otp`,
      method: 'POST',
      data,
      header: {
        'Content-Type': 'application/json',
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        }
        else {
          reject(new Error(`请求失败: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        reject(err)
      },
    })
  })
}

/**
 * 验证手机号OTP并登录 - 使用uni.request实现
 */
export function verifyPhoneOtp(data: { phoneNumber: string, code: string }) {
  return new Promise<SignInSuccessResponse>((resolve, reject) => {
    uni.request({
      url: `${AUTH_BASE}/phone-number/verify`,
      method: 'POST',
      data,
      header: {
        'Content-Type': 'application/json',
      },
      success: (res) => {
        try {
          const result = signInCallback(res)
          resolve(result)
        }
        catch (error) {
          reject(error)
        }
      },
      fail: (err) => {
        reject(err)
      },
    })
  })
}

/**
 * 微信手机号快捷登录
 */

export function signInWePhone(data: { code: string }) {
  const appId = import.meta.env.VITE_WX_APPID
  console.log('appId:', appId)
  return new Promise<SignInSuccessResponse>((resolve, reject) => {
    return uni.request({
      url: `${AUTH_BASE}/sign-in/wechat-phone`,
      method: 'POST',
      data: {
        ...data,
        appId,
      },
      header: {
        'Content-Type': 'application/json',
      },
      success: (res) => {
        try {
          const result = signInCallback(res)
          resolve(result)
        }
        catch (error) {
          reject(error)
        }
      },
      fail: (err) => {
        reject(err)
      },
    })
  })
}

/**
 * 邮箱注册 - 使用uni.request实现
 */
export function signUpEmail(data: SignUpParams) {
  return new Promise<UniApp.RequestSuccessCallbackResult>((resolve, reject) => {
    uni.request({
      url: `${AUTH_BASE}/sign-up/email`,
      method: 'POST',
      data,
      header: {
        'Content-Type': 'application/json',
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res)
        }
        else {
          reject(new Error(`请求失败: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        reject(err)
      },
    })
  })
}

/**
 * 获取当前会话 - 使用uni.request实现
 */
export function getSession() {
  return http.get<BetterAuthResponse>(
    `${AUTH_BASE}/get-session`,
    {},
    {},
    { isRaw: true },
  )
}

/**
 * 更新用户信息
 */
export function updateUser(data: { name?: string, image?: string }) {
  return http.post<{ status: boolean }>(
    `${AUTH_BASE}/update-user`,
    data,
    {},
    {},
    { isRaw: true },
  )
}

/**
 * 退出登录 - 使用uni.request实现
 */
export function signOut() {
  return http.post<{ status: boolean }>(
    `${AUTH_BASE}/sign-out`,
    {},
    {},
    {},
    { isRaw: true },
  )
}

/**
 * 修改密码
 */
export function changePassword(data: { currentPassword: string, newPassword: string }) {
  return http.post<{ status: boolean }>(
    `${AUTH_BASE}/change-password`,
    data,
    {},
    {},
    { isRaw: true },
  )
}

/**
 * 请求密码重置OTP
 */
export function requestPasswordReset(data: { phoneNumber: string }) {
  return http.post<{ status: boolean }>(
    `${AUTH_BASE}/phone-number/request-password-reset`,
    data,
    {},
    {},
    { isRaw: true },
  )
}

/**
 * 使用OTP重置密码
 */
export function resetPasswordWithOTP(data: { phoneNumber: string, otp: string, newPassword: string }) {
  return http.post<{ status: boolean }>(
    `${AUTH_BASE}/phone-number/reset-password`,
    data,
    {},
    {},
    { isRaw: true },
  )
}
