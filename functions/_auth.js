export function getUser(request, env) {
  // Set by _middleware.js after verifying session cookie
  const email = request.headers.get('cf-access-authenticated-user-email') || ''
  if (!email) return null
  const adminEmails = (env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase())
  const isAdmin = adminEmails.includes(email.toLowerCase())
  return { email, isAdmin }
}

export function requireAuth(request, env) {
  const user = getUser(request, env)
  if (!user) {
    return {
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      }),
      user: null
    }
  }
  return { error: null, user }
}

export const JSON_HEADERS = { 'Content-Type': 'application/json' }

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}
