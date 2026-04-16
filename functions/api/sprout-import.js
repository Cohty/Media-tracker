const CORS = { 'Content-Type': 'application/json' }
const PROFILE_IDS = [7399621, 7399622, 7399624, 7399629, 7399638, 7399761, 7400399, 7400657, 7407559]

const COLLECTION_TO_SHOW = {
  'the crypto beat': 'The Crypto Beat', 'cryptobeat': 'The Crypto Beat',
  'the big brain podcast': 'The Big Brain Podcast', 'big brain podcast': 'The Big Brain Podcast', 'big brain': 'The Big Brain Podcast',
  'layer1': 'Layer One', 'layer 1': 'Layer One', 'layer one': 'Layer One',
  'the white papers': 'The White Papers', 'white papers': 'The White Papers',
  'standalones': 'Standalones', 'standalone': 'Standalones',
  'editorials': 'Editorials', 'editorial': 'Editorials',
  'newsroom clips': 'Standalones', 'around the block': 'Standalones',
  'the starting block': 'Standalones', 'cryptoiq': 'Standalones',
}

const TAG_PREFIXES = [
  { prefix: 'tcb', show: 'The Crypto Beat' },
  { prefix: 'bbp', show: 'The Big Brain Podcast' },
  { prefix: 'l1',  show: 'Layer One' },
  { prefix: 'wp',  show: 'The White Papers' },
  { prefix: 'sa',  show: 'Standalones' },
  { prefix: 'ed',  show: 'Editorials' },
]

function parseTag(tagText) {
  if (!tagText) return null
  const t = tagText.trim()
  for (const { prefix, show } of TAG_PREFIXES) {
    const m = t.match(new RegExp(`^${prefix}\\s*(\\d+)$`, 'i'))
    if (m) return { show, episode: String(parseInt(m[1], 10)), type: 'episode' }
  }
  const lower = t.toLowerCase()
  for (const [kw, show] of Object.entries(COLLECTION_TO_SHOW)) {
    if (lower === kw || lower.includes(kw)) return { show, episode: null, type: 'collection' }
  }
  return null
}

function resolveMediaType(platform, isEditorial) {
  if (isEditorial) return 'Article'
  if (platform === 'YouTube' || platform === 'TikTok') return 'Full Episode'
  if (platform === 'LinkedIn' || platform === 'Instagram') return 'Article'
  return 'Full Episode'
}

function normalizeUrl(url) {
  try {
    const u = new URL(url.toLowerCase().trim())
    u.hostname = u.hostname.replace('x.com', 'twitter.com')
    u.search = ''
    return u.toString().replace(/\/$/, '')
  } catch { return url.toLowerCase().trim() }
}

function detectPlatform(url) {
  const u = url.toLowerCase()
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube'
  if (u.includes('x.com') || u.includes('twitter.com')) return 'X'
  if (u.includes('linkedin.com')) return 'LinkedIn'
  if (u.includes('instagram.com')) return 'Instagram'
  if (u.includes('tiktok.com')) return 'TikTok'
  return 'Other'
}

export async function onRequestPost({ request, env }) {
  const token = env.SPROUT_API_TOKEN
  const customerId = env.SPROUT_CUSTOMER_ID
  if (!token || !customerId) {
    return new Response(JSON.stringify({ error: 'Sprout not configured' }), { status: 503, headers: CORS })
  }

  const { days = 365, videoOnly = false, filterPlatforms = [] } = await request.json().catch(() => ({}))

  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - Number(days))
  const fmt = d => d.toISOString().split('.')[0]
  const auth = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  // Load Sprout tags and build tag_id → {show, episode} map
  const tagMap = {}
  try {
    const tagRes = await fetch(`https://api.sproutsocial.com/v1/${customerId}/metadata/customer/tags`, { headers: auth })
    if (tagRes.ok) {
      const tagData = await tagRes.json()
      const tags = (tagData?.data || []).filter(t => t.active)
      tags.forEach(tag => {
        const parsed = parseTag(tag.text)
        if (parsed) tagMap[tag.tag_id] = parsed
      })
    }
  } catch {}

  // Get existing URLs to avoid duplicates
  const { results: existing } = await env.DB.prepare('SELECT url FROM posts').all()
  const existingUrls = new Set(existing.map(r => normalizeUrl(r.url)))

  // Fetch posts from Sprout (paginated)
  let allPosts = [], page = 1, totalPages = 1
  do {
    const payload = {
      filters: [
        `customer_profile_id.eq(${PROFILE_IDS.join(', ')})`,
        `created_time.in(${fmt(start)}..${fmt(now)})`,
      ],
      fields: ['perma_link', 'created_time', 'text', 'post_type', 'internal.tags.id'],
      metrics: ['lifetime.impressions', 'lifetime.engagements', 'lifetime.video_views', 'lifetime.likes'],
      page,
      limit: 200,
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

    // Filter by platform
    if (filterPlatforms.length > 0) {
      posts = posts.filter(p => filterPlatforms.includes(detectPlatform(p.perma_link || p.permalink || '')))
    } else if (videoOnly) {
      posts = posts.filter(p => {
        const u = (p.perma_link || p.permalink || '').toLowerCase()
        return u.includes('youtube.com') || u.includes('youtu.be') || u.includes('tiktok.com')
      })
    }

    allPosts = allPosts.concat(posts)
    totalPages = data?.paging?.total_pages || 1
    page++
  } while (page <= Math.min(totalPages, 50))

  // Insert into D1
  let imported = 0, skipped = 0, tagged = 0, unassigned = 0
  const byShow = {}

  for (const sp of allPosts) {
    const permalink = sp.perma_link || sp.permalink || ''
    if (!permalink) { skipped++; continue }

    const normUrl = normalizeUrl(permalink)
    if (existingUrls.has(normUrl)) { skipped++; continue }

    // Determine show + episode from Sprout tags
    const postTagIds = (sp.internal?.tags || []).map(t => t.id)
    let showName = 'Unassigned', episodeNumber = '', matchType = null

    for (const tagId of postTagIds) {
      const tm = tagMap[tagId]
      if (!tm) continue
      if (tm.type === 'episode') {
        showName = tm.show
        episodeNumber = tm.episode || ''
        matchType = 'episode'
        break
      }
      if (tm.type === 'collection' && matchType !== 'episode') {
        showName = tm.show
        matchType = 'collection'
      }
    }

    if (matchType) tagged++
    else unassigned++

    const platform = detectPlatform(permalink)
    const isEditorial = showName === 'Editorials'
    const mediaType = resolveMediaType(platform, isEditorial)
    const text = (sp.text || '').replace(/https?:\/\/\S+/g, '').trim()
    const title = text.length > 120 ? text.slice(0, 120) + '…' : text || permalink
    const createdAt = sp.created_time ? new Date(sp.created_time) : new Date()
    const dateStr = createdAt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    const id = `sprout_${createdAt.getTime()}_${Math.random().toString(36).slice(2, 6)}`
    const metrics = sp.metrics || {}

    byShow[showName] = (byShow[showName] || 0) + 1

    try {
      await env.DB.prepare(`
        INSERT INTO posts (id, url, title, show_name, platform, media_type, episode_number, clip_index,
          post_date, ts, stats_views, stats_engagement, stats_impressions, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, permalink, title, showName, platform, mediaType, episodeNumber, '',
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

  return new Response(
    JSON.stringify({ ok: true, fetched: allPosts.length, imported, skipped, tagged, unassigned, byShow }),
    { headers: CORS }
  )
}
