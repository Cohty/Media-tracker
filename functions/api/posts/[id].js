import { requireAuth, jsonResponse } from '../../_auth.js'

export async function onRequestPatch({ params, request, env }) {
  const { error, user } = requireAuth(request, env)
  if (error) return error

  const postId = params.id
  const body = await request.json()

  if (user.isAdmin) {
    // Build dynamic SET clause from provided fields
    const fieldMap = {
      url: 'url', title: 'title', show: 'show_name', platform: 'platform',
      mediaType: 'media_type', episodeNumber: 'episode_number', clipIndex: 'clip_index', syncUrl: 'sync_url', date: 'post_date', ts: 'ts', videoViews: 'stats_video_views', xImpressions: 'stats_x_impressions',
      'stats.views': 'stats_views', 'stats.engagement': 'stats_engagement',
      'stats.impressions': 'stats_impressions',
    }

    const sets = []
    const vals = []

    // Flatten stats if present
    if (body.stats) {
      if (body.stats.views !== undefined) { sets.push('stats_views = ?'); vals.push(body.stats.views) }
      if (body.stats.engagement !== undefined) { sets.push('stats_engagement = ?'); vals.push(body.stats.engagement) }
      if (body.stats.impressions !== undefined) { sets.push('stats_impressions = ?'); vals.push(body.stats.impressions) }
    }

    const directFields = ['url', 'title', 'show', 'platform', 'mediaType', 'episodeNumber', 'clipIndex', 'syncUrl', 'date', 'ts', 'videoViews', 'xImpressions']
    directFields.forEach(f => {
      if (body[f] !== undefined) {
        sets.push(`${fieldMap[f]} = ?`)
        vals.push(body[f])
      }
    })

    if (sets.length === 0) return jsonResponse({ ok: true })

    vals.push(postId)
    await env.DB.prepare(`UPDATE posts SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...vals).run()
    return jsonResponse({ ok: true, status: 'updated' })
  } else {
    // Contributor: submit edit for review
    const pendingId = `pnd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    await env.DB.prepare(`
      INSERT INTO pending_posts (id, action, post_id, payload, submitted_by, submitted_at, status)
      VALUES (?, 'edit', ?, ?, ?, ?, 'pending')
    `).bind(pendingId, postId, JSON.stringify(body), user.email, Date.now()).run()
    return jsonResponse({ ok: true, status: 'pending_review' })
  }
}

export async function onRequestDelete({ params, request, env }) {
  const { error, user } = requireAuth(request, env)
  if (error) return error

  const postId = params.id

  if (user.isAdmin) {
    // Get the URL before deleting so we can blacklist it
    const post = await env.DB.prepare('SELECT url FROM posts WHERE id = ?').bind(postId).first()
    await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(postId).run()
    // Track deleted URL to prevent re-import
    if (post?.url) {
      await env.DB.prepare(
        'INSERT OR REPLACE INTO deleted_urls (url, deleted_at) VALUES (?, ?)'
      ).bind(post.url, Date.now()).run()
    }
    return jsonResponse({ ok: true, status: 'deleted' })
  } else {
    const pendingId = `pnd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    await env.DB.prepare(`
      INSERT INTO pending_posts (id, action, post_id, payload, submitted_by, submitted_at, status)
      VALUES (?, 'delete', ?, '{}', ?, ?, 'pending')
    `).bind(pendingId, postId, user.email, Date.now()).run()
    return jsonResponse({ ok: true, status: 'pending_review' })
  }
}
