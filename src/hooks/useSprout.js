import { useState, useEffect } from 'react'
import { getAuthHeaders } from './useUser'

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
        metrics: ['lifetime.impressions', 'lifetime.engagements', 'lifetime.video_views', 'lifetime.likes'],
        page,
        limit: 200,
      })
      allPosts = allPosts.concat(data?.data || [])
      totalPages = data?.paging?.total_pages || 1
      onProgress?.(`Fetched page ${page}/${totalPages} (${allPosts.length} posts so far)…`)
      page++
    } while (page <= Math.min(totalPages, 10)) // cap at 10 pages = 2000 posts

    onProgress?.(`Matching ${allPosts.length} Sprout posts to your tracker…`)

    // Build normalized URL → stats map
    const statsMap = {}
    allPosts.forEach(sp => {
      const permalink = sp.perma_link || sp.permalink || ''
      const metrics = sp.metrics || {}
      if (permalink) {
        const normUrl = normalizeUrl(permalink)
        statsMap[normUrl] = {
          views:       String(metrics['lifetime.video_views'] || metrics['lifetime.impressions'] || ''),
          engagement:  String(metrics['lifetime.engagements'] || ''),
          impressions: String(metrics['lifetime.impressions'] || ''),
          lastSynced:  Date.now(),
        }
      }
    })

    // Match our stored posts using normalized URLs
    const results = []
    for (const post of posts) {
      // Use syncUrl if set, otherwise fall back to logged url
      const urlToMatch = post.syncUrl?.trim() || post.url || ''
      const normUrl = normalizeUrl(urlToMatch)
      if (statsMap[normUrl]) results.push({ id: post.id, stats: statsMap[normUrl], post })
    }

    onProgress?.(`Matched ${results.length} of ${posts.length} posts`)
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
