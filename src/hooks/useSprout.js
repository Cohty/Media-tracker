import { useState, useEffect } from 'react'

// Metrics we want per platform
const PLATFORM_METRICS = {
  YouTube:   ['video_views', 'impressions', 'engagements', 'likes', 'comments'],
  X:         ['impressions', 'engagements', 'likes', 'url_clicks'],
  LinkedIn:  ['impressions', 'engagements', 'likes', 'comments', 'clicks'],
  Instagram: ['impressions', 'reach', 'engagements', 'likes', 'comments'],
  TikTok:    ['video_views', 'impressions', 'engagements', 'likes', 'comments'],
  Other:     ['impressions', 'engagements'],
}

async function sproutGet(path) {
  const res = await fetch(`/api/sprout?path=${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error(`Sprout API ${res.status}`)
  return res.json()
}

async function sproutPost(path, body) {
  const res = await fetch(`/api/sprout?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Sprout API ${res.status}`)
  }
  return res.json()
}

export function useSprout() {
  const [profiles, setProfiles] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | ready | error | no-key
  const [error, setError] = useState('')

  useEffect(() => {
    sproutGet('metadata/customer')
      .then(data => {
        // Profiles are in data.data[0].attributes.profiles
        const raw = data?.data?.[0]?.attributes?.profiles || []
        setProfiles(raw)
        setStatus('ready')
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
    if (profiles.length === 0) throw new Error('No Sprout profiles loaded')

    const profileIds = profiles.map(p => p.id)
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 90) // look back 90 days

    const fmt = d => d.toISOString().split('.')[0]

    // Fetch post analytics from Sprout
    const payload = {
      filters: [
        { field: 'customer_profile_id', operator: 'in', value: profileIds },
      ],
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

    onProgress?.(`Matching ${sproutPosts.length} Sprout posts to your tracker…`)

    // Build a URL → stats lookup
    const statsMap = {}
    sproutPosts.forEach(sp => {
      const permalink = sp.attributes?.permalink || ''
      const metrics = sp.attributes?.metrics || {}
      if (permalink) {
        statsMap[permalink.toLowerCase()] = {
          views:       metrics.video_views || metrics.reach || '',
          engagement:  metrics.engagements || '',
          impressions: metrics.impressions || '',
          sproutId:    sp.id,
          lastSynced:  Date.now(),
        }
      }
    })

    // Match our posts by URL
    const results = []
    for (const post of posts) {
      const url = post.url?.toLowerCase()
      const match = statsMap[url]
      if (match) {
        results.push({ id: post.id, stats: match })
      }
    }

    onProgress?.(`Matched ${results.length} of ${posts.length} posts`)
    return results
  }

  return { profiles, status, error, syncPostStats }
}
