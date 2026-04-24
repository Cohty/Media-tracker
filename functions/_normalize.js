// Shared URL normalization — used by posts.js POST, pending/review, sprout-import
// Keep in sync with LogModal.jsx client-side version
export function normalizeUrl(url) {
  try {
    const u = new URL((url || '').toLowerCase().trim())
    u.hostname = u.hostname.replace('x.com', 'twitter.com')
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let videoId = u.searchParams.get('v')
      const shortsMatch = u.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/)
      if (shortsMatch) videoId = shortsMatch[1]
      const youtubeBeMatch = u.hostname.includes('youtu.be') ? u.pathname.match(/\/([a-zA-Z0-9_-]+)/) : null
      if (youtubeBeMatch) videoId = youtubeBeMatch[1]
      if (videoId) return `https://www.youtube.com/watch?v=${videoId}`
    }
    if (u.hostname.includes('tiktok.com')) {
      u.search = ''
      return u.toString().replace(/\/$/, '')
    }
    const v = u.searchParams.get('v')
    u.search = ''
    if (v) u.searchParams.set('v', v)
    return u.toString().replace(/\/$/, '')
  } catch { return (url || '').toLowerCase().trim() }
}

// Returns { id, url, title } of existing post whose normalized URL matches, or null
export async function findDuplicate(env, url) {
  if (!url) return null
  const normInput = normalizeUrl(url)
  const { results } = await env.DB.prepare('SELECT id, url, title, show_name FROM posts').all()
  const match = results.find(r => normalizeUrl(r.url) === normInput)
  if (!match) return null
  return { id: match.id, url: match.url, title: match.title, show: match.show_name }
}
