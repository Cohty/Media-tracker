export const SHOWS = [
  { name: 'The Crypto Beat',       hex: '#f0a020', bg: '#2a1e00', tc: '#f0a020' },
  { name: 'The Big Brain Podcast', hex: '#00e5ff', bg: '#001e26', tc: '#00e5ff' },
  { name: 'Layer One',             hex: '#ff2d78', bg: '#2a0016', tc: '#ff2d78' },
  { name: 'The White Papers',      hex: '#39ff8c', bg: '#002218', tc: '#39ff8c' },
  { name: 'Standalones',           hex: '#b44eff', bg: '#1a0030', tc: '#b44eff' },
]

export const PLATFORMS = {
  YouTube:   { color: '#ff4444', bg: 'rgba(255,68,68,0.12)',   pb: 'rgba(255,68,68,0.3)' },
  X:         { color: '#c8c4e0', bg: 'rgba(200,196,224,0.08)', pb: 'rgba(200,196,224,0.2)' },
  LinkedIn:  { color: '#00a8ff', bg: 'rgba(0,168,255,0.1)',    pb: 'rgba(0,168,255,0.3)' },
  Instagram: { color: '#ff2d78', bg: 'rgba(255,45,120,0.1)',   pb: 'rgba(255,45,120,0.3)' },
  TikTok:    { color: '#00e5ff', bg: 'rgba(0,229,255,0.1)',    pb: 'rgba(0,229,255,0.3)' },
  Other:     { color: '#b44eff', bg: 'rgba(180,78,255,0.1)',   pb: 'rgba(180,78,255,0.3)' },
}

export const MEDIA_TYPES = ['Clip', 'Full Episode', 'Broadcast']

export function detectPlatform(url) {
  const u = url.toLowerCase()
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube'
  if (u.includes('x.com') || u.includes('twitter.com')) return 'X'
  if (u.includes('linkedin.com')) return 'LinkedIn'
  if (u.includes('instagram.com')) return 'Instagram'
  if (u.includes('tiktok.com')) return 'TikTok'
  return url.length > 4 ? 'Other' : ''
}

export async function fetchYTTitle(url) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
    if (!res.ok) return ''
    const d = await res.json()
    return d.title || ''
  } catch {
    return ''
  }
}
