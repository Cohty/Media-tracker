export function getUser(request, env) {
  // Check Authorization header (Bearer token from localStorage)
  const auth = request.headers.get('authorization') || ''
  if (auth.startsWith('Bearer ')) {
    try {
      const session = JSON.parse(atob(auth.slice(7)))
      const email = session.email || ''
      const adminEmails = (env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase())
      const isAdmin = session.isAdmin === true && adminEmails.includes(email.toLowerCase())
      return { email, isAdmin }
    } catch {}
  }
  return { email: '', isAdmin: false, notLoggedIn: true }
}

export function requireAuth(request, env) {
  const user = getUser(request, env)
  if (user.notLoggedIn) {
    return { error: jsonResponse({ error: 'Not authenticated' }, 401), user: null }
  }
  return { error: null, user }
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}
