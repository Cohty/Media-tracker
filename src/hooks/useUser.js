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
    const token = localStorage.getItem('mt_token')
    if (!token) { setUser({ notLoggedIn: true }); setLoading(false); return }
    try {
      const res = await fetch('/api/me', { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.status === 401) { localStorage.removeItem('mt_token'); setUser({ notLoggedIn: true }) }
      else setUser(await res.json())
    } catch { setUser({ notLoggedIn: true }) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchUser() }, [fetchUser])

  return { user, loading, refetchUser: fetchUser }
}
