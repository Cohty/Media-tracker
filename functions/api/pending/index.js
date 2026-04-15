import { requireAuth, jsonResponse } from '../../_auth.js'

// GET /api/pending — admin only, list all pending submissions
export async function onRequestGet({ request, env }) {
  const { error, user } = requireAuth(request, env)
  if (error) return error
  if (!user.isAdmin) return jsonResponse({ error: 'Forbidden' }, 403)

  const { results } = await env.DB.prepare(
    `SELECT * FROM pending_posts WHERE status = 'pending' ORDER BY submitted_at ASC`
  ).all()

  const pending = results.map(row => ({
    id: row.id,
    action: row.action,
    postId: row.post_id,
    payload: JSON.parse(row.payload),
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
  }))

  // For 'edit' and 'delete' actions, also fetch the original post for context
  const postIds = [...new Set(pending.filter(p => p.postId).map(p => p.postId))]
  let originals = {}
  if (postIds.length > 0) {
    const placeholders = postIds.map(() => '?').join(',')
    const { results: orig } = await env.DB.prepare(
      `SELECT id, title, show_name, platform, url FROM posts WHERE id IN (${placeholders})`
    ).bind(...postIds).all()
    orig.forEach(p => { originals[p.id] = p })
  }

  const enriched = pending.map(p => ({
    ...p,
    originalPost: p.postId ? originals[p.postId] || null : null
  }))

  return jsonResponse(enriched)
}
