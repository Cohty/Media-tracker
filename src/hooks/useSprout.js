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
    const msg = typeof data?.error === 'string' ? data.error
      : Array.isArray(data?.error) ? data.error.join('. ')
      : data?.message || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
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
    if (profileIds.length === 0) {
      throw new Error('No Sprout profile IDs found.')
    }

    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 90)

    // Sprout filter format: "field.operator(values)"
    // Date range uses .. (two dots) between start and end
    const fmt = d => d.toISOString().replace('Z', '').split('.')[0]
    const profileFilter = `customer_profile_id.eq(${profileIds.join(', ')})`
    const dateFilter = `created_time.in(${fmt(start)}..${fmt(now)})`

    const payload = {
      filters: [profileFilter, dateFilter],
      fields: ['perma_link', 'created_time', 'text'],
      metrics: [
        'lifetime.impressions',
        'lifetime.engagements',
        'lifetime.video_views',
        'lifetime.likes',
        'lifetime.comments',
        'lifetime.shares',
      ],
      page: 1,
      limit: 200,
    }

    onProgress?.('Fetching post stats from Sprout…')
    const data = await sproutPost('analytics/posts', payload)
    const sproutPosts = data?.data || []
    onProgress?.(`Got ${sproutPosts.length} posts from Sprout, matching…`)

    // Build URL → stats map using perma_link
    const statsMap = {}
    sproutPosts.forEach(sp => {
      const permalink = sp.perma_link || sp.permalink || ''
      const metrics = sp.metrics || {}
      if (permalink) {
        statsMap[permalink.toLowerCase().trim()] = {
          views:       String(metrics['lifetime.video_views'] ?? metrics['lifetime.impressions'] ?? ''),
          engagement:  String(metrics['lifetime.engagements'] ?? ''),
          impressions: String(metrics['lifetime.impressions'] ?? ''),
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
