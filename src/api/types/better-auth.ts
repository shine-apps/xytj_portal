export interface BetterAuthUser {
  id: string
  email: string
  emailVerified: boolean
  phoneNumber?: string
  phoneNumberVerified?: boolean
  name: string
  createdAt: Date
  updatedAt: Date
  image?: string
  role?: string | null
}

export interface BetterAuthSession {
  id: string
  token: string
  userId: string
  expiresAt: Date
  ipAddress?: string
  userAgent?: string
}

export interface BetterAuthResponse {
  session: BetterAuthSession
  user: BetterAuthUser
  token?: string // If using Bearer token mode
}

export interface BetterAuthError {
  message?: string
  status?: number
  code?: string
}
