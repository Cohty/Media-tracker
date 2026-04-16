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

  const auth = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }
  const base = `${BASE_URL}/${customerId}/analytics/posts`
  const results = []

  async function test(label, body) {
    try {
      const r = await fetch(base, { method: 'POST', headers: auth, body: JSON.stringify(body) })
      const text = await r.text()
      let data; try { data = JSON.parse(text) } catch { data = text }
      results.push({ test: label, status: r.status, body, data })
    } catch(err) {
      results.push({ test: label, error: err.message })
    }
  }

  // Based on debug results:
  // - No filters → parses OK, validation fails with "must have created_time filter"
  // - filters as [{field,operator,value}] objects → JSON deserialization fails (START_OBJECT)
  // Conclusion: filters must NOT be an array of objects. Try other formats:

  // 1. filters as array of strings (colon-separated)
  await test('filters as colon strings', {
    filters: [`customer_profile_id:in:${PROFILE_ID}`, `created_time:between:${s},${e}`],
    metrics: ['impressions', 'engagements'],
    page: 1, per_page: 5,
  })

  // 2. filters as plain object map
  await test('filters as object map', {
    filters: {
      customer_profile_id: [PROFILE_ID],
      created_time: { start: s, end: e },
    },
    metrics: ['impressions'],
    page: 1, per_page: 5,
  })

  // 3. Top-level fields with created_time as object
  await test('top-level with created_time object', {
    customer_profile_id: [PROFILE_ID],
    created_time: { start: s, end: e },
    metrics: ['impressions'],
    page: 1, per_page: 5,
  })

  // 4. Top-level fields with created_time as string range
  await test('top-level with created_time string', {
    customer_profile_id: [PROFILE_ID],
    created_time: `${s},${e}`,
    metrics: ['impressions'],
    page: 1, per_page: 5,
  })

  // 5. filters as array of {field, value} only (no operator)
  await test('filters no operator', {
    filters: [
      { field: 'customer_profile_id', value: [PROFILE_ID] },
      { field: 'created_time', value: [s, e] },
    ],
    metrics: ['impressions'],
    page: 1, per_page: 5,
  })

  // 6. filters value as string not array (the START_OBJECT hint suggests value expects String)
  await test('filters value as string', {
    filters: [
      { field: 'customer_profile_id', operator: 'in', value: String(PROFILE_ID) },
      { field: 'created_time', operator: 'between', value: `${s},${e}` },
    ],
    metrics: ['impressions'],
    page: 1, per_page: 5,
  })

  // 7. created_time filter separate from profile filter, both as strings
  await test('all filter values as strings', {
    filters: [
      { field: 'customer_profile_id', operator: 'eq', value: String(PROFILE_ID) },
      { field: 'created_time', operator: 'gte', value: s },
    ],
    metrics: ['impressions'],
    page: 1, per_page: 5,
  })

  return new Response(JSON.stringify({ results }, null, 2), { headers: CORS })
}
