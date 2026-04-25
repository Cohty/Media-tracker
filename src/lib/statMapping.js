// Platform-aware mapping from Sprout API metrics → our { views, engagement, impressions } shape.
//
// Background:
// - YouTube has NO impressions metric via Sprout (per Sprout docs). Always null.
// - TikTok "impressions" are derived from views — they're the same number. We store views only.
// - Instagram (post Jan 2025): lifetime.impressions actually returns views due to Meta API change.
//   Sprout added a new lifetime.views field. We prefer lifetime.views, fall back to lifetime.impressions.
//   Either way it's views, never impressions. Impressions stay null.
// - X / Twitter / LinkedIn / Facebook: views and impressions are real, distinct metrics.
//
// Returning null (not 0) means "no data exists for this metric on this platform" — display layer
// renders null/0/missing as em-dash, but null carries the semantic "intentionally blank".

export function extractStatsFromSprout(platform, sproutMetrics) {
  const m = sproutMetrics || {}
  const videoViews = num(m['lifetime.video_views'])
  const igViews    = num(m['lifetime.views'])
  const impressions = num(m['lifetime.impressions'])
  const engagement = num(m['lifetime.engagements'])

  switch (platform) {
    case 'YouTube':
      // YT: views real, impressions unavailable via Sprout
      return { views: videoViews, impressions: null, engagement }

    case 'TikTok':
      // TikTok: impressions derived from views — same number. Only store views.
      return { views: videoViews, impressions: null, engagement }

    case 'Instagram':
      // IG: impressions field returns views post-Jan-2025. Prefer the new lifetime.views field.
      // Either source is treated as views. Impressions are no longer available distinctly.
      return { views: igViews ?? impressions, impressions: null, engagement }

    case 'X':
    case 'Twitter':
      // X is special: the "views" count users see on the post (the eyeball count) is what
      // the X API returns as impressions. For video tweets, video_views also exists separately.
      // For text tweets/threads/replies, video_views is empty and the eyeball count lives in
      // lifetime.impressions. So: views = video_views OR impressions (whichever has a value).
      // We still keep impressions populated for posts that have both.
      return {
        views: videoViews ?? impressions,
        impressions,
        engagement,
      }

    case 'LinkedIn':
    case 'Facebook':
      // Real, separate metrics — straightforward mapping
      return { views: videoViews, impressions, engagement }

    default:
      // Unknown platform — pass through best-effort
      return { views: videoViews, impressions, engagement }
  }
}

// Coerce raw API value to a positive number, or null if missing/zero.
// Important: null ≠ 0 in our model. null means "no data"; 0 means "literally zero".
// Sprout returns 0 for missing metrics on some endpoints, so we treat 0 as "no data" for
// the optional fields. If the platform actually had 0 views, the post will show 0 anyway
// once it gets any traffic — and 0 vs blank is indistinguishable to a reader.
function num(v) {
  if (v == null) return null
  const n = Number(v)
  if (!isFinite(n) || n <= 0) return null
  return n
}

// Build the stats object we write to the post record. Null fields are omitted so we don't
// overwrite manually-entered data with blank values, except where the platform explicitly
// has no data (then we want the field to reset).
//
// Returns { stats } shaped object ready to merge into post.
export function buildStatsPayload(platform, sproutMetrics, { lastSynced = Date.now() } = {}) {
  const { views, engagement, impressions } = extractStatsFromSprout(platform, sproutMetrics)
  const stats = { lastSynced }

  // Always write what Sprout gave us. If null (no data), explicitly set empty string so
  // the display shows "—" instead of stale prior values from an older sync.
  stats.views       = views       != null ? String(views)       : ''
  stats.engagement  = engagement  != null ? String(engagement)  : ''
  stats.impressions = impressions != null ? String(impressions) : ''

  return stats
}
