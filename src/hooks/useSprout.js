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

function extractProfileIds(data) {
  const candidates = [
    data?.data,
    data?.data?.[0]?.attributes?.profiles,
    data?.data?.profiles,
    data?.profiles,
  ]
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) {
      const ids = c
        .map(p => p.id || p.customer_profile_id)
        .filter(Boolean)
        .map(id => Number(id))  // must be integers
        .filter(id => !isNaN(id))
      if (ids.length > 0) return ids
    }
  }
  return []
}

export function useSprout() {
  const [profileIds, setProfileIds] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    sproutGet('metadata/customer/profiles')
      .then(data => {
        const ids = extractProfileIds(data)
        setProfileIds(ids)
        setStatus(ids.length > 0 ? 'ready' : 'no-profiles')
      })
      .catch(() =>
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
      )
  }, [])

  async function syncPostStats(posts, onProgress) {
    if (profileIds.length === 0) {
      throw new Error('No Sprout profile IDs found. Make sure SPROUT_CUSTOMER_ID is correct and profiles are connected in Sprout.')
    }

    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 90)

    // Sprout wants ISO strings without timezone, and dates as top-level fields
    const fmt = d => d.toISOString().split('.')[0]

    const payload = {
      // start_time/end_time are TOP-LEVEL — not inside filters
      start_time: fmt(start),
      end_time: fmt(now),
      filters: [
        {
          field: 'customer_profile_id',
          operator: 'in',
          value: profileIds, // array of integers
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
      page: 1,
      per_page: 200,
    }

    onProgress?.('Fetching post stats from Sprout…')
    const data = await sproutPost('analytics/posts', payload)
    const sproutPosts = data?.data || []
    onProgress?.(`Got ${sproutPosts.length} posts from Sprout, matching…`)

    const statsMap = {}
    sproutPosts.forEach(sp => {
      const attrs = sp.attributes || sp
      const permalink = attrs?.permalink || attrs?.perma_link || attrs?.url || ''
      const metrics = attrs?.metrics || {}
      if (permalink) {
        statsMap[permalink.toLowerCase().trim()] = {
          views:       String(metrics.video_views ?? metrics.reach ?? ''),
          engagement:  String(metrics.engagements ?? ''),
          impressions: String(metrics.impressions ?? ''),
          lastSynced:  Date.now(),
        }
      }
    })

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
