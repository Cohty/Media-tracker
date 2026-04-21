import { useState, useEffect, useCallback } from 'react'

export function getAuthHeaders() {
  const token = localStorage.getItem('mt_token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export function useUser() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('mt_token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const res = await fetch('/api/me', { headers })
      const data = await res.json()
      setUser(data)
    } catch {
      setUser({ authenticated: false, isAdmin: false, notLoggedIn: true })
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchUser() }, [fetchUser])

  return { user, loading, refetchUser: fetchUser }
}
