export const SHOWS = [
  { name: 'The Crypto Beat',       hex: '#f0a020', bg: '#2a1e00', tc: '#f0a020' },
  { name: 'The Big Brain Podcast', hex: '#00e5ff', bg: '#001e26', tc: '#00e5ff' },
  { name: 'Layer One',             hex: '#ff2d78', bg: '#2a0016', tc: '#ff2d78' },
  { name: 'The White Papers',      hex: '#39ff8c', bg: '#002218', tc: '#39ff8c' },
  { name: 'Standalones',           hex: '#b44eff', bg: '#1a0030', tc: '#b44eff' },
  { name: 'Editorials',            hex: '#00a8ff', bg: '#001428', tc: '#00a8ff' },
  { name: 'Newsroom',              hex: '#e0d0ff', bg: '#12101e', tc: '#c0b4e8' },
]

export const UNASSIGNED = { name: 'Unassigned', hex: '#4a4168', bg: '#0f0c1e', tc: '#4a4168' }

// Map Sprout collection names → our show names
export const COLLECTION_TO_SHOW = {
  'the crypto beat':       'The Crypto Beat',
  'cryptobeat':            'The Crypto Beat',
  'the big brain podcast': 'The Big Brain Podcast',
  'big brain podcast':     'The Big Brain Podcast',
  'big brain':             'The Big Brain Podcast',
  'layer1':                'Layer One',
  'layer 1':               'Layer One',
  'layer one':             'Layer One',
  'the white papers':      'The White Papers',
  'white papers':          'The White Papers',
  'standalones':           'Standalones',
  'standalone':            'Standalones',
  'editorials':            'Editorials',
  'editorial':             'Editorials',
  'newsroom clips':        'Standalones',
  'around the block':      'Standalones',
  'the starting block':    'Standalones',
}

// Map Sprout tag PREFIXES → { show, episodePrefix }
// e.g. "TCB 73" → { show: 'The Crypto Beat', episode: '73' }
export const TAG_PREFIXES = [
  { prefix: 'tcb',  show: 'The Crypto Beat'        },
  { prefix: 'bbp',  show: 'The Big Brain Podcast'  },
  { prefix: 'l1',   show: 'Layer One'              },
  { prefix: 'twp',  show: 'The White Papers'       },
  { prefix: 'wp',   show: 'The White Papers'       },
  { prefix: 'sa',   show: 'Standalones'            },
  { prefix: 'ed',   show: 'Editorials'             },
]

export function parseTagToShowAndEpisode(tagText) {
  if (!tagText) return null
  const t = tagText.toLowerCase().trim()

  // Try prefix matching: "TCB 73", "L1 01", "BBP 05", etc.
  for (const { prefix, show } of TAG_PREFIXES) {
    const re = new RegExp(`^${prefix}\\s*(\\d+)`, 'i')
    const m = tagText.trim().match(re)
    if (m) {
      return { show, episode: String(parseInt(m[1], 10)) }
    }
  }

  // Try collection-level keyword matching (no episode number)
  for (const [keyword, show] of Object.entries(COLLECTION_TO_SHOW)) {
    if (t === keyword || t.includes(keyword)) return { show, episode: null }
  }

  return null
}

export const PLATFORMS = {
  YouTube:   { color: '#ff4444', bg: 'rgba(255,68,68,0.12)',   pb: 'rgba(255,68,68,0.3)' },
  X:         { color: '#c8c4e0', bg: 'rgba(200,196,224,0.08)', pb: 'rgba(200,196,224,0.2)' },
  LinkedIn:  { color: '#00a8ff', bg: 'rgba(0,168,255,0.1)',    pb: 'rgba(0,168,255,0.3)' },
  Instagram: { color: '#ff2d78', bg: 'rgba(255,45,120,0.1)',   pb: 'rgba(255,45,120,0.3)' },
  TikTok:    { color: '#00e5ff', bg: 'rgba(0,229,255,0.1)',    pb: 'rgba(0,229,255,0.3)' },
  Other:     { color: '#b44eff', bg: 'rgba(180,78,255,0.1)',   pb: 'rgba(180,78,255,0.3)' },
}

export const MEDIA_TYPES = ['Clip', 'Full Episode', 'Broadcast', 'Article', 'Thread', 'Reply', 'Partner Post']

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
  } catch { return '' }
}
