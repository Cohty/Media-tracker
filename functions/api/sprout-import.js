const CORS = { 'Content-Type': 'application/json' }
const PROFILE_IDS = [7399621, 7399622, 7399624, 7399629, 7399638, 7399761, 7400399, 7400657, 7407559]
const VIDEO_POST_TYPES = 'YOUTUBE_VIDEO,TIKTOK_VIDEO,INSTAGRAM_VIDEO,INSTAGRAM_REEL,FACEBOOK_VIDEO'

export async function onRequestPost({ request, env }) {
  const token = env.SPROUT_API_TOKEN
  const customerId = env.SPROUT_CUSTOMER_ID
  if (!token || !customerId) return new Response(JSON.stringify({ error: 'Sprout not configured' }), { status: 503, headers: CORS })

  const { days = 365, defaultShow = 'Standalones', videoOnly = true, tagMappings = [], useTagMapping = false }
    = await request.json().catch(() => ({}))

  const now = new Date()
  const start = new Date(now); start.setDate(now.getDate() - Number(days))
  const fmt = d => d.toISOString().split('.')[0]

  const auth = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }

  // Build tag_id → show lookup
  const tagToShow = {}
  tagMappings.forEach(({ tagId, showName }) => { tagToShow[tagId] = showName })

  // Get existing URLs
  const { results: existing } = await env.DB.prepare('SELECT url FROM posts').all()
  const existingUrls = new Set(existing.map(r => normalizeUrl(r.url)))

  // Build filters
  const baseFilters = [
    `customer_profile_id.eq(${PROFILE_IDS.join(', ')})`,
    `created_time.in(${fmt(start)}..${fmt(now)})`,
  ]

  let allPosts = [], page = 1, totalPages = 1

  do {
    const payload = {
      filters: baseFilters,
      fields: ['perma_link', 'created_time', 'text', 'post_type', 'internal.tags.id'],
      metrics: ['lifetime.impressions', 'lifetime.engagements', 'lifetime.video_views', 'lifetime.likes'],
      page, limit: 200,
    }

    const res = await fetch(`https://api.sproutsocial.com/v1/${customerId}/analytics/posts`, {
      method: 'POST', headers: auth, body: JSON.stringify(payload)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return new Response(JSON.stringify({ error: err.error || `Sprout ${res.status}` }), { status: 400, headers: CORS })
    }

    const data = await res.json()
    let posts = data?.data || []

    // Filter to video if requested
    if (videoOnly) posts = posts.filter(p => isVideoUrl(p.perma_link || p.permalink || ''))

    allPosts = allPosts.concat(posts)
    totalPages = data?.paging?.total_pages || 1
    page++
  } while (page <= Math.min(totalPages, 50))

  let imported = 0, skipped = 0, tagged = 0

  for (const sp of allPosts) {
    const permalink = sp.perma_link || sp.permalink || ''
    if (!permalink) { skipped++; continue }
    const normUrl = normalizeUrl(permalink)
    if (existingUrls.has(normUrl)) { skipped++; continue }

    // Determine show via tag mapping
    let showName = defaultShow
    if (useTagMapping && tagMappings.length > 0) {
      const postTagIds = (sp.internal?.tags || []).map(t => t.id)
      for (const tagId of postTagIds) {
        if (tagToShow[tagId]) { showName = tagToShow[tagId]; tagged++; break }
      }
    }

    const platform = detectPlatformFromUrl(permalink)
    const text = (sp.text || '').replace(/https?:\/\/\S+/g, '').trim()
    const title = text.length > 120 ? text.slice(0, 120) + '…' : text || permalink
    const createdAt = sp.created_time ? new Date(sp.created_time) : new Date()
    const dateStr = createdAt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    const id = `sprout_${createdAt.getTime()}_${Math.random().toString(36).slice(2, 6)}`
    const metrics = sp.metrics || {}

    try {
      await env.DB.prepare(`
        INSERT INTO posts (id, url, title, show_name, platform, media_type, episode_number, clip_index,
          post_date, ts, stats_views, stats_engagement, stats_impressions, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, permalink, title, showName, platform, 'Full Episode', '', '',
        dateStr, createdAt.getTime(),
        String(metrics['lifetime.video_views'] || ''),
        String(metrics['lifetime.engagements'] || ''),
        String(metrics['lifetime.impressions'] || ''),
        'sprout-import', Date.now()
      ).run()
      existingUrls.add(normUrl)
      imported++
    } catch { skipped++ }
  }

  return new Response(JSON.stringify({ ok: true, fetched: allPosts.length, imported, skipped, tagged }), { headers: CORS })
}

function isVideoUrl(url) {
  const u = url.toLowerCase()
  return u.includes('youtube.com') || u.includes('youtu.be') || u.includes('tiktok.com')
    || u.includes('instagram.com/reel') || u.includes('instagram.com/p/')
}

function normalizeUrl(url) {
  try {
    const u = new URL(url.toLowerCase().trim())
    u.hostname = u.hostname.replace('x.com', 'twitter.com')
    u.search = ''
    return u.toString().replace(/\/$/, '')
  } catch { return url.toLowerCase().trim() }
}

function detectPlatformFromUrl(url) {
  const u = url.toLowerCase()
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube'
  if (u.includes('x.com') || u.includes('twitter.com')) return 'X'
  if (u.includes('linkedin.com')) return 'LinkedIn'
  if (u.includes('instagram.com')) return 'Instagram'
  if (u.includes('tiktok.com')) return 'TikTok'
  return 'Other'
}
