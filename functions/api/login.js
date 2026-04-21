import { jsonResponse } from '../_auth.js'

export async function onRequestPost({ request, env }) {
  const { password, mode } = await request.json()
  if (mode === 'guest') {
    const token = btoa(JSON.stringify({ isAdmin: false, ts: Date.now() }))
    return jsonResponse({ ok: true, token, isAdmin: false })
  }
  if (password !== env.SITE_PASSWORD) return jsonResponse({ error: 'Invalid password' }, 401)
  const adminEmail = (env.ADMIN_EMAIL || '').split(',')[0].trim()
  const token = btoa(JSON.stringify({ email: adminEmail, isAdmin: true, ts: Date.now() }))
  return jsonResponse({ ok: true, token, isAdmin: true, email: adminEmail })
}
