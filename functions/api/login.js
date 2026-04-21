import { jsonResponse } from '../_auth.js'

export async function onRequestPost({ request, env }) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return jsonResponse({ error: 'Email and password required' }, 400)
  }

  // Check password matches SITE_PASSWORD
  if (password !== env.SITE_PASSWORD) {
    return jsonResponse({ error: 'Invalid password' }, 401)
  }

  // Check email is in ALLOWED_EMAILS
  const allowed = (env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  if (!allowed.includes(email.toLowerCase()) && email.toLowerCase() !== env.ADMIN_EMAIL?.toLowerCase()) {
    return jsonResponse({ error: 'Email not authorized' }, 403)
  }

  // Set session cookie with email (base64 encoded, not secure but sufficient for internal tool)
  const session = btoa(JSON.stringify({ email: email.toLowerCase(), ts: Date.now() }))

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `mt_session=${session}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`, // 7 days
    }
  })
}

export async function onRequestDelete({ }) {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'mt_session=; Path=/; HttpOnly; Max-Age=0',
    }
  })
}
