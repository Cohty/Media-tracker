export function getUser(request, env) {
  // 1. CF Access header (if enabled)
  const cfEmail = request.headers.get('cf-access-authenticated-user-email')
  if (cfEmail) {
    const admins = (env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase())
    return { email: cfEmail, isAdmin: admins.includes(cfEmail.toLowerCase()) }
  }
  // 2. Bearer token from localStorage
  const auth = request.headers.get('authorization') || ''
  if (auth.startsWith('Bearer ')) {
    try {
      const s = JSON.parse(atob(auth.slice(7)))
      if (s.isAdmin) {
        const admins = (env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase())
        return { email: s.email || '', isAdmin: admins.includes((s.email||'').toLowerCase()) }
      }
      return { email: 'guest', isAdmin: false }
    } catch {}
  }
  // 3. Default — treat as guest (not locked out)
  return { email: 'guest', isAdmin: false, notLoggedIn: true }
}

export function requireAuth(request, env) {
  const user = getUser(request, env)
  return { error: null, user }
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}
