export function getUser(request, env) {
  const email = request.headers.get('cf-access-authenticated-user-email') || ''
  if (email) {
    const adminEmails = (env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase())
    return { email, isAdmin: adminEmails.includes(email.toLowerCase()) }
  }
  // No CF Access header — default to admin (internal tool)
  return { email: 'admin', isAdmin: true }
}

export function requireAuth(request, env) {
  return { error: null, user: getUser(request, env) }
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}
