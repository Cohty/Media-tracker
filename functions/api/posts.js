import { requireAuth, jsonResponse } from '../_auth.js'

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM posts ORDER BY ts DESC`
  ).all()

  const posts = results.map(row => ({
    id: row.id,
    url: row.url,
    title: row.title,
    show: row.show_name,
    platform: row.platform,
    mediaType: row.media_type,
    episodeNumber: row.episode_number,
    clipIndex: row.clip_index,
    date: row.post_date,
    ts: row.ts,
    stats: {
      views: row.stats_views || '',
      engagement: row.stats_engagement || '',
      impressions: row.stats_impressions || '',
    },
    videoViews: row.stats_video_views || '',
    xImpressions: row.stats_x_impressions || '',
    createdBy: row.created_by,
    syncUrl: row.sync_url || '',
  }))

  return jsonResponse(posts)
}

export async function onRequestPost({ request, env }) {
  const { error, user } = requireAuth(request, env)
  if (error) return error

  const body = await request.json()

  if (user.isAdmin) {
    // Admin: write directly to posts
    await env.DB.prepare(`
      INSERT INTO posts
        (id, url, title, show_name, platform, media_type, episode_number, clip_index,
         post_date, ts, stats_views, stats_engagement, stats_impressions, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.id, body.url, body.title, body.show, body.platform,
      body.mediaType || null, body.episodeNumber || null, body.clipIndex || null,
      body.date, body.ts, null, null, null, user.email, Date.now()
    ).run()
    return jsonResponse({ ok: true, status: 'published' })
  } else {
    // Contributor: goes to pending
    const pendingId = `pnd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    await env.DB.prepare(`
      INSERT INTO pending_posts (id, action, post_id, payload, submitted_by, submitted_at, status)
      VALUES (?, 'add', null, ?, ?, ?, 'pending')
    `).bind(pendingId, JSON.stringify(body), user.email, Date.now()).run()
    return jsonResponse({ ok: true, status: 'pending_review' })
  }
}

export async function onRequestDelete({ request, env }) {
  const { ids } = await request.json().catch(() => ({}))
  if (!Array.isArray(ids) || ids.length === 0) {
    return new Response(JSON.stringify({ error: 'No ids provided' }), { status: 400 })
  }
  const placeholders = ids.map(() => '?').join(',')
  await env.DB.prepare(`DELETE FROM posts WHERE id IN (${placeholders})`).bind(...ids).run()
  return new Response(JSON.stringify({ ok: true, deleted: ids.length }), { headers: { 'Content-Type': 'application/json' } })
}

export async function onRequestPatch({ request, env }) {
  const { ids, updates } = await request.json().catch(() => ({}))
  if (!Array.isArray(ids) || ids.length === 0 || !updates) {
    return new Response(JSON.stringify({ error: 'No ids or updates provided' }), { status: 400 })
  }
  const fieldMap = { show: 'show_name', mediaType: 'media_type', episodeNumber: 'episode_number' }
  const sets = [], vals = []
  Object.entries(updates).forEach(([k, v]) => {
    if (fieldMap[k]) { sets.push(`${fieldMap[k]} = ?`); vals.push(v) }
  })
  if (sets.length === 0) return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  const placeholders = ids.map(() => '?').join(',')
  await env.DB.prepare(`UPDATE posts SET ${sets.join(', ')} WHERE id IN (${placeholders})`).bind(...vals, ...ids).run()
  return new Response(JSON.stringify({ ok: true, updated: ids.length }), { headers: { 'Content-Type': 'application/json' } })
}
