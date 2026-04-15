/**
 * Cloudflare Pages Function — Transistor API proxy
 * Keeps TRANSISTOR_API_KEY server-side, handles CORS.
 *
 * Set TRANSISTOR_API_KEY in Cloudflare Pages → Settings → Environment Variables.
 *
 * Usage from the browser:
 *   /api/transistor?path=shows
 *   /api/transistor?path=analytics/SHOW_ID&start_date=01-01-2026&end_date=15-04-2026
 *   /api/transistor?path=analytics/SHOW_ID/episodes
 *   /api/transistor?path=episodes&show_id=SHOW_ID
 */

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export async function onRequestGet({ request, env }) {
  const apiKey = env.TRANSISTOR_API_KEY

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'TRANSISTOR_API_KEY environment variable is not set.' }),
      { status: 503, headers: CORS }
    )
  }

  const url = new URL(request.url)
  const path = url.searchParams.get('path') || ''

  // Forward all other query params as-is to Transistor
  const forward = new URLSearchParams()
  for (const [k, v] of url.searchParams.entries()) {
    if (k !== 'path') forward.append(k, v)
  }

  const transistorUrl = `https://api.transistor.fm/v1/${path}${forward.toString() ? '?' + forward.toString() : ''}`

  try {
    const res = await fetch(transistorUrl, {
      headers: { 'x-api-key': apiKey, 'Accept': 'application/json' }
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
