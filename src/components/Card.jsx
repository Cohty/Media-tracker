import { useState } from 'react'
import { getAuthHeaders } from '../hooks/useUser'
import { PLATFORMS } from '../constants'
import { buildStatsPayload, getStatNote } from '../lib/statMapping'

const TYPE_COLORS = {
  'Full Episode':  { color: '#39ff8c', bg: 'rgba(57,255,140,0.08)', border: 'rgba(57,255,140,0.25)' },
  'Broadcast':     { color: '#f0a020', bg: 'rgba(240,160,32,0.08)', border: 'rgba(240,160,32,0.25)' },
  'Article':       { color: '#b44eff', bg: 'rgba(180,78,255,0.08)', border: 'rgba(180,78,255,0.25)' },
  'Thread':        { color: '#40e0d0', bg: 'rgba(64,224,208,0.08)', border: 'rgba(64,224,208,0.25)' },
  'Reply':         { color: '#ffd700', bg: 'rgba(255,215,0,0.08)',  border: 'rgba(255,215,0,0.25)'  },
  'Podcast Article': { color: '#ff8c42', bg: 'rgba(255,140,66,0.08)', border: 'rgba(255,140,66,0.25)' },
  'Partner Post':  { color: '#ff9de2', bg: 'rgba(255,157,226,0.08)', border: 'rgba(255,157,226,0.25)' },
}
const CLIP_COLOR = { color: '#00e5ff', bg: 'rgba(0,229,255,0.08)', border: 'rgba(0,229,255,0.25)' }

function normalizeUrl(url) {
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
    // Normalize TikTok: strip all tracking params
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

function StatBadge({ icon, value, color, note }) {
  const [hovered, setHovered] = useState(false)
  if (!value) return null
  const num = Number(value)
  if (isNaN(num) || num === 0) return null
  const display = num >= 1000000 ? `${(num/1000000).toFixed(1)}M` : num >= 1000 ? `${(num/1000).toFixed(1)}k` : num.toLocaleString()
  return (
    <span className="card-stat-badge"
      style={{ color, borderColor: color+'40', background: color+'10', position: note ? 'relative' : undefined, cursor: note ? 'help' : 'default' }}
      onMouseEnter={() => note && setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      {icon} {display}
      {note && <span style={{ fontSize:7, marginLeft:2, opacity:0.5 }}>ⓘ</span>}
      {hovered && note && (
        <span className="card-stat-note-tooltip">{note}</span>
      )}
    </span>
  )
}

function StatWithTooltip({ icon, mainVal, tooltipLabel, tooltipVal, color, note }) {
  const [hovered, setHovered] = useState(false)
  const num = Number(mainVal)
  if (!mainVal || isNaN(num) || num === 0) return null
  const fmt = n => { const v = Number(n); return v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v) }
  const showSourceTip = tooltipVal && Number(tooltipVal) > 0 && tooltipLabel
  const hasAnyTip = showSourceTip || note
  return (
    <span
      className="card-stat-badge"
      style={{ color, borderColor: color+'40', background: color+'10', position:'relative', cursor: hasAnyTip ? 'help' : 'default' }}
      onMouseEnter={() => hasAnyTip && setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      {icon} {fmt(mainVal)}
      {hasAnyTip && <span style={{ fontSize:7, marginLeft:2, opacity:0.5 }}>ⓘ</span>}
      {hovered && hasAnyTip && (
        <span className="card-stat-note-tooltip">
          {showSourceTip && <div>{tooltipLabel}: {fmt(tooltipVal)}</div>}
          {note && <div style={{ marginTop: showSourceTip ? 4 : 0, color: 'var(--text3)', fontSize: 8.5, lineHeight: 1.35, whiteSpace: 'normal', maxWidth: 220 }}>{note}</div>}
        </span>
      )}
    </span>
  )
}

function CardStats({ post }) {
  const isX = post.platform === 'X' || post.platform === 'Twitter' ||
    (post.url||'').includes('twitter.com') || (post.url||'').includes('x.com')

  const xViews = isX ? Number(post.videoViews) || 0 : 0
  const sViews = Number(post.stats?.views) || 0
  const showViews = Math.max(xViews, sViews)
  const viewTooltipLabel = xViews > sViews ? 'Sprout' : xViews > 0 ? 'X API' : null
  const viewTooltipVal = xViews > sViews ? sViews : xViews > 0 && xViews < sViews ? xViews : null

  const xImp = isX ? Number(post.xImpressions) || 0 : 0
  const sImp = Number(post.stats?.impressions) || 0
  const showImp = Math.max(xImp, sImp)
  const impTooltipLabel = xImp > sImp ? 'Sprout' : xImp > 0 ? 'X API' : null
  const impTooltipVal = xImp > sImp ? sImp : xImp > 0 && xImp < sImp ? xImp : null

  const platformKey = isX ? 'X' : post.platform
  const viewsNote = getStatNote(platformKey, 'views')
  const impNote = getStatNote(platformKey, 'impressions')

  return (
    <div className="card-stats-row">
      {isX && showViews > 0 ? (
        <StatWithTooltip icon="👁" mainVal={showViews} color="#00e5ff"
          tooltipLabel={viewTooltipLabel} tooltipVal={viewTooltipVal} note={viewsNote} />
      ) : (
        <StatBadge icon="👁" value={post.stats?.views} color="#00e5ff" note={viewsNote} />
      )}
      <StatBadge icon="💬" value={post.stats?.engagement} color="#ff2d78" />
      {isX && showImp > 0 ? (
        <StatWithTooltip icon="📢" mainVal={showImp} color="#b44eff"
          tooltipLabel={impTooltipLabel} tooltipVal={impTooltipVal} note={impNote} />
      ) : (
        <StatBadge icon="📢" value={post.stats?.impressions} color="#b44eff" note={impNote} />
      )}
    </div>
  )
}

export default function Card({ post, onDelete, onMove, highlighted, selected, onToggleSelect, onUpdatePost, onClick }) {
  const [confirming, setConfirming] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null) // 'ok' | 'miss' | 'err'

  const pm = PLATFORMS[post.platform] || PLATFORMS.Other
  const isClip = post.mediaType === 'Clip'
  const typeLabel = isClip ? (post.clipIndex || 'Clip') : post.mediaType
  const tc = isClip ? CLIP_COLOR : (post.mediaType ? TYPE_COLORS[post.mediaType] : null)
  const hasSproutStats = post.stats && (post.stats.views || post.stats.impressions || post.stats.engagement)
  const hasXStats = (post.videoViews && Number(post.videoViews) > 0) || (post.xImpressions && Number(post.xImpressions) > 0)
  const hasStats = hasSproutStats || hasXStats

  async function handleSingleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      // Fetch from Sprout analytics for this specific URL
      const normUrl = normalizeUrl(post.syncUrl?.trim() || post.url || '')
      const now = new Date()
      const start = new Date(now); start.setDate(now.getDate() - 730)
      const fmt = d => d.toISOString().split('.')[0]

      const res = await fetch('/api/sprout?path=' + encodeURIComponent('analytics/posts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          filters: [
            'customer_profile_id.eq(7399621, 7399622, 7399624, 7399629, 7399638, 7399761, 7400399, 7400657, 7407559)',
            `created_time.in(${fmt(start)}..${fmt(now)})`,
          ],
          fields: ['perma_link', 'created_time'],
          metrics: ['lifetime.impressions', 'lifetime.engagements', 'lifetime.video_views', 'lifetime.views', 'lifetime.likes'],
          page: 1,
          limit: 200,
        }),
      })
      const data = await res.json()
      const sproutPosts = data?.data || []

      // Find matching post by URL
      const match = sproutPosts.find(sp => {
        const spUrl = normalizeUrl(sp.perma_link || sp.permalink || '')
        return spUrl === normUrl
      })

      const isXPost = (post.platform === 'X' || post.platform === 'Twitter' ||
        (post.url||'').includes('twitter.com') || (post.url||'').includes('x.com'))

      if (match) {
        // Use shared platform-aware mapping
        const stats = buildStatsPayload(post.platform, match.metrics || {})

        const updatePayload = { stats }

        // If Sprout has a publish date that differs significantly from our stored date,
        // update post.date and post.ts to reflect the actual publish time.
        if (match.created_time) {
          const sproutTs = new Date(match.created_time).getTime()
          if (isFinite(sproutTs) && sproutTs > 0) {
            const ONE_DAY = 86400000
            if (!post.ts || Math.abs(post.ts - sproutTs) > ONE_DAY) {
              const d = new Date(sproutTs)
              updatePayload.ts = sproutTs
              updatePayload.date = `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`
            }
          }
        }

        // For X posts, also fetch X API view count
        if (isXPost) {
          try {
            const xRes = await fetch('/api/x-stats', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: post.syncUrl?.trim() || post.url || '' }),
            })
            if (xRes.ok) {
              const xData = await xRes.json()
              if (xData.viewCount) updatePayload.videoViews = xData.viewCount
              if (xData.impressions) updatePayload.xImpressions = xData.impressions
            }
          } catch {}
        }

        // We always have lastSynced + at least empty stat strings, so the call is always meaningful
        await onUpdatePost(post.id, updatePayload)
        setSyncResult('ok')
      } else if (isXPost) {
        // No Sprout match but still try X API
        try {
          const xRes = await fetch('/api/x-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: post.syncUrl?.trim() || post.url || '' }),
          })
          if (xRes.ok) {
            const xData = await xRes.json()
            if (xData.viewCount || xData.impressions) {
              const xPayload = {}
              if (xData.viewCount) xPayload.videoViews = xData.viewCount
              if (xData.impressions) xPayload.xImpressions = xData.impressions
              await onUpdatePost(post.id, xPayload)
              setSyncResult('ok')
            } else { setSyncResult('miss') }
          } else { setSyncResult('miss') }
        } catch { setSyncResult('miss') }
      } else {
        setSyncResult('miss')
      }
    } catch {
      setSyncResult('err')
    }
    setSyncing(false)
    setTimeout(() => setSyncResult(null), 3000)
  }

  return (
    <div className={`card${highlighted ? ' card--highlighted' : ''}${selected ? ' selected' : ''}${onClick ? ' card--clickable' : ''}`}
      onClick={e => {
        if (e.shiftKey && onToggleSelect) {
          e.preventDefault()
          onToggleSelect(post.id)
          return
        }
        if (onClick && !confirming) onClick(post)
      }}>

      {onToggleSelect && (
        <div className={`card-checkbox${selected ? ' checked' : ''}`}
          onClick={e => { e.stopPropagation(); onToggleSelect(post.id) }}>
          {selected ? '✓' : ''}
        </div>
      )}

      <div className="card-pills-row">
        <div className="p-pill" style={{ background: pm.bg, color: pm.color }}>{post.platform}</div>
        {tc && <div className="p-pill" style={{ background: tc.bg, color: tc.color, borderColor: tc.border }}>{typeLabel}</div>}
        {post.episodeNumber && <div className="p-pill ep-pill">{post.episodeNumber}</div>}
      </div>

      <div className="card-title">{post.title}</div>

      {hasStats && (
        <CardStats post={post} />
      )}

      <div className="card-footer" onClick={e => e.stopPropagation()}>
        <span className="card-date">{post.date}</span>
        <div className="card-actions">
          <a className="act-btn" href={post.url} target="_blank" rel="noreferrer">Open ↗</a>
          <button className="act-btn act-edit" onClick={() => onMove(post)}>Edit</button>
          {onUpdatePost && (
            <button
              className="act-btn"
              style={{
                color: syncResult === 'ok' ? 'var(--green)' : syncResult === 'miss' ? 'var(--yellow)' : syncResult === 'err' ? 'var(--pink)' : 'var(--text3)',
                opacity: syncing ? 0.6 : 1,
              }}
              onClick={handleSingleSync}
              disabled={syncing}
              title="Sync stats from Sprout for this post">
              {syncing ? '⟳' : syncResult === 'ok' ? '✓ synced' : syncResult === 'miss' ? '— no match' : syncResult === 'err' ? '✕ err' : '⟳ sync'}
            </button>
          )}
          <button className="act-btn act-del" onClick={() => setConfirming(true)}>Remove</button>
        </div>
      </div>

      {confirming && (
        <div className="del-confirm">
          <span>Remove this post?</span>
          <div className="del-confirm-btns">
            <button className="del-no" onClick={e => { e.stopPropagation(); setConfirming(false) }}>No</button>
            <button className="del-yes" onClick={e => { e.stopPropagation(); onDelete(post.id) }}>Yes</button>
          </div>
        </div>
      )}
    </div>
  )
}
