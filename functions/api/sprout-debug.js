const CORS = { 'Content-Type': 'application/json' }
const PROFILE_ID = 7399621
const ALL_IDS = [7399621, 7399622, 7399624, 7399629, 7399638, 7399761, 7400399, 7400657, 7407559]
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

  // Key hypothesis: customer_profile_id is a TOP-LEVEL field, not inside filters[]
  await test('profile top-level array + date in filters', {
    customer_profile_id: ALL_IDS,
    filters: [dateFilter],
    metrics: ['impressions'], page: 1, per_page: 5,
  })

  await test('profile top-level single + date in filters', {
    customer_profile_id: PROFILE_ID,
    filters: [dateFilter],
    metrics: ['impressions'], page: 1, per_page: 5,
  })

  await test('profile_id (no customer_) + date in filters', {
    profile_id: ALL_IDS,
    filters: [dateFilter],
    metrics: ['impressions'], page: 1, per_page: 5,
  })

  // Maybe profile IDs go directly into filters array as integers
  await test('IDs as integers in filters array', {
    filters: [PROFILE_ID, dateFilter],
    metrics: ['impressions'], page: 1, per_page: 5,
  })

  // Maybe the correct filter format includes the operator differently
  await test('customer_profile_id:between format', {
    filters: [`customer_profile_id:between:${PROFILE_ID},${PROFILE_ID}`, dateFilter],
    metrics: ['impressions'], page: 1, per_page: 5,
  })

  // Try without any date filter - maybe date goes elsewhere
  await test('profile in filters, dates top-level', {
    filters: [`customer_profile_id:in:${PROFILE_ID}`],
    start_time: s,
    end_time: e,
    metrics: ['impressions'], page: 1, per_page: 5,
  })

  // Maybe it needs the field name from the docs exactly
  await test('customer_profile_ids plural', {
    customer_profile_ids: ALL_IDS,
    filters: [dateFilter],
    metrics: ['impressions'], page: 1, per_page: 5,
  })

  return new Response(JSON.stringify({ results }, null, 2), { headers: CORS })
}
