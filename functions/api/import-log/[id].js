export async function onRequestGet({ env, params }) {
  const logId = params.id
  const { results } = await env.DB.prepare(
    'SELECT * FROM import_log WHERE id = ?'
  ).bind(logId).all()

  if (results.length === 0) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }

  const log = results[0]
  return new Response(JSON.stringify({
    ...log,
    by_show: JSON.parse(log.by_show || '{}'),
    posts: JSON.parse(log.posts || '[]'),
  }), { headers: { 'Content-Type': 'application/json' } })
}
