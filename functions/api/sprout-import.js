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
  { prefix: 'tcb',  show: 'The Crypto Beat' },
  { prefix: 'bbp',  show: 'The Big Brain Podcast' },
  { prefix: 'l1',   show: 'Layer One' },
  { prefix: 'twp',  show: 'The White Papers' },
  { prefix: 'wp',   show: 'The White Papers' },
  { prefix: 'sa',   show: 'Standalones' },
  { prefix: 'ed',   show: 'Editorials' },
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

function resolveMediaType(platform, isEditorial, isNewsroom, isClipAccount, text) {
  if (platform === 'TikTok') return 'Clip'
  if (isEditorial) return 'Article'
  if (isNewsroom) return 'Article'
  if (platform === 'LinkedIn' || platform === 'Instagram') return 'Article'
  if (platform === 'X') {
    // @TheBlockPods tweets are clips (guest quotes from episodes)
    if (isClipAccount) return 'Clip'
    // Short headline with no hashtags/emojis = news article
    if (isHeadline(text)) return 'Article'
    return 'Clip' // X posts with hashtags/quotes are clips
  }
  if (platform === 'YouTube') return 'Full Episode' // caller overrides to Clip for Shorts
  return 'Article'
}

function isHeadline(text) {
  if (!text) return true
  const t = text.trim()
  // Headlines: short, no hashtags, no quotes, no emojis pattern
  const hasHashtags = (t.match(/#\w/g) || []).length > 2
  const hasQuotes = /["\u201c\u201d]/.test(t)
  const hasEmoji = /[\u{1F300}-\u{1FFFF}]/u.test(t)
  const wordCount = t.split(/\s+/).length
  // If it's a short plain sentence (likely a headline) → Article
  if (wordCount < 15 && !hasHashtags && !hasQuotes && !hasEmoji) return true
  return false
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

    // Filter by platform — LinkedIn requires special handling
    if (filterPlatforms.length > 0) {
      posts = posts.filter(p => {
        const plat = detectPlatform(p.perma_link || p.permalink || '')
        if (!filterPlatforms.includes(plat)) return false
        // LinkedIn posts are only imported if they are Editorials (cross-posted with Instagram)
        // OR if they are episode content (has episode tag mapped to a show)
        // Standalone LinkedIn-only posts are excluded — handled after cross-post detection
        return true
      })
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

  // For Editorial detection: group LinkedIn posts by URL-normalized content
  // A true Editorial = same article URL posted to BOTH Instagram AND LinkedIn within 48hrs
  // Build a set of LinkedIn post URLs that have a matching Instagram post (same tag, close timing)
  const editorialLinkedInUrls = new Set()
  if (filterPlatforms.includes('LinkedIn') && filterPlatforms.includes('Instagram')) {
    const igPosts = allPosts.filter(p => detectPlatform(p.perma_link||'') === 'Instagram')
    const liPosts = allPosts.filter(p => detectPlatform(p.perma_link||'') === 'LinkedIn')

    liPosts.forEach(liPost => {
      const liTags = new Set((liPost.internal?.tags||[]).map(t=>t.id))
      const liTime = new Date(liPost.created_time||0).getTime()
      // Find an Instagram post with the same Editorials tag posted within 48 hrs
      const match = igPosts.find(igPost => {
        const igTags = (igPost.internal?.tags||[]).map(t=>t.id)
        const igTime = new Date(igPost.created_time||0).getTime()
        const sharedTag = igTags.some(t => liTags.has(t))
        const withinWindow = Math.abs(liTime - igTime) < 48 * 60 * 60 * 1000
        return sharedTag && withinWindow
      })
      if (match) editorialLinkedInUrls.add(normalizeUrl(liPost.perma_link||''))
    })
  }

  // Insert into D1
  let imported = 0, skipped = 0, tagged = 0, unassigned = 0
  const byShow = {}

  for (const sp of allPosts) {
    const permalink = sp.perma_link || sp.permalink || ''
    if (!permalink) { skipped++; continue }

    const normUrl = normalizeUrl(permalink)
    if (existingUrls.has(normUrl)) { skipped++; continue }

    // Skip standalone LinkedIn posts — only allow LinkedIn if it's a cross-posted Editorial
    // OR if it's mapped to an episode show (not Unassigned)
    const platform = detectPlatform(permalink)
    if (platform === 'LinkedIn') {
      const normUrl = normalizeUrl(permalink)
      const isEditorialCrossPost = editorialLinkedInUrls.has(normUrl)
      // Check if it has an episode tag (will be mapped to a show)
      const postTagIds2 = (sp.internal?.tags||[]).map(t=>t.id)
      const hasEpisodeTag = postTagIds2.some(tid => tagMap[tid]?.type === 'episode')
      if (!isEditorialCrossPost && !hasEpisodeTag) { skipped++; continue }
    }

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
    else {
      // Untagged X posts are news headlines → Newsroom
      if (platform === 'X') showName = 'Newsroom'
      unassigned++
    }

    const isEditorial = showName === 'Editorials'
    const isNewsroom = showName === 'Newsroom'
    // Detect clip accounts (@TheBlockPods posts clips, @TheBlockCo posts news)
    const isClipAccount = (sp.perma_link || sp.permalink || '').toLowerCase().includes('theblockpods')
    const postText = sp.text || ''
    const isYouTubeShort = platform === 'YouTube' && (permalink.toLowerCase().includes('/shorts/'))
    let mediaType = resolveMediaType(platform, isEditorial, isNewsroom, isClipAccount, postText)
    if (isYouTubeShort) mediaType = 'Clip'
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

  // Save import log to D1
  const logId = `log_${Date.now()}`
  const importedPosts = [] // collect for summary
  
  // Re-query to get what was just imported
  try {
    const { results: newPosts } = await env.DB.prepare(
      `SELECT id, title, show_name, platform, media_type, episode_number, url FROM posts WHERE created_by = 'sprout-import' AND created_at > ?`
    ).bind(Date.now() - 120000).all() // posts imported in last 2 mins
    
    await env.DB.prepare(`
      INSERT INTO import_log (id, imported_at, fetched, imported, skipped, tagged, unassigned, by_show, posts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      logId, Date.now(), allPosts.length, imported, skipped, tagged, unassigned,
      JSON.stringify(byShow), JSON.stringify(newPosts.slice(0, 200))
    ).run()
  } catch {}

  return new Response(
    JSON.stringify({ ok: true, logId, fetched: allPosts.length, imported, skipped, tagged, unassigned, byShow }),
    { headers: CORS }
  )
}
