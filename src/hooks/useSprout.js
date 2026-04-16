import { useState, useEffect } from 'react'

async function sproutGet(path) {
  const res = await fetch(`/api/sprout?path=${encodeURIComponent(path)}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || data?.error || `Sprout API ${res.status}`)
  return data
}

async function sproutPost(path, body) {
  const res = await fetch(`/api/sprout?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || data?.error || `Sprout API ${res.status}`)
  return data
}

function extractProfiles(data) {
  // Try every known response shape Sprout uses
  if (Array.isArray(data?.data)) {
    // Shape: { data: [ { id, attributes: { profiles: [...] } } ] }
    const nested = data.data[0]?.attributes?.profiles
    if (Array.isArray(nested) && nested.length) return nested
    // Shape: { data: [ {id, network_type, ...}, ... ] }  (flat array of profiles)
    if (data.data[0]?.network_type || data.data[0]?.type === 'profile') return data.data
  }
  // Shape: { data: { profiles: [...] } }
  if (Array.isArray(data?.data?.profiles)) return data.data.profiles
  // Shape: { profiles: [...] }
  if (Array.isArray(data?.profiles)) return data.profiles
  return []
}

export function useSprout() {
  const [profiles, setProfiles] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    // Try the dedicated profiles endpoint first, fall back to metadata/customer
    sproutGet('metadata/customer/profiles')
      .then(data => {
        const found = extractProfiles(data)
        if (found.length) { setProfiles(found); setStatus('ready'); return }
        // fallback
        return sproutGet('metadata/customer').then(d2 => {
          const found2 = extractProfiles(d2)
          setProfiles(found2)
          setStatus(found2.length ? 'ready' : 'no-profiles')
        })
      })
      .catch(err => {
        if (err.message.includes('503') || err.message.includes('not configured')) {
          setStatus('no-key')
        } else {
          setStatus('error')
          setError(err.message)
        }
      })
  }, [])

  async function syncPostStats(posts, onProgress) {
    // If we have profiles, use their IDs; otherwise sync without a profile filter
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 90)
    const fmt = d => d.toISOString().split('.')[0]

    const filters = profiles.length > 0
      ? [{ field: 'customer_profile_id', operator: 'in', value: profiles.map(p => p.id) }]
      : []

    const payload = {
      ...(filters.length ? { filters } : {}),
      metrics: ['impressions', 'engagements', 'video_views', 'likes', 'comments', 'shares', 'clicks', 'reach'],
      fields: ['post_id', 'text', 'created_time', 'permalink', 'post_type', 'network_type'],
      start_time: fmt(start),
      end_time: fmt(now),
      page: 1,
      per_page: 200,
    }

    onProgress?.('Fetching Sprout post data…')
    const data = await sproutPost('analytics/posts', payload)
    const sproutPosts = data?.data || []
    onProgress?.(`Got ${sproutPosts.length} posts from Sprout, matching…`)

    // Build URL → stats map
    const statsMap = {}
    sproutPosts.forEach(sp => {
      const permalink = sp.attributes?.permalink || sp.permalink || ''
      const metrics = sp.attributes?.metrics || sp.metrics || {}
      if (permalink) {
        statsMap[permalink.toLowerCase().trim()] = {
          views:       String(metrics.video_views ?? metrics.reach ?? ''),
          engagement:  String(metrics.engagements ?? ''),
          impressions: String(metrics.impressions ?? ''),
          lastSynced:  Date.now(),
        }
      }
    })

    // Match our posts by URL
    const results = []
    for (const post of posts) {
      const url = (post.url || '').toLowerCase().trim()
      const match = statsMap[url]
      if (match) results.push({ id: post.id, stats: match })
    }

    onProgress?.(`Matched ${results.length} of ${posts.length} posts`)
    return results
  }

  return { profiles, status, error, syncPostStats }
}
