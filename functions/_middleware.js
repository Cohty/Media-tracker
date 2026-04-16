import { getLoginPage } from './_login-page.js'

const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/logout']
const COOKIE_NAME = 'mt_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || ''
  const match = header.split(';').map(c => c.trim()).find(c => c.startsWith(name + '='))
  return match ? match.slice(name.length + 1) : null
}

async function hashPassword(password, secret) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(password))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function onRequest(context) {
  const { request, next, env } = context
  const url = new URL(request.url)

  // Always allow public auth paths
  if (PUBLIC_PATHS.some(p => url.pathname.startsWith(p))) {
    return next()
  }

  const sitePassword = env.SITE_PASSWORD
  if (!sitePassword) {
    // No password set — allow through (dev mode)
    return next()
  }

  const sessionToken = getCookie(request, COOKIE_NAME)
  const expectedToken = await hashPassword(sitePassword, sitePassword + '_session')

  if (sessionToken === expectedToken) {
    // Valid session — inject email header for role detection
    const adminEmails = (env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase())
    // Get stored email from cookie
    const emailCookie = getCookie(request, 'mt_email') || ''
    const isAdmin = adminEmails.includes(emailCookie.toLowerCase())

    // Clone request with auth headers for our API functions
    const modifiedRequest = new Request(request, {
      headers: (() => {
        const h = new Headers(request.headers)
        if (emailCookie) h.set('cf-access-authenticated-user-email', emailCookie)
        return h
      })()
    })
    return next(modifiedRequest)
  }

  // Not authenticated — show login page for HTML requests, 401 for API
  if (url.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(getLoginPage(), {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  })
}
