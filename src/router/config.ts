/**
 * 路由拦截配置
 * 登录策略配置
 */

import { getAllPages } from '@/utils'

// 登录策略
export const LOGIN_STRATEGY = {
  DEFAULT_NO_NEED_LOGIN: 0, // 默认无需登录
  DEFAULT_NEED_LOGIN: 1, // 默认需要登录
} as const

// 当前使用的登录策略
export const CURRENT_LOGIN_STRATEGY = LOGIN_STRATEGY.DEFAULT_NO_NEED_LOGIN

// 在 definePage 里面配置了 excludeLoginPath 的页面，功能与 EXCLUDE_LOGIN_PATH_LIST 相同
export const excludeLoginPathList = getAllPages('excludeLoginPath').map(page => page.path)

// 排除登录的路径列表
// 在 DEFAULT_NO_NEED_LOGIN 策略下，这些路径需要登录
// 在 DEFAULT_NEED_LOGIN 策略下，这些路径不需要登录
// 排除在外的列表，白名单策略指白名单列表，黑名单策略指黑名单列表
// TODO: 2/3 在 definePage 配置 excludeLoginPath，或者在下面配置 EXCLUDE_LOGIN_PATH_LIST
export const EXCLUDE_LOGIN_PATH_LIST = [
  ...excludeLoginPathList, // 都是以 / 开头的 path
]

// 登录页面是否在小程序中启用
export const LOGIN_PAGE_ENABLE_IN_MP = false
