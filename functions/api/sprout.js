/**
 * Cloudflare Pages Function — Sprout Social API proxy
 * Requires env vars: SPROUT_API_TOKEN, SPROUT_CUSTOMER_ID
 *
 * Usage:
 *   GET  /api/sprout?path=metadata/customer          → get profiles
 *   POST /api/sprout?path=analytics/posts            → post analytics (body = Sprout filter payload)
 */

const CORS = { 'Content-Type': 'application/json' }

export async function onRequestGet({ request, env }) {
  return proxyRequest(request, env, 'GET', null)
}

export async function onRequestPost({ request, env }) {
  const body = await request.text()
  return proxyRequest(request, env, 'POST', body)
}

async function proxyRequest(request, env, method, body) {
  const token = env.SPROUT_API_TOKEN
  const customerId = env.SPROUT_CUSTOMER_ID

  if (!token || !customerId) {
    return new Response(
      JSON.stringify({ error: 'SPROUT_API_TOKEN or SPROUT_CUSTOMER_ID not configured.' }),
      { status: 503, headers: CORS }
    )
  }

  const url = new URL(request.url)
  const path = url.searchParams.get('path') || ''
  const sproutUrl = `https://api.sproutsocial.com/v1/${customerId}/${path}`

  try {
    const res = await fetch(sproutUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...(body ? { body } : {}),
    })
    const text = await res.text()
    return new Response(text, { status: res.status, headers: CORS })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Proxy error: ${err.message}` }),
      { status: 502, headers: CORS }
    )
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
