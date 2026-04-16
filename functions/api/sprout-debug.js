const CORS = { 'Content-Type': 'application/json' }
const PROFILE_ID = 7399621
const BASE_URL = 'https://api.sproutsocial.com/v1'

export async function onRequestGet({ request, env }) {
  const token = env.SPROUT_API_TOKEN
  const customerId = env.SPROUT_CUSTOMER_ID
  if (!token || !customerId) return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 503, headers: CORS })

  const now = new Date()
  const start = new Date(now); start.setDate(now.getDate() - 30)
  const fmt = d => d.toISOString().split('.')[0]
  const s = fmt(start), e = fmt(now)
  const dateFilter = `created_time:between:${s},${e}`

  const auth = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }
  const base = `${BASE_URL}/${customerId}/analytics/posts`
  const results = []

  async function test(label, body) {
    try {
      const r = await fetch(base, { method: 'POST', headers: auth, body: JSON.stringify(body) })
      const text = await r.text()
      let data; try { data = JSON.parse(text) } catch { data = text }
      results.push({ test: label, status: r.status, data })
    } catch(err) {
      results.push({ test: label, error: err.message })
    }
  }

  // CONFIRMED: filters is array of strings, created_time:between:X,Y works
  // NEED TO FIND: correct customer_profile_id string format

  await test('eq operator', {
    filters: [`customer_profile_id:eq:${PROFILE_ID}`, dateFilter],
    metrics: ['impressions'], page: 1, per_page: 5,
  })

  await test('no operator', {
    filters: [`customer_profile_id:${PROFILE_ID}`, dateFilter],
    metrics: ['impressions'], page: 1, per_page: 5,
  })

  await test('just the ID as string', {
    filters: [String(PROFILE_ID), dateFilter],
    metrics: ['impressions'], page: 1, per_page: 5,
  })

  await test('in with pipe separator', {
    filters: [`customer_profile_id:in:${PROFILE_ID}|7399622`, dateFilter],
    metrics: ['impressions'], page: 1, per_page: 5,
  })

  await test('in with brackets', {
    filters: [`customer_profile_id:in:[${PROFILE_ID}]`, dateFilter],
    metrics: ['impressions'], page: 1, per_page: 5,
  })

  await test('equals sign format', {
    filters: [`customer_profile_id=${PROFILE_ID}`, dateFilter],
    metrics: ['impressions'], page: 1, per_page: 5,
  })

  // Try all profile IDs at once with comma
  const allIds = '7399621,7399622,7399624,7399629,7399638,7399761,7400399,7400657,7407559'
  await test('in with all IDs comma-separated', {
    filters: [`customer_profile_id:in:${allIds}`, dateFilter],
    metrics: ['impressions'], page: 1, per_page: 5,
  })

  return new Response(JSON.stringify({ results }, null, 2), { headers: CORS })
}
