import { requireAuth, jsonResponse } from '../_auth.js'

export async function onRequestPost({ request, env }) {
  const { error } = requireAuth(request, env)
  if (error) return error

  const { url } = await request.json()
  if (!url) return jsonResponse({ error: 'URL required' }, 400)

  // Extract tweet ID from URL
  const match = (url || '').match(/status\/(\d+)/)
  if (!match) return jsonResponse({ error: 'Not a valid tweet URL' }, 400)

  const tweetId = match[1]
  const xUrl = `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics&expansions=attachments.media_keys&media.fields=public_metrics`

  try {
    const res = await fetch(xUrl, {
      headers: { 'Authorization': `Bearer ${env.X_BEARER_TOKEN}` }
    })
    const data = await res.json()
    if (!res.ok || data.errors) {
      return jsonResponse({ error: data.errors?.[0]?.message || data.detail || 'X API error' }, 400)
    }

    const tweet = data.data
    const media = data.includes?.media?.[0]

    // Video view count (only present on video/gif posts)
    const videoViewCount = media?.public_metrics?.view_count ?? null
    // Impression count — available on all tweets
    const impressionCount = tweet?.public_metrics?.impression_count ?? null
    // Like count from X directly
    const likeCount = tweet?.public_metrics?.like_count ?? null
    // Reply count
    const replyCount = tweet?.public_metrics?.reply_count ?? null

    // viewCount: prefer video_view_count (actual plays), fallback to impression_count
    const viewCount = videoViewCount ?? impressionCount

    return jsonResponse({
      tweetId,
      viewCount:      viewCount      !== null ? String(viewCount)      : null,
      videoViewCount: videoViewCount !== null ? String(videoViewCount) : null,
      impressions:    impressionCount !== null ? String(impressionCount) : null,
      likes:          likeCount      !== null ? String(likeCount)      : null,
      replies:        replyCount     !== null ? String(replyCount)     : null,
      isVideo:        videoViewCount !== null,
    })
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to fetch from X API' }, 500)
  }
}
