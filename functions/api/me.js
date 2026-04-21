import { getUser, jsonResponse } from '../_auth.js'

export async function onRequestGet({ request, env }) {
  const user = getUser(request, env)

  // Debug: log what we're seeing
  const cookie = request.headers.get('cookie') || ''
  const hasSession = cookie.includes('mt_session')
  const adminEmail = env.ADMIN_EMAIL || 'NOT_SET'

  if (user.notLoggedIn) {
    return jsonResponse({ error: 'Not authenticated', debug: { hasSession, adminEmail } }, 401)
  }

  return jsonResponse({
    authenticated: true,
    email: user.email,
    isAdmin: user.isAdmin,
    debug: {
      adminEmail,
      hasSession,
      emailMatch: user.email.toLowerCase() === adminEmail.toLowerCase(),
    }
  })
}
