import { jsonResponse } from '../_auth.js'

export async function onRequestPost({ request, env }) {
  const { email, password } = await request.json()

  if (!email || !password) return jsonResponse({ error: 'Email and password required' }, 400)
  if (password !== env.SITE_PASSWORD) return jsonResponse({ error: 'Invalid password' }, 401)

  const allowed = (env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  const adminEmails = (env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase())
  const isAllowed = allowed.includes(email.toLowerCase()) || adminEmails.includes(email.toLowerCase())

  if (!isAllowed) return jsonResponse({ error: 'Email not authorized' }, 403)

  const isAdmin = adminEmails.includes(email.toLowerCase())

  // Return session token to store in localStorage (not cookie)
  const token = btoa(JSON.stringify({ email: email.toLowerCase(), isAdmin, ts: Date.now() }))
  return jsonResponse({ ok: true, token, isAdmin, email: email.toLowerCase() })
}
