import { useState, useEffect } from 'react'
import { getAuthHeaders } from './useUser'
import { buildStatsPayload } from '../lib/statMapping'

async function sproutGet(path) {
  const res = await fetch(`/api/sprout?path=${encodeURIComponent(path)}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`)
  return data
}

async function sproutPost(path, body) {
  const res = await fetch(`/api/sprout?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error
      : Array.isArray(data?.error) ? data.error.join('. ')
      : data?.message || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

// Normalize URLs so x.com↔twitter.com and query params don't block matching
function normalizeUrl(url) {
  try {
    const u = new URL((url || '').toLowerCase().trim())
    u.hostname = u.hostname.replace('x.com', 'twitter.com')
    // Normalize YouTube: /shorts/ID and /watch?v=ID → always /watch?v=ID (Sprout uses watch format)
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let videoId = u.searchParams.get('v')
      const shortsMatch = u.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/)
      if (shortsMatch) videoId = shortsMatch[1]
      const youtubeBeMatch = u.hostname.includes('youtu.be') ? u.pathname.match(/\/([a-zA-Z0-9_-]+)/) : null
      if (youtubeBeMatch) videoId = youtubeBeMatch[1]
      if (videoId) return `https://www.youtube.com/watch?v=${videoId}`
    }
    // Normalize TikTok: strip all tracking params
    if (u.hostname.includes('tiktok.com')) {
      u.search = ''
      return u.toString().replace(/\/$/, '')
    }
    u.search = ''
    return u.toString().replace(/\/$/, '')
  } catch { return (url || '').toLowerCase().trim() }
}

export function useSprout() {
  const [profileIds, setProfileIds] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    sproutGet('metadata/customer')
      .then(data => {
        const arr = data?.data || []
        const ids = arr
          .map(p => p.customer_profile_id)
          .filter(Boolean)
          .map(Number)
          .filter(n => !isNaN(n) && n > 0)
        setProfileIds(ids)
        setStatus(ids.length > 0 ? 'ready' : 'no-profiles')
      })
      .catch(err => {
        setStatus(err.message.includes('503') ? 'no-key' : 'error')
        setError(err.message)
      })
  }, [])

  async function syncPostStats(posts, onProgress) {
    if (profileIds.length === 0) throw new Error('No Sprout profile IDs found.')

    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 365)
    const fmt = d => d.toISOString().split('.')[0]

    const profileFilter = `customer_profile_id.eq(${profileIds.join(', ')})`
    const dateFilter = `created_time.in(${fmt(start)}..${fmt(now)})`

    // Fetch all pages
    let allPosts = []
    let page = 1
    let totalPages = 1

    onProgress?.('Fetching post stats from Sprout…')

    do {
      const data = await sproutPost('analytics/posts', {
        filters: [profileFilter, dateFilter],
        fields: ['perma_link', 'created_time'],
        metrics: ['lifetime.impressions', 'lifetime.engagements', 'lifetime.video_views', 'lifetime.views', 'lifetime.likes'],
        page,
        limit: 200,
      })
      allPosts = allPosts.concat(data?.data || [])
      totalPages = data?.paging?.total_pages || 1
      onProgress?.(`Fetched page ${page}/${totalPages} (${allPosts.length} posts so far)…`)
      page++
    } while (page <= Math.min(totalPages, 10)) // cap at 10 pages = 2000 posts

    onProgress?.(`Matching ${allPosts.length} Sprout posts to your tracker…`)

    // Build normalized URL → { metrics, createdTime } map.
    // We store raw metrics here (not mapped stats) because mapping requires the post's
    // platform, which we only have during the match loop below. We also capture created_time
    // so we can update the post's publish date to the actual Sprout-reported date.
    const sproutDataMap = {}
    allPosts.forEach(sp => {
      const permalink = sp.perma_link || sp.permalink || ''
      if (permalink) {
        const normUrl = normalizeUrl(permalink)
        sproutDataMap[normUrl] = {
          metrics: sp.metrics || {},
          createdTime: sp.created_time || null,
        }
      }
    })

    // Match our stored posts using normalized URLs, applying platform-aware mapping
    const results = []
    for (const post of posts) {
      // Use syncUrl if set, otherwise fall back to logged url
      const urlToMatch = post.syncUrl?.trim() || post.url || ''
      const normUrl = normalizeUrl(urlToMatch)
      const sproutData = sproutDataMap[normUrl]
      if (sproutData) {
        const stats = buildStatsPayload(post.platform, sproutData.metrics)
        const result = { id: post.id, stats, post }

        // If Sprout has a publish date and it differs from what we have stored, include it
        // in the result so the sync caller can update the post's date/ts.
        if (sproutData.createdTime) {
          const sproutTs = new Date(sproutData.createdTime).getTime()
          if (isFinite(sproutTs) && sproutTs > 0) {
            // Only flag for update if the stored ts differs by more than 1 day —
            // accounts for tz/rounding noise without needlessly re-writing every post.
            const ONE_DAY = 86400000
            if (!post.ts || Math.abs(post.ts - sproutTs) > ONE_DAY) {
              const d = new Date(sproutTs)
              result.dateUpdate = {
                ts: sproutTs,
                date: `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`,
              }
            }
          }
        }

        results.push(result)
      }
    }

    onProgress?.(`Matched ${results.length} of ${posts.length} posts`)

    // Step 2: For all X/Twitter posts, also fetch X API view counts
    const xPosts = posts.filter(p =>
      p.platform === 'X' || p.platform === 'Twitter' ||
      (p.url || '').includes('twitter.com') || (p.url || '').includes('x.com')
    )

    if (xPosts.length > 0) {
      // Only fetch X API for posts missing videoViews (limit to 50 per sync to avoid rate limits)
      const needsXFetch = xPosts
        .filter(p => !p.videoViews || p.videoViews === '')
        .slice(0, 50)

      if (needsXFetch.length > 0) {
        onProgress?.(`Fetching X API stats for ${needsXFetch.length} posts…`)

        // Batch in parallel groups of 10
        const BATCH = 10
        let xCount = 0
        for (let i = 0; i < needsXFetch.length; i += BATCH) {
          const batch = needsXFetch.slice(i, i + BATCH)
          const settled = await Promise.allSettled(batch.map(post =>
            fetch('/api/x-stats', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
              body: JSON.stringify({ url: post.syncUrl?.trim() || post.url || '' }),
            }).then(r => r.ok ? r.json() : null).then(xData => ({ post, xData }))
          ))
          for (const r of settled) {
            if (r.status === 'fulfilled' && r.value?.xData?.viewCount) {
              const { post, xData } = r.value
              const existing = results.find(r => r.id === post.id)
              if (existing) {
                if (xData.viewCount) existing.videoViews = xData.viewCount
                if (xData.impressions) existing.xImpressions = xData.impressions
              } else {
                results.push({ id: post.id, stats: null, post, videoViews: xData.viewCount || null, xImpressions: xData.impressions || null })
              }
              xCount++
            }
          }
          onProgress?.(`X API: ${Math.min(i + BATCH, needsXFetch.length)}/${needsXFetch.length} fetched`)
        }
        onProgress?.(`Fetched X stats for ${xCount} posts`)
      } else {
        onProgress?.('X API: all posts already have stats')
      }
    }

    return results
  }

  return { profileIds, status, error, syncPostStats }
}

export async function importFromSprout(days = 365, showName = 'Standalones', videoOnly = true, onProgress) {
  onProgress?.('Importing from Sprout…')
  const res = await fetch('/api/sprout-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ days, showName, videoOnly }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}
