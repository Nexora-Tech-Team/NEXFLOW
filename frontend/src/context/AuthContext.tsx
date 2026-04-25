import React, { createContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/auth'

export interface UserPermission {
  module_name: string
  module_label: string
  access_level: 'none' | 'view' | 'edit' | 'admin'
}

export interface User {
  id: string
  username: string
  fullname: string
  email: string
  is_active: boolean
  photo_url?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  permissions: UserPermission[]
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  permissions: [],
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  refreshMe: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [permissions, setPermissions] = useState<UserPermission[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    try {
      const res = await authApi.me()
      setUser(res.data.user)
      setPermissions(res.data.permissions)
    } catch {
      setUser(null)
      setPermissions([])
      setToken(null)
      localStorage.removeItem('token')
    }
  }, [])

  useEffect(() => {
    if (token) {
      refreshMe().finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [token, refreshMe])

  const login = async (username: string, password: string) => {
    const res = await authApi.login(username, password)
    const { token: newToken, user: newUser, permissions: newPerms } = res.data
    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(newUser)
    setPermissions(newPerms)
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {}
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setPermissions([])
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        permissions,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
