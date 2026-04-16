/**
 * Cloudflare Pages Function — Sprout Social API proxy
 * Handles automatic metric validation and retry on invalid metrics.
 */

const CORS = { 'Content-Type': 'application/json' }

// Metrics confirmed valid - server-side so we can update without client deploy
const SAFE_METRICS = [
  'lifetime.impressions',
  'lifetime.engagements',
  'lifetime.video_views',
  'lifetime.likes',
]

export async function onRequestGet({ request, env }) {
  return proxyRequest(request, env, 'GET', null)
}

export async function onRequestPost({ request, env }) {
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

  // Only apply smart retry logic to analytics/posts
  if (!path.includes('analytics/posts')) {
    const body = await request.text()
    return proxyRequest(request, env, 'POST', body)
  }

  let body
  try { body = await request.json() } catch { body = {} }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  const sproutUrl = `https://api.sproutsocial.com/v1/${customerId}/${path}`

  // Try with requested metrics, then fall back to safe ones if needed
  let metrics = body.metrics || SAFE_METRICS
  let attempts = 0

  while (attempts < 3) {
    attempts++
    const payload = { ...body, metrics }

    try {
      const res = await fetch(sproutUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      // If invalid metrics error, strip them out and retry
      if (res.status === 400 && typeof data.error === 'string' && data.error.includes('invalid metrics')) {
        const invalidMatch = data.error.match(/invalid metrics?:\s*(.+)/i)
        if (invalidMatch) {
          const invalidList = invalidMatch[1].split(',').map(m => m.trim())
          metrics = metrics.filter(m => !invalidList.includes(m))
          if (metrics.length === 0) {
            return new Response(JSON.stringify({ error: 'No valid metrics available for this Sprout plan.' }), { status: 400, headers: CORS })
          }
          continue // retry with cleaned metrics
        }
      }

      return new Response(JSON.stringify(data), { status: res.status, headers: CORS })
    } catch (err) {
      return new Response(JSON.stringify({ error: `Proxy error: ${err.message}` }), { status: 502, headers: CORS })
    }
  }

  return new Response(JSON.stringify({ error: 'Failed after retries.' }), { status: 400, headers: CORS })
}

async function proxyRequest(request, env, method, body) {
  const token = env.SPROUT_API_TOKEN
  const customerId = env.SPROUT_CUSTOMER_ID

  if (!token || !customerId) {
    return new Response(JSON.stringify({ error: 'SPROUT_API_TOKEN or SPROUT_CUSTOMER_ID not configured.' }), { status: 503, headers: CORS })
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
    return new Response(JSON.stringify({ error: `Proxy error: ${err.message}` }), { status: 502, headers: CORS })
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
