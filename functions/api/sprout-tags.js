export async function onRequestGet({ env }) {
  const token = env.SPROUT_API_TOKEN
  const customerId = env.SPROUT_CUSTOMER_ID
  if (!token || !customerId) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
  }
  const res = await fetch(`https://api.sproutsocial.com/v1/${customerId}/metadata/customer/tags`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
