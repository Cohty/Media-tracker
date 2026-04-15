import { useState, useEffect } from 'react'

export function useUser() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(data => { setUser(data); setLoading(false) })
      .catch(() => { setUser({ authenticated: false, email: null, isAdmin: false }); setLoading(false) })
  }, [])

  return { user, loading }
}
