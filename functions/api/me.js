export async function onRequestGet({ request, env }) {
  const email = request.headers.get('cf-access-authenticated-user-email') || ''
  const adminEmails = (env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase())
  const isAdmin = !email || adminEmails.includes(email.toLowerCase())
  return new Response(JSON.stringify({
    authenticated: true,
    email: email || 'admin',
    isAdmin,
  }), { headers: { 'Content-Type': 'application/json' } })
}
