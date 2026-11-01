import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken } from '../lib/api'

const AuthContext = createContext(null)

// Halaman awal panel sesuai role
export const homeFor = (user) => {
  if (user?.role === 'pemilik') return '/panel/dashboard'
  if (user?.role === 'admin') return '/panel/dashboard'
  if (user?.role === 'pelanggan') return '/pesanan'
  return '/'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!getToken())

  useEffect(() => {
    if (!getToken()) return
    api
      .get('/me')
      .then((r) => setUser(r.data))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onExpired = () => setUser(null)
    const onStorage = (e) => {
      if (e.key === 'tamafarm_token') {
        if (e.newValue) {
          api.get('/me').then((r) => setUser(r.data)).catch(() => setUser(null))
        } else {
          setUser(null)
        }
      }
    }
    window.addEventListener('auth:expired', onExpired)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('auth:expired', onExpired)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const login = useCallback(async (username, password) => {
    const r = await api.post('/login', { username, password })
    setToken(r.data.token)
    setUser(r.data.user)
    return r.data.user
  }, [])

  const register = useCallback(async (nama, username, password, noHp) => {
    const r = await api.post('/register', { nama, username, password, no_hp: noHp })
    setToken(r.data.token)
    setUser(r.data.user)
    return r.data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
    } catch {
      /* token mungkin sudah tidak berlaku */
    }
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout, register }), [user, loading, login, logout, register])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
