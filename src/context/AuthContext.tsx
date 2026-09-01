import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { authApi, setTokenGetter, type PublicUser } from '../lib/apiClient'

const TOKEN_KEY = 'heygotchu.auth.token.v1'

interface AuthContextValue {
  user: PublicUser | null
  token: string | null
  status: 'checking' | 'signed-out' | 'signed-in'
  signup: (email: string, password: string) => Promise<PublicUser>
  sendOtp: (identifier: { userId?: string; email?: string }) => ReturnType<typeof authApi.sendOtp>
  verifyOtp: (userId: string, code: string) => Promise<PublicUser>
  login: (email: string, password: string) => Promise<PublicUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<PublicUser | null>(null)
  const [status, setStatus] = useState<'checking' | 'signed-out' | 'signed-in'>('checking')

  // Every apiClient call reads the current token through this getter. It
  // must be a ref updated during render — wiring it in an effect loses a
  // race right after login: App's data-load effect (child) runs before this
  // provider's effects (parent), so the first closet/preferences/trips
  // fetches went out with no Authorization header and 401'd, leaving the
  // app looking empty until a full reload.
  const tokenRef = useRef(token)
  tokenRef.current = token
  useEffect(() => {
    setTokenGetter(() => tokenRef.current)
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setStatus('signed-out')
      return
    }
    authApi
      .me()
      .then((res) => {
        if (cancelled) return
        setUser(res.user)
        setStatus('signed-in')
      })
      .catch(() => {
        if (cancelled) return
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
        setStatus('signed-out')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const signup = useCallback(async (email: string, password: string) => {
    // Refer & earn: an invite link lands as heygotchu.com/?ref=<user id> —
    // carry that code through signup so the referrer gets their streak days.
    let referralCode: string | undefined
    try {
      referralCode = new URLSearchParams(window.location.search).get('ref') ?? undefined
    } catch { /* no window (tests) */ }
    const res = await authApi.signup(email, password, referralCode)
    return res.user
  }, [])

  const sendOtp = useCallback((identifier: { userId?: string; email?: string }) => authApi.sendOtp(identifier), [])

  const verifyOtp = useCallback(async (userId: string, code: string) => {
    const res = await authApi.verifyOtp(userId, code)
    localStorage.setItem(TOKEN_KEY, res.token)
    setToken(res.token)
    setUser(res.user)
    setStatus('signed-in')
    return res.user
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    localStorage.setItem(TOKEN_KEY, res.token)
    setToken(res.token)
    setUser(res.user)
    setStatus('signed-in')
    return res.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setStatus('signed-out')
  }, [])

  const value = useMemo(
    () => ({ user, token, status, signup, sendOtp, verifyOtp, login, logout }),
    [user, token, status, signup, sendOtp, verifyOtp, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
