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

  const authBearer = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  const authToken  = { 'Authorization': `Token ${token}`,  'Accept': 'application/json' }

  const base = `${BASE_URL}/${customerId}/analytics/posts`
  const results = []

  async function test(label, url, opts) {
    try {
      const r = await fetch(url, opts)
      const text = await r.text()
      let data; try { data = JSON.parse(text) } catch { data = text }
      results.push({ test: label, status: r.status, data })
    } catch(err) {
      results.push({ test: label, error: err.message })
    }
  }

  // 1. Form-encoded body (application/x-www-form-urlencoded)
  const formBody = new URLSearchParams({
    'filters[0][field]': 'customer_profile_id',
    'filters[0][operator]': 'in',
    'filters[0][value][0]': String(PROFILE_ID),
    start_time: s,
    end_time: e,
    'metrics[0]': 'impressions',
    page: '1',
    per_page: '5',
  })
  await test('POST form-encoded', base, {
    method: 'POST',
    headers: { ...authBearer, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody.toString(),
  })

  // 2. JSON but completely flat — no nested objects
  await test('POST flat JSON (no objects)', base, {
    method: 'POST',
    headers: { ...authBearer, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_profile_id: PROFILE_ID,
      start_time: s,
      end_time: e,
      metrics: 'impressions',
    }),
  })

  // 3. JSON with customer_profile_id as comma-separated string
  await test('POST profile as string', base, {
    method: 'POST',
    headers: { ...authBearer, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_profile_id: String(PROFILE_ID),
      start_time: s,
      end_time: e,
      metrics: ['impressions'],
    }),
  })

  // 4. POST with Authorization: Token (not Bearer)
  await test('POST Token auth (not Bearer)', base, {
    method: 'POST',
    headers: { ...authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: [{ field: 'customer_profile_id', operator: 'in', value: [PROFILE_ID] }],
      start_time: s,
      end_time: e,
      metrics: ['impressions'],
    }),
  })

  // 5. JSON with filters as a JSON string (not array)
  await test('POST filters as JSON string', base, {
    method: 'POST',
    headers: { ...authBearer, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: JSON.stringify([{ field: 'customer_profile_id', operator: 'in', value: [PROFILE_ID] }]),
      start_time: s,
      end_time: e,
      metrics: ['impressions'],
    }),
  })

  // 6. POST with query params + empty body
  const qs = new URLSearchParams({ start_time: s, end_time: e })
  await test('POST query params + JSON body', `${base}?${qs}`, {
    method: 'POST',
    headers: { ...authBearer, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: [{ field: 'customer_profile_id', operator: 'in', value: [PROFILE_ID] }],
      metrics: ['impressions'],
    }),
  })

  // 7. Try the profile analytics endpoint instead (GET)
  await test('GET profile analytics (different endpoint)', `${BASE_URL}/${customerId}/analytics`, {
    method: 'GET',
    headers: authBearer,
  })

  return new Response(JSON.stringify({ results }, null, 2), { headers: CORS })
}
