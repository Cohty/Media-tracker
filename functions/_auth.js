// Auth helper - since CF Access middleware is removed, default to admin
// This allows all operations while we set up proper auth separately

export function getUser(request, env) {
  const email = request.headers.get('cf-access-authenticated-user-email') || 'admin'
  const adminEmails = (env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase())
  const isAdmin = !env.ADMIN_EMAIL || adminEmails.includes(email.toLowerCase())
  return { email, isAdmin }
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
