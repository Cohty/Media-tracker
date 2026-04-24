import { requireAuth, jsonResponse } from '../../../_auth.js'
import { findDuplicate } from '../../../_normalize.js'

export async function onRequestPost({ params, request, env }) {
  const { error, user } = requireAuth(request, env)
  if (error) return error
  if (!user.isAdmin) return jsonResponse({ error: 'Forbidden' }, 403)

  const pendingId = params.id
  const { decision, note, overridePayload } = await request.json() // decision: 'approve' | 'reject'

  const { results } = await env.DB.prepare(
    `SELECT * FROM pending_posts WHERE id = ? AND status = 'pending'`
  ).bind(pendingId).all()

  if (results.length === 0) return jsonResponse({ error: 'Not found or already reviewed' }, 404)
  const pending = results[0]
  // Use overridePayload if admin edited the submission before approving
  const payload = overridePayload || JSON.parse(pending.payload)

  if (decision === 'approve') {
    if (pending.action === 'add') {
      // Dedupe check — admin may have logged the same URL while submission was pending
      const dup = await findDuplicate(env, payload.url)
      if (dup) {
        // Auto-reject instead of creating a duplicate
        await env.DB.prepare(`
          UPDATE pending_posts SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, review_note = ?
          WHERE id = ?
        `).bind(user.email, Date.now(), `Auto-rejected: duplicate of post ${dup.id}`, pendingId).run()
        return jsonResponse({ ok: false, status: 'duplicate', duplicate: dup }, 409)
      }
      await env.DB.prepare(`
        INSERT INTO posts
          (id, url, title, show_name, platform, media_type, episode_number, clip_index,
           post_date, ts, stats_views, stats_engagement, stats_impressions, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        payload.id, payload.url, payload.title, payload.show, payload.platform,
        payload.mediaType || null, payload.episodeNumber || null, payload.clipIndex || null,
        payload.date, payload.ts, null, null, null, pending.submitted_by, Date.now()
      ).run()

    } else if (pending.action === 'edit') {
      const fieldMap = {
        url: 'url', title: 'title', show: 'show_name', platform: 'platform',
        mediaType: 'media_type', episodeNumber: 'episode_number', clipIndex: 'clip_index',
      }
      const sets = []; const vals = []
      if (payload.stats) {
        if (payload.stats.views !== undefined) { sets.push('stats_views = ?'); vals.push(payload.stats.views) }
        if (payload.stats.engagement !== undefined) { sets.push('stats_engagement = ?'); vals.push(payload.stats.engagement) }
        if (payload.stats.impressions !== undefined) { sets.push('stats_impressions = ?'); vals.push(payload.stats.impressions) }
      }
      Object.keys(fieldMap).forEach(f => {
        if (payload[f] !== undefined) { sets.push(`${fieldMap[f]} = ?`); vals.push(payload[f]) }
      })
      if (sets.length > 0) {
        vals.push(pending.post_id)
        await env.DB.prepare(`UPDATE posts SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run()
      }

    } else if (pending.action === 'delete') {
      await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(pending.post_id).run()
    }
  }

  // Mark as reviewed regardless of approve/reject
  await env.DB.prepare(`
    UPDATE pending_posts SET status = ?, reviewed_by = ?, reviewed_at = ?, review_note = ?
    WHERE id = ?
  `).bind(decision === 'approve' ? 'approved' : 'rejected', user.email, Date.now(), note || null, pendingId).run()

  return jsonResponse({ ok: true, decision })
}
