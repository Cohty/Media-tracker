export function getUser(request, env) {
  // CF Access header (if Cloudflare Access is enabled)
  const cfEmail = request.headers.get('cf-access-authenticated-user-email')
  if (cfEmail) {
    const adminEmails = (env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase())
    return { email: cfEmail, isAdmin: adminEmails.includes(cfEmail.toLowerCase()) }
  }
  // Default: everyone is admin (internal tool, protected by Cloudflare Pages password)
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
