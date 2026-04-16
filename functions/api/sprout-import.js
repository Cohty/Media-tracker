/**
 * POST /api/sprout-import
 * Fetches VIDEO posts from Sprout Social and imports them into D1.
 * Body: { days: 365, showName: 'Standalones', videoOnly: true }
 */

const CORS = { 'Content-Type': 'application/json' }

const PROFILE_IDS = [7399621, 7399622, 7399624, 7399629, 7399638, 7399761, 7400399, 7400657, 7407559]

// Video post types across platforms
const VIDEO_POST_TYPES = [
  'YOUTUBE_VIDEO',
  'TIKTOK_VIDEO',
  'INSTAGRAM_VIDEO',
  'INSTAGRAM_REEL',
  'FACEBOOK_VIDEO',
].join(',')

export async function onRequestPost({ request, env }) {
  const token = env.SPROUT_API_TOKEN
  const customerId = env.SPROUT_CUSTOMER_ID

  if (!token || !customerId) {
    return new Response(JSON.stringify({ error: 'Sprout not configured' }), { status: 503, headers: CORS })
  }

  const { days = 365, showName = 'Standalones', videoOnly = true } = await request.json().catch(() => ({}))

  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - Number(days))
  const fmt = d => d.toISOString().split('.')[0]

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  // Fetch existing URLs from D1 to avoid duplicates
  const { results: existing } = await env.DB.prepare('SELECT url FROM posts').all()
  const existingUrls = new Set(existing.map(r => normalizeUrl(r.url)))

  // Build filters
  const filters = [
    `customer_profile_id.eq(${PROFILE_IDS.join(', ')})`,
    `created_time.in(${fmt(start)}..${fmt(now)})`,
  ]
  if (videoOnly) {
    filters.push(`post_type.eq(${VIDEO_POST_TYPES})`)
  }

  // Fetch all Sprout posts paginated
  let allPosts = []
  let page = 1
  let totalPages = 1

  do {
    const payload = {
      filters,
      fields: ['perma_link', 'created_time', 'text', 'post_type'],
      metrics: ['lifetime.impressions', 'lifetime.engagements', 'lifetime.video_views', 'lifetime.likes'],
      page,
      limit: 200,
    }

    const res = await fetch(`https://api.sproutsocial.com/v1/${customerId}/analytics/posts`, {
      method: 'POST', headers, body: JSON.stringify(payload),
    })

    if (!res.ok) {
      // If post_type filter fails, retry without it
      if (videoOnly) {
        const payload2 = { ...payload, filters: filters.slice(0, 2) }
        const res2 = await fetch(`https://api.sproutsocial.com/v1/${customerId}/analytics/posts`, {
          method: 'POST', headers, body: JSON.stringify(payload2),
        })
        if (res2.ok) {
          const data2 = await res2.json()
          // Filter client-side for video URLs
          const posts = (data2?.data || []).filter(p => isVideoUrl(p.perma_link || p.permalink || ''))
          allPosts = allPosts.concat(posts)
          totalPages = data2?.paging?.total_pages || 1
          page++
          continue
        }
      }
      const err = await res.json().catch(() => ({}))
      return new Response(JSON.stringify({ error: err.error || `Sprout API ${res.status}` }), { status: 400, headers: CORS })
    }

    const data = await res.json()
    let posts = data?.data || []

    // If post_type filter not supported, filter by URL client-side
    if (videoOnly && !filters.some(f => f.includes('post_type'))) {
      posts = posts.filter(p => isVideoUrl(p.perma_link || p.permalink || ''))
    }

    allPosts = allPosts.concat(posts)
    totalPages = data?.paging?.total_pages || 1
    page++
  } while (page <= Math.min(totalPages, 50))

  // Insert new posts into D1
  let imported = 0
  let skipped = 0

  for (const sp of allPosts) {
    const permalink = sp.perma_link || sp.permalink || ''
    if (!permalink) { skipped++; continue }

    const normUrl = normalizeUrl(permalink)
    if (existingUrls.has(normUrl)) { skipped++; continue }

    const platform = detectPlatformFromUrl(permalink)
    const metrics = sp.metrics || {}
    const text = (sp.text || '').replace(/https?:\/\/\S+/g, '').trim()
    const title = text.length > 120 ? text.slice(0, 120) + '…'
      : text || permalink.split('/').pop() || permalink
    const createdAt = sp.created_time ? new Date(sp.created_time) : new Date()
    const dateStr = createdAt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    const id = `sprout_${createdAt.getTime()}_${Math.random().toString(36).slice(2, 6)}`

    // Determine media type from platform
    const mediaType = (platform === 'YouTube' || platform === 'TikTok') ? 'Full Episode' : 'Full Episode'

    try {
      await env.DB.prepare(`
        INSERT INTO posts
          (id, url, title, show_name, platform, media_type, episode_number, clip_index,
           post_date, ts, stats_views, stats_engagement, stats_impressions, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, permalink, title, showName, platform,
        mediaType, '', '',
        dateStr, createdAt.getTime(),
        String(metrics['lifetime.video_views'] || ''),
        String(metrics['lifetime.engagements'] || ''),
        String(metrics['lifetime.impressions'] || ''),
        'sprout-import', Date.now()
      ).run()

      existingUrls.add(normUrl)
      imported++
    } catch {
      skipped++
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    fetched: allPosts.length,
    imported,
    skipped,
    videoOnly,
  }), { headers: CORS })
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
  } catch {
    return url.toLowerCase().trim()
  }
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
