const CORS = { 'Content-Type': 'application/json' }

// Real profile IDs from the user's Sprout account
const REAL_PROFILE_IDS = [7399621, 7399622, 7399624, 7399629, 7399638, 7399761, 7400399, 7400657, 7407559]

export async function onRequestGet({ request, env }) {
  const token = env.SPROUT_API_TOKEN
  const customerId = env.SPROUT_CUSTOMER_ID
  if (!token || !customerId) return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 503, headers: CORS })

  const url = new URL(request.url)
  const test = url.searchParams.get('test') || 'formats'

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  const now = new Date()
  const start = new Date(now); start.setDate(now.getDate() - 30)
  const fmt = d => d.toISOString().split('.')[0]

  const base = `https://api.sproutsocial.com/v1/${customerId}/analytics/posts`
  const results = []

  // Test 1: GET with query params
  const qp = new URLSearchParams({
    'filters[0][field]': 'customer_profile_id',
    'filters[0][operator]': 'in',
    'filters[0][value][]': String(REAL_PROFILE_IDS[0]),
    'start_time': fmt(start),
    'end_time': fmt(now),
    'metrics[]': 'impressions',
    'page': '1',
    'per_page': '5',
  })
  const r1 = await fetch(`${base}?${qp}`, { headers })
  results.push({ test: 'GET with query params', status: r1.status, response: await r1.json() })

  // Test 2: POST with bare minimum — no metrics at all
  const r2 = await fetch(base, {
    method: 'POST', headers,
    body: JSON.stringify({
      filters: [{ field: 'customer_profile_id', operator: 'in', value: [REAL_PROFILE_IDS[0]] }],
      start_time: fmt(start),
      end_time: fmt(now),
    })
  })
  results.push({ test: 'POST no metrics', status: r2.status, response: await r2.json() })

  // Test 3: POST with metrics as comma-separated string
  const r3 = await fetch(base, {
    method: 'POST', headers,
    body: JSON.stringify({
      filters: [{ field: 'customer_profile_id', operator: 'in', value: [REAL_PROFILE_IDS[0]] }],
      start_time: fmt(start),
      end_time: fmt(now),
      metrics: 'impressions,engagements',
    })
  })
  results.push({ test: 'POST metrics as string', status: r3.status, response: await r3.json() })

  // Test 4: POST with metrics as objects {metric_type: name}
  const r4 = await fetch(base, {
    method: 'POST', headers,
    body: JSON.stringify({
      filters: [{ field: 'customer_profile_id', operator: 'in', value: [REAL_PROFILE_IDS[0]] }],
      start_time: fmt(start),
      end_time: fmt(now),
      metrics: [{ metric_type: 'impressions' }],
    })
  })
  results.push({ test: 'POST metrics as objects', status: r4.status, response: await r4.json() })

  // Test 5: POST with network-prefixed metrics (e.g. twitter.impressions)
  const r5 = await fetch(base, {
    method: 'POST', headers,
    body: JSON.stringify({
      filters: [{ field: 'customer_profile_id', operator: 'in', value: [REAL_PROFILE_IDS[0]] }],
      start_time: fmt(start),
      end_time: fmt(now),
      metrics: ['twitter.impressions'],
    })
  })
  results.push({ test: 'POST network-prefixed metrics', status: r5.status, response: await r5.json() })

  return new Response(JSON.stringify({ results }, null, 2), { headers: CORS })
}
