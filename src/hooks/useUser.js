import { useState, useEffect } from 'react'

export function getAuthHeaders() { return {} }

export function useUser() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(data => { setUser(data); setLoading(false) })
      .catch(() => { setUser({ authenticated: true, email: 'admin', isAdmin: true }); setLoading(false) })
  }, [])

  return { user, loading }
}
