import { useState } from 'react'
import { PLATFORMS } from '../constants'

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
    const u = new URL(url.toLowerCase().trim())
    u.hostname = u.hostname.replace('x.com', 'twitter.com')
    u.search = ''
    return u.toString().replace(/\/$/, '')
  } catch { return url.toLowerCase().trim() }
}

function StatBadge({ icon, value, color }) {
  if (!value) return null
  const num = Number(value)
  if (isNaN(num) || num === 0) return null
  const display = num >= 1000 ? `${(num/1000).toFixed(1)}k` : num.toLocaleString()
  return (
    <span className="card-stat-badge" style={{ color, borderColor: color+'40', background: color+'10' }}>
      {icon} {display}
    </span>
  )
}

export default function Card({ post, onDelete, onMove, highlighted, selected, onToggleSelect, onUpdatePost }) {
  const [confirming, setConfirming] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null) // 'ok' | 'miss' | 'err'

  const pm = PLATFORMS[post.platform] || PLATFORMS.Other
  const isClip = post.mediaType === 'Clip'
  const typeLabel = isClip ? (post.clipIndex || 'Clip') : post.mediaType
  const tc = isClip ? CLIP_COLOR : (post.mediaType ? TYPE_COLORS[post.mediaType] : null)
  const hasStats = post.stats && (post.stats.views || post.stats.impressions || post.stats.engagement)

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: [
            'customer_profile_id.eq(7399621, 7399622, 7399624, 7399629, 7399638, 7399761, 7400399, 7400657, 7407559)',
            `created_time.in(${fmt(start)}..${fmt(now)})`,
          ],
          fields: ['perma_link', 'created_time'],
          metrics: ['lifetime.impressions', 'lifetime.engagements', 'lifetime.video_views', 'lifetime.likes'],
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

      if (match) {
        const m = match.metrics || {}
        const stats = {}
        const views = m['lifetime.video_views'] || m['lifetime.impressions'] || 0
        const engagement = m['lifetime.engagements'] || 0
        const impressions = m['lifetime.impressions'] || 0
        if (views > 0)       stats.views = String(views)
        if (engagement > 0)  stats.engagement = String(engagement)
        if (impressions > 0) stats.impressions = String(impressions)
        stats.lastSynced = Date.now()
        if (Object.keys(stats).length > 1) {
          await onUpdatePost(post.id, { stats })
          setSyncResult('ok')
        } else {
          setSyncResult('miss')
        }
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
    <div className={`card${highlighted ? ' card--highlighted' : ''}${selected ? ' selected' : ''}`}
      onClick={e => { if (e.shiftKey && onToggleSelect) { e.preventDefault(); onToggleSelect(post.id) } }}>

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
        <div className="card-stats-row">
          <StatBadge icon="👁" value={post.stats.views}       color="#00e5ff" />
          <StatBadge icon="💬" value={post.stats.engagement}  color="#ff2d78" />
          <StatBadge icon="📢" value={post.stats.impressions} color="#b44eff" />
        </div>
      )}

      <div className="card-footer">
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
            <button className="del-no" onClick={() => setConfirming(false)}>No</button>
            <button className="del-yes" onClick={() => onDelete(post.id)}>Yes</button>
          </div>
        </div>
      )}
    </div>
  )
}
