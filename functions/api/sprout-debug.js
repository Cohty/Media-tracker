/**
 * Debug endpoint — returns raw Sprout API responses
 * GET /api/sprout-debug?test=profiles   → shows profile response
 * GET /api/sprout-debug?test=analytics  → shows analytics response with minimal payload
 */

const CORS = { 'Content-Type': 'application/json' }

export async function onRequestGet({ request, env }) {
  const token = env.SPROUT_API_TOKEN
  const customerId = env.SPROUT_CUSTOMER_ID

  if (!token || !customerId) {
    return new Response(JSON.stringify({ error: 'Missing SPROUT_API_TOKEN or SPROUT_CUSTOMER_ID' }), { status: 503, headers: CORS })
  }

  const url = new URL(request.url)
  const test = url.searchParams.get('test') || 'profiles'

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  try {
    if (test === 'profiles') {
      // Try both profile endpoints and return both results
      const [r1, r2] = await Promise.all([
        fetch(`https://api.sproutsocial.com/v1/${customerId}/metadata/customer/profiles`, { headers }),
        fetch(`https://api.sproutsocial.com/v1/${customerId}/metadata/customer`, { headers }),
      ])
      const [d1, d2] = await Promise.all([r1.json(), r2.json()])
      return new Response(JSON.stringify({
        profiles_endpoint: { status: r1.status, data: d1 },
        customer_endpoint: { status: r2.status, data: d2 },
      }, null, 2), { headers: CORS })
    }

    if (test === 'analytics') {
      // Try the most minimal possible analytics payload
      // First get profile IDs from the profile endpoint
      const pr = await fetch(`https://api.sproutsocial.com/v1/${customerId}/metadata/customer/profiles`, { headers })
      const pd = await pr.json()

      // Try to extract any profile ID we can find
      const anyId = findAnyId(pd)

      const now = new Date()
      const start = new Date(now); start.setDate(now.getDate() - 30)
      const fmt = d => d.toISOString().split('.')[0]

      // Test 3 different payload structures
      const payloads = [
        // Structure A: start_time/end_time top-level, filter with integer array
        { start_time: fmt(start), end_time: fmt(now), filters: [{ field: 'customer_profile_id', operator: 'in', value: anyId ? [Number(anyId)] : [0] }], metrics: ['impressions'], page: 1, per_page: 5 },
        // Structure B: start_time/end_time inside filter
        { filters: [{ field: 'customer_profile_id', operator: 'in', value: anyId ? [Number(anyId)] : [0] }, { field: 'created_time', operator: 'between', value: { start: fmt(start), end: fmt(now) } }], metrics: ['impressions'], page: 1, per_page: 5 },
        // Structure C: string IDs
        { start_time: fmt(start), end_time: fmt(now), filters: [{ field: 'customer_profile_id', operator: 'in', value: anyId ? [String(anyId)] : ['0'] }], metrics: ['impressions'], page: 1, per_page: 5 },
      ]

      const results = []
      for (let i = 0; i < payloads.length; i++) {
        const r = await fetch(`https://api.sproutsocial.com/v1/${customerId}/analytics/posts`, {
          method: 'POST', headers, body: JSON.stringify(payloads[i])
        })
        const d = await r.json()
        results.push({ structure: String.fromCharCode(65 + i), status: r.status, payload: payloads[i], response: d })
      }

      return new Response(JSON.stringify({ profilesRaw: pd, anyIdFound: anyId, analyticsTests: results }, null, 2), { headers: CORS })
    }

    return new Response(JSON.stringify({ error: 'Unknown test' }), { status: 400, headers: CORS })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
}

function findAnyId(data) {
  // Recursively search for the first numeric-looking ID in the response
  if (!data || typeof data !== 'object') return null
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findAnyId(item)
      if (found) return found
    }
  } else {
    if (data.id && String(data.id).length > 3) return data.id
    if (data.customer_profile_id) return data.customer_profile_id
    for (const key of Object.keys(data)) {
      const found = findAnyId(data[key])
      if (found) return found
    }
  }
  return null
}
