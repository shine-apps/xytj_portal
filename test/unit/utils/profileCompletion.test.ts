import { describe, expect, it } from 'vitest'
import { isDefaultNickname, isMissingAvatar, needsProfileCompletion } from '@/utils/profileCompletion'

describe('isDefaultNickname', () => {
  it.each(['', '   ', '\n\t'])('将空白昵称 %j 识别为待补全', (nickname) => {
    expect(isDefaultNickname(nickname)).toBe(true)
  })

  it('将脱敏手机号识别为默认昵称', () => {
    expect(isDefaultNickname('138****8000')).toBe(true)
  })

  it.each(['云山', '13800138000', '138***8000', '用户138****8000'])('将 %s 识别为用户昵称', (nickname) => {
    expect(isDefaultNickname(nickname)).toBe(false)
  })
})

describe('isMissingAvatar', () => {
  it.each(['', '   ', null, undefined])('将空头像 %j 识别为待补全', (avatar) => {
    expect(isMissingAvatar(avatar)).toBe(true)
  })

  it.each([
    '/static/images/default-avatar.png',
    'https://example.com/ui/static/images/default-avatar.png?version=1',
  ])('将默认头像 %s 识别为待补全', (avatar) => {
    expect(isMissingAvatar(avatar)).toBe(true)
  })

  it('将自定义头像识别为已设置', () => {
    expect(isMissingAvatar('https://example.com/avatar.png')).toBe(false)
  })
})

describe('needsProfileCompletion', () => {
  it('昵称为空时需要补全', () => {
    expect(needsProfileCompletion({
      hasValidLogin: true,
      hasUserInfo: true,
      nickname: '',
      avatar: 'https://example.com/avatar.png',
    })).toBe(true)
  })

  it('头像为空时需要补全', () => {
    expect(needsProfileCompletion({
      hasValidLogin: true,
      hasUserInfo: true,
      nickname: '云山',
      avatar: '',
    })).toBe(true)
  })

  it('默认头像需要补全', () => {
    expect(needsProfileCompletion({
      hasValidLogin: true,
      hasUserInfo: true,
      nickname: '云山',
      avatar: '/static/images/default-avatar.png',
    })).toBe(true)
  })

  it('脱敏手机号昵称不再单独触发补全', () => {
    expect(needsProfileCompletion({
      hasValidLogin: true,
      hasUserInfo: true,
      nickname: '138****8000',
      avatar: 'https://example.com/avatar.png',
    })).toBe(false)
  })

  it('用户信息尚未恢复时不弹出，避免启动时空资料误触发', () => {
    expect(needsProfileCompletion({
      hasValidLogin: true,
      hasUserInfo: false,
      nickname: '',
      avatar: '',
    })).toBe(false)
  })

  it('未登录时不弹出', () => {
    expect(needsProfileCompletion({
      hasValidLogin: false,
      hasUserInfo: true,
      nickname: '',
      avatar: '',
    })).toBe(false)
  })

  it('有效头像和昵称不弹出', () => {
    expect(needsProfileCompletion({
      hasValidLogin: true,
      hasUserInfo: true,
      nickname: '云山',
      avatar: 'https://example.com/avatar.png',
    })).toBe(false)
  })
})
