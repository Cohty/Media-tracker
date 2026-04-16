import { useState, useEffect } from 'react'

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
    const msg = Array.isArray(data?.error) ? data.error.join('. ')
      : Array.isArray(data?.errors) ? data.errors.map(e => e.detail || e.message || e).join('. ')
      : data?.message || (typeof data?.error === 'string' ? data.error : null) || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

// From the debug output we know profiles live in data.data[]
// with customer_profile_id as the key (not id)
function extractProfileIds(data) {
  const arr = data?.data?.data || data?.data || []
  if (Array.isArray(arr) && arr.length > 0) {
    const ids = arr
      .map(p => p.customer_profile_id || p.id)
      .filter(Boolean)
      .map(Number)
      .filter(n => !isNaN(n) && n > 0)
    if (ids.length > 0) return ids
  }
  return []
}

export function useSprout() {
  const [profileIds, setProfileIds] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    // metadata/customer/profiles returns 404 — use metadata/customer directly
    sproutGet('metadata/customer')
      .then(data => {
        const ids = extractProfileIds(data)
        setProfileIds(ids)
        setStatus(ids.length > 0 ? 'ready' : 'no-profiles')
      })
      .catch(err => {
        setStatus(err.message.includes('503') ? 'no-key' : 'error')
        setError(err.message)
      })
  }, [])

  async function syncPostStats(posts, onProgress) {
    if (profileIds.length === 0) {
      throw new Error('No Sprout profile IDs loaded. Check SPROUT_CUSTOMER_ID env var.')
    }

    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 90)
    const fmt = d => d.toISOString().split('.')[0]

    // Correct payload format confirmed from Sprout docs:
    // - start_time/end_time are top-level strings
    // - filters is an array with customer_profile_id (integers)
    // - metrics is an array of strings
    // - NO extra fields array (causes "invalid fields" error)
    const payload = {
      start_time: fmt(start),
      end_time:   fmt(now),
      filters: [
        {
          field:    'customer_profile_id',
          operator: 'in',
          value:    profileIds,
        },
      ],
      metrics: [
        'impressions',
        'engagements',
        'video_views',
        'likes',
        'comments',
        'shares',
      ],
      page:     1,
      per_page: 200,
    }

    onProgress?.('Fetching post stats from Sprout…')
    const data = await sproutPost('analytics/posts', payload)
    const sproutPosts = data?.data || []
    onProgress?.(`Got ${sproutPosts.length} posts from Sprout, matching…`)

    // Build URL → stats map using permalink
    const statsMap = {}
    sproutPosts.forEach(sp => {
      const attrs = sp.attributes || sp
      const permalink = attrs?.permalink || attrs?.perma_link || attrs?.url || ''
      const metrics   = attrs?.metrics || {}
      if (permalink) {
        statsMap[permalink.toLowerCase().trim()] = {
          views:       String(metrics.video_views ?? metrics.reach ?? ''),
          engagement:  String(metrics.engagements ?? ''),
          impressions: String(metrics.impressions ?? ''),
          lastSynced:  Date.now(),
        }
      }
    })

    // Match our stored posts by URL
    const results = []
    for (const post of posts) {
      const url = (post.url || '').toLowerCase().trim()
      if (statsMap[url]) results.push({ id: post.id, stats: statsMap[url] })
    }

    onProgress?.(`Matched ${results.length} of ${posts.length} posts`)
    return results
  }

  return { profileIds, status, error, syncPostStats }
}
