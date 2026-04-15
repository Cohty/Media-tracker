export const SHOWS = [
  { name: 'The Crypto Beat',       hex: '#BA7517', bg: '#FAEEDA', tc: '#633806' },
  { name: 'The Big Brain Podcast', hex: '#185FA5', bg: '#E6F1FB', tc: '#042C53' },
  { name: 'Layer One',             hex: '#A32D2D', bg: '#FCEBEB', tc: '#501313' },
  { name: 'The White Papers',      hex: '#0F6E56', bg: '#E1F5EE', tc: '#04342C' },
  { name: 'Standalones',           hex: '#534AB7', bg: '#EEEDFE', tc: '#26215C' },
]

export const PLATFORMS = {
  YouTube:   { color: '#791F1F', bg: '#F7C1C1' },
  X:         { color: '#2C2C2A', bg: '#D3D1C7' },
  LinkedIn:  { color: '#0C447C', bg: '#B5D4F4' },
  Instagram: { color: '#72243E', bg: '#F4C0D1' },
  TikTok:    { color: '#085041', bg: '#9FE1CB' },
  Other:     { color: '#444441', bg: '#D3D1C7' },
}

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
