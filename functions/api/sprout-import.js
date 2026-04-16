/**
 * POST /api/sprout-import
 * Fetches all Sprout posts for a date range and imports them into D1.
 * Body: { days: 365, showName: 'Standalones' }
 */

const CORS = { 'Content-Type': 'application/json' }

const NETWORK_TO_PLATFORM = {
  twitter:               'X',
  youtube:               'YouTube',
  linkedin_company:      'LinkedIn',
  fb_instagram_account:  'Instagram',
  tiktok:                'TikTok',
  facebook:              'Other',
  threads:               'Other',
}

const PROFILE_IDS = [7399621, 7399622, 7399624, 7399629, 7399638, 7399761, 7400399, 7400657, 7407559]

export async function onRequestPost({ request, env }) {
  const token = env.SPROUT_API_TOKEN
  const customerId = env.SPROUT_CUSTOMER_ID

  if (!token || !customerId) {
    return new Response(JSON.stringify({ error: 'Sprout not configured' }), { status: 503, headers: CORS })
  }

  const { days = 365, showName = 'Standalones' } = await request.json().catch(() => ({}))

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

  // Fetch all Sprout posts paginated
  let allPosts = []
  let page = 1
  let totalPages = 1

  do {
    const payload = {
      filters: [
        `customer_profile_id.eq(${PROFILE_IDS.join(', ')})`,
        `created_time.in(${fmt(start)}..${fmt(now)})`,
      ],
      fields: ['perma_link', 'created_time', 'text', 'network'],
      metrics: ['lifetime.impressions', 'lifetime.engagements', 'lifetime.video_views', 'lifetime.likes'],
      page,
      limit: 200,
    }

    const res = await fetch(`https://api.sproutsocial.com/v1/${customerId}/analytics/posts`, {
      method: 'POST', headers, body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return new Response(JSON.stringify({ error: err.error || `Sprout API ${res.status}` }), { status: 400, headers: CORS })
    }

    const data = await res.json()
    allPosts = allPosts.concat(data?.data || [])
    totalPages = data?.paging?.total_pages || 1
    page++
  } while (page <= Math.min(totalPages, 50)) // cap at 50 pages = 10,000 posts

  // Build Sprout profile ID → network_type map
  const profileRes = await fetch(`https://api.sproutsocial.com/v1/${customerId}/metadata/customer`, { headers })
  const profileData = await profileRes.json()
  const profiles = profileData?.data || []

  // Insert new posts into D1
  let imported = 0
  let skipped = 0

  for (const sp of allPosts) {
    const permalink = sp.perma_link || sp.permalink || ''
    if (!permalink) { skipped++; continue }

    const normUrl = normalizeUrl(permalink)
    if (existingUrls.has(normUrl)) { skipped++; continue }

    // Determine platform from URL
    const platform = detectPlatformFromUrl(permalink)
    const metrics = sp.metrics || {}
    const text = sp.text || ''
    const title = text.length > 120 ? text.slice(0, 120) + '…' : text || permalink
    const createdAt = sp.created_time ? new Date(sp.created_time) : new Date()
    const dateStr = createdAt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    const id = `sprout_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    try {
      await env.DB.prepare(`
        INSERT INTO posts
          (id, url, title, show_name, platform, media_type, episode_number, clip_index,
           post_date, ts, stats_views, stats_engagement, stats_impressions, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, permalink, title, showName, platform,
        'Full Episode', '', '',
        dateStr, createdAt.getTime(),
        String(metrics['lifetime.video_views'] || metrics['lifetime.impressions'] || ''),
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
  }), { headers: CORS })
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
