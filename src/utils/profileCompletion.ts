interface ProfileCompletionState {
  hasValidLogin: boolean
  hasUserInfo: boolean
  nickname?: string | null
  avatar?: string | null
}

export function isDefaultNickname(nickname?: string | null) {
  const value = nickname?.trim() || ''
  return !value || /^\d{3}\*{4}\d{4}$/.test(value)
}

export function isMissingAvatar(avatar?: string | null) {
  const value = avatar?.trim() || ''
  return !value || /(?:^|\/)static\/images\/default-avatar\.png(?:[?#].*)?$/.test(value)
}

export function needsProfileCompletion(state: ProfileCompletionState) {
  return state.hasValidLogin
    && state.hasUserInfo
    && (!state.nickname?.trim() || isMissingAvatar(state.avatar))
}
