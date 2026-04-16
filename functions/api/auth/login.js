const COOKIE_NAME = 'mt_session'
const EMAIL_COOKIE = 'mt_email'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

async function hashPassword(password, secret) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(password))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function cookieHeader(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`
}

export async function onRequestPost({ request, env }) {
  const { email, password } = await request.json().catch(() => ({}))

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 })
  }

  const sitePassword = env.SITE_PASSWORD
  if (!sitePassword) {
    return new Response(JSON.stringify({ error: 'No password configured' }), { status: 503 })
  }

  // Check password
  if (password !== sitePassword) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })
  }

  // Check email is in allowed list
  const allowedEmails = (env.ALLOWED_EMAILS || env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase())
  if (!allowedEmails.includes(email.toLowerCase())) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })
  }

  const sessionToken = await hashPassword(sitePassword, sitePassword + '_session')

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': [
        cookieHeader(COOKIE_NAME, sessionToken, COOKIE_MAX_AGE),
        cookieHeader(EMAIL_COOKIE, encodeURIComponent(email.toLowerCase()), COOKIE_MAX_AGE),
      ].join(', ')
    }
  })
}
