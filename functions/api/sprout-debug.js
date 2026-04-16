const CORS = { 'Content-Type': 'application/json' }
const ALL_IDS = [7399621, 7399622, 7399624, 7399629, 7399638, 7399761, 7400399, 7400657, 7407559]

export async function onRequestGet({ request, env }) {
  const token = env.SPROUT_API_TOKEN
  const customerId = env.SPROUT_CUSTOMER_ID
  if (!token || !customerId) return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 503, headers: CORS })

  const now = new Date()
  const start = new Date(now); start.setDate(now.getDate() - 30)
  const fmt = d => d.toISOString().split('.')[0]

  const auth = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }
  const base = `https://api.sproutsocial.com/v1/${customerId}/analytics/posts`

  const payload = {
    filters: [
      `customer_profile_id.eq(${ALL_IDS.join(', ')})`,
      `created_time.in(${fmt(start)}..${fmt(now)})`,
    ],
    fields: ['perma_link', 'created_time', 'text'],
    metrics: ['lifetime.impressions', 'lifetime.engagements', 'lifetime.video_views'],
    page: 1,
    limit: 5,
  }

  const r = await fetch(base, { method: 'POST', headers: auth, body: JSON.stringify(payload) })
  const data = await r.json()
  return new Response(JSON.stringify({ status: r.status, payload, data }, null, 2), { headers: CORS })
}
