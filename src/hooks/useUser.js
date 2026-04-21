import { useState, useEffect, useCallback } from 'react'

export function useUser() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/me')
      if (res.status === 401) {
        setUser({ notLoggedIn: true })
      } else {
        setUser(await res.json())
      }
    } catch {
      setUser({ notLoggedIn: true })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUser() }, [fetchUser])

  return { user, loading, refetchUser: fetchUser }
}
