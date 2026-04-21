export function getUser(request, env) {
  // 1. Check CF Access header (if CF Access is ever re-enabled)
  const cfEmail = request.headers.get('cf-access-authenticated-user-email')
  if (cfEmail) {
    const adminEmails = (env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase())
    return { email: cfEmail, isAdmin: adminEmails.includes(cfEmail.toLowerCase()) }
  }

  // 2. Check session cookie from our login system
  const cookie = request.headers.get('cookie') || ''
  const match = cookie.match(/mt_session=([^;]+)/)
  if (match) {
    try {
      const session = JSON.parse(atob(match[1]))
      const email = session.email || ''
      const adminEmails = (env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase())
      const isAdmin = adminEmails.includes(email.toLowerCase())
      return { email, isAdmin }
    } catch {}
  }

  // 3. No auth — not logged in
  return { email: '', isAdmin: false, notLoggedIn: true }
}

export function requireAuth(request, env) {
  const user = getUser(request, env)
  if (user.notLoggedIn) {
    return {
      error: jsonResponse({ error: 'Not authenticated' }, 401),
      user: null
    }
  }
  return { error: null, user }
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}
