// Server-side mirror of src/lib/statMapping.js — used by Cloudflare Pages Functions
// (sprout-import.js, etc). Keep these two files in sync when changing logic.
//
// Background:
// - YouTube has NO impressions metric via Sprout. Always null.
// - TikTok "impressions" are derived from views — same number. Store views only.
// - Instagram (post Jan 2025): lifetime.impressions returns views due to Meta API change.
//   Sprout added a new lifetime.views field. Prefer lifetime.views, fall back to lifetime.impressions.
// - X / Twitter: views = video_views OR impressions (the eyeball count is in impressions for non-video).
// - LinkedIn / Facebook: views and impressions are real, distinct metrics.

export function extractStatsFromSprout(platform, sproutMetrics) {
  const m = sproutMetrics || {}
  const videoViews = num(m['lifetime.video_views'])
  const igViews    = num(m['lifetime.views'])
  const impressions = num(m['lifetime.impressions'])
  const engagement = num(m['lifetime.engagements'])

  switch (platform) {
    case 'YouTube':
      return { views: videoViews, impressions: null, engagement }

    case 'TikTok':
      return { views: videoViews, impressions: null, engagement }

    case 'Instagram':
      return { views: igViews ?? impressions, impressions: null, engagement }

    case 'X':
    case 'Twitter':
      return {
        views: videoViews ?? impressions,
        impressions,
        engagement,
      }

    case 'LinkedIn':
    case 'Facebook':
      return { views: videoViews, impressions, engagement }

    default:
      return { views: videoViews, impressions, engagement }
  }
}

function num(v) {
  if (v == null) return null
  const n = Number(v)
  if (!isFinite(n) || n <= 0) return null
  return n
}

// Returns { views, engagement, impressions } as strings (for DB writes).
// null/empty → empty string so display shows "—".
export function buildStatsTriple(platform, sproutMetrics) {
  const { views, engagement, impressions } = extractStatsFromSprout(platform, sproutMetrics)
  return {
    views: views != null ? String(views) : '',
    engagement: engagement != null ? String(engagement) : '',
    impressions: impressions != null ? String(impressions) : '',
  }
}
