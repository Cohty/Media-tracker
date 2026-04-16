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
    // Sprout returns errors as array of strings in data.error or data.errors
    const msg = Array.isArray(data?.error) ? data.error.join('. ')
      : Array.isArray(data?.errors) ? data.errors.map(e => e.detail || e).join('. ')
      : data?.message || data?.error || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

function extractProfileIds(data) {
  // Try every known shape Sprout returns for profiles
  const candidates = [
    data?.data,                           // flat array
    data?.data?.[0]?.attributes?.profiles,
    data?.data?.profiles,
    data?.profiles,
  ]
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) {
      // Each profile has an `id` field (numeric)
      const ids = c.map(p => p.id || p.customer_profile_id).filter(Boolean)
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
    // Try the profiles endpoint; if it fails try metadata/customer
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
            if (err.message.includes('503') || err.message.includes('not configured')) {
              setStatus('no-key')
            } else {
              setStatus('error')
              setError(err.message)
            }
          })
      )
  }, [])

  async function syncPostStats(posts, onProgress) {
    if (profileIds.length === 0) {
      throw new Error('Could not load Sprout profile IDs. Check your SPROUT_CUSTOMER_ID env var and that your profiles are connected in Sprout.')
    }

    // Sprout requires created_time and customer_profile_id as mandatory filters
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 90)

    const fmt = d => {
      // Sprout wants YYYY-MM-DDThh:mm:ss format
      return d.toISOString().replace('Z', '').split('.')[0]
    }

    const payload = {
      filters: [
        {
          field: 'customer_profile_id',
          operator: 'in',
          value: profileIds,
        },
        {
          field: 'created_time',
          operator: 'between',
          value: [fmt(start), fmt(now)],
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

    // Build a permalink → stats lookup
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

    // Match our stored posts by URL
    const results = []
    for (const post of posts) {
      const url = (post.url || '').toLowerCase().trim()
      if (statsMap[url]) {
        results.push({ id: post.id, stats: statsMap[url] })
      }
    }

    onProgress?.(`Matched ${results.length} of ${posts.length} posts`)
    return results
  }

  return { profileIds, status, error, syncPostStats }
}
