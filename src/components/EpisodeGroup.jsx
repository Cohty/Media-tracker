import { useState, useEffect } from 'react'
import { getAuthHeaders } from '../hooks/useUser'
import { PLATFORMS } from '../constants'
import { buildStatsPayload } from '../lib/statMapping'

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

function PostRow({ post, onDelete, onMove, highlighted, selected, onToggleSelect, onUpdatePost, onClick }) {
  const [confirming, setConfirming] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const pm = PLATFORMS[post.platform] || PLATFORMS.Other
  const isClip = post.mediaType === 'Clip'
  const typeLabel = isClip ? (post.clipIndex || 'Clip') : post.mediaType
  const tc = isClip ? CLIP_COLOR : (post.mediaType ? TYPE_COLORS[post.mediaType] : null)

  async function handleSingleSync() {
    setSyncing(true); setSyncResult(null)
    try {
      const normUrl = normalizeUrl(post.url || '')
      const now = new Date()
      const start = new Date(now); start.setDate(now.getDate() - 730)
      const fmt = d => d.toISOString().replace('Z','').split('.')[0]
      const res = await fetch('/api/sprout?path=' + encodeURIComponent('analytics/posts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          filters: [
            'customer_profile_id.eq(7399621, 7399622, 7399624, 7399629, 7399638, 7399761, 7400399, 7400657, 7407559)',
            `created_time.in(${fmt(start)}..${fmt(now)})`,
          ],
          fields: ['perma_link', 'created_time'],
          metrics: ['lifetime.impressions', 'lifetime.engagements', 'lifetime.video_views', 'lifetime.views'],
          page: 1, limit: 200,
        }),
      })
      const data = await res.json()
      const match = (data?.data || []).find(sp => normalizeUrl(sp.perma_link || '') === normUrl)
      if (match) {
        const stats = buildStatsPayload(post.platform, match.metrics || {})
        const updatePayload = { stats }
        // Pull actual publish date from Sprout if it differs significantly
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
        await onUpdatePost(post.id, updatePayload)
        setSyncResult('ok')
      } else { setSyncResult('miss') }
    } catch { setSyncResult('err') }
    setSyncing(false)
    setTimeout(() => setSyncResult(null), 3000)
  }

  return (
    <div className={`ep-post-row${highlighted ? ' ep-post-row--highlighted' : ''}${selected ? ' selected' : ''}${onClick ? ' card--clickable' : ''}`}
      style={{ position: 'relative' }}
      onClick={e => {
        if (e.shiftKey && onToggleSelect) {
          e.preventDefault()
          onToggleSelect(post.id)
          return
        }
        if (onClick && !confirming) onClick(post)
      }}>

      {/* Checkbox */}
      {onToggleSelect && (
        <div
          className={`card-checkbox${selected ? ' checked' : ''}`}
          style={{ position: 'absolute', top: 6, right: 6 }}
          onClick={e => { e.stopPropagation(); onToggleSelect(post.id) }}>
          {selected ? '✓' : ''}
        </div>
      )}

      <div className="card-pills-row" style={{ marginBottom: 5 }}>
        <div className="p-pill" style={{ background: pm.bg, color: pm.color }}>{post.platform}</div>
        {tc && <div className="p-pill" style={{ background: tc.bg, color: tc.color, borderColor: tc.border }}>{typeLabel}</div>}
      </div>
      <div className="card-title" style={{ marginBottom: 6 }}>{post.title}</div>

      {/* Stats badges - uses higher of X API vs Sprout */}
      {(() => {
        const isX = post.platform === 'X' || post.platform === 'Twitter' ||
          (post.url||'').includes('twitter.com') || (post.url||'').includes('x.com')
        const showViews = Math.max(isX ? Number(post.videoViews)||0 : 0, Number(post.stats?.views)||0)
        const showImp = Math.max(isX ? Number(post.xImpressions)||0 : 0, Number(post.stats?.impressions)||0)
        const eng = Number(post.stats?.engagement)||0
        const fmt = n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n)
        if (!showViews && !eng && !showImp) return null
        return (
          <div className="card-stats-row" style={{ marginBottom: 6 }}>
            {showViews > 0 && <span className="card-stat-badge" style={{ color:'#00e5ff', borderColor:'#00e5ff40', background:'#00e5ff10' }}>👁 {fmt(showViews)}</span>}
            {eng > 0 && <span className="card-stat-badge" style={{ color:'#ff2d78', borderColor:'#ff2d7840', background:'#ff2d7810' }}>💬 {fmt(eng)}</span>}
            {showImp > 0 && <span className="card-stat-badge" style={{ color:'#b44eff', borderColor:'#b44eff40', background:'#b44eff10' }}>📢 {fmt(showImp)}</span>}
          </div>
        )
      })()}

      <div className="card-footer" onClick={e => e.stopPropagation()}>
        <span className="card-date">{post.date}</span>
        <div className="card-actions" style={{ opacity: 1 }}>
          <a className="act-btn" href={post.url} target="_blank" rel="noreferrer">Open ↗</a>
          <button className="act-btn act-edit" onClick={() => onMove(post)}>Edit</button>
          {onUpdatePost && (
            <button className="act-btn"
              title={syncResult==='ok' ? 'Synced!' : syncResult==='miss' ? 'No match in Sprout' : 'Sync stats from Sprout'}
              style={{ color: syncResult==='ok' ? 'var(--green)' : syncResult==='miss' ? 'var(--yellow)' : syncResult==='err' ? 'var(--pink)' : 'var(--text3)', minWidth: 18 }}
              onClick={handleSingleSync} disabled={syncing}>
              {syncing ? '⟳' : syncResult==='ok' ? '✓' : syncResult==='miss' ? '—' : '⟳'}
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

export default function EpisodeGroup({ groupKey, label, isEpisode, posts, onDelete, onMove, highlightedPostId, selectedIds, onToggleSelect, onUpdatePost, onClick }) {
  const containsHighlighted = posts.some(p => p.id === highlightedPostId)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (containsHighlighted) setExpanded(true)
  }, [containsHighlighted])

  const platforms = [...new Set(posts.map(p => p.platform))]
  const clipLabels = posts.filter(p => p.mediaType === 'Clip').map(p => p.clipIndex || 'Clip')
    .sort((a, b) => {
      const na = a === 'Clip' ? 1 : parseInt(a.replace('Clip', ''))
      const nb = b === 'Clip' ? 1 : parseInt(b.replace('Clip', ''))
      return na - nb
    })
  const otherTypes = [...new Set(posts.filter(p => p.mediaType !== 'Clip').map(p => p.mediaType).filter(Boolean))]
  const isNumericLabel = /^\d+$/.test(label)
  const displayLabel = isEpisode && isNumericLabel
    ? `EP ${label}`
    : (label.length > 26 ? label.slice(0, 26) + '…' : label)

  // How many in this group are selected
  const selectedCount = posts.filter(p => selectedIds?.has(p.id)).length
  const allSelected = selectedCount === posts.length && posts.length > 0

  function toggleAll(e) {
    e.stopPropagation()
    if (!onToggleSelect) return
    posts.forEach(p => {
      const isSelected = selectedIds?.has(p.id)
      if (allSelected ? isSelected : !isSelected) onToggleSelect(p.id)
    })
  }

  return (
    <div className={`ep-group${expanded ? ' expanded' : ''}${containsHighlighted ? ' ep-group--highlighted' : ''}`}>
      <div className="ep-group-header" onClick={() => setExpanded(v => !v)}>
        <div className="ep-group-left">
          <span className="ep-group-num" style={!isEpisode ? { fontSize: 10, color: 'var(--cyan)', textShadow: '0 0 8px rgba(0,229,255,0.4)' } : {}}>
            {displayLabel}
          </span>
          <span className="ep-group-count">{posts.length} post{posts.length !== 1 ? 's' : ''}</span>
          {/* Batch select all in group */}
          {onToggleSelect && (
            <div
              className={`card-checkbox${allSelected ? ' checked' : selectedCount > 0 ? ' partial' : ''}`}
              style={{ position: 'relative', top: 'unset', right: 'unset', marginLeft: 4, flexShrink: 0 }}
              onClick={toggleAll}
              title={allSelected ? 'Deselect all in group' : 'Select all in group'}>
              {allSelected ? '✓' : selectedCount > 0 ? '–' : ''}
            </div>
          )}
        </div>
        <div className="ep-group-right">
          <span className="ep-group-chevron">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {!expanded && (
        <div className="ep-group-summary">
          <div className="card-pills-row" style={{ flexWrap: 'wrap', gap: 3 }}>
            {platforms.map(p => { const pm = PLATFORMS[p] || PLATFORMS.Other; return <span key={p} className="p-pill" style={{ background: pm.bg, color: pm.color }}>{p}</span> })}
            {clipLabels.map(l => <span key={l} className="p-pill" style={{ background: CLIP_COLOR.bg, color: CLIP_COLOR.color, borderColor: CLIP_COLOR.border }}>{l}</span>)}
            {otherTypes.map(t => { const tc = TYPE_COLORS[t]; return tc ? <span key={t} className="p-pill" style={{ background: tc.bg, color: tc.color, borderColor: tc.border }}>{t}</span> : null })}
          </div>

          {/* Total metrics across all posts in the group */}
          {(() => {
            const totalViews = posts.reduce((s, p) => {
              const isX = p.platform === 'X' || p.platform === 'Twitter' || (p.url||'').includes('twitter.com') || (p.url||'').includes('x.com')
              return s + ((isX && p.videoViews && Number(p.videoViews) > 0) ? Number(p.videoViews) : Number(p.stats?.views) || 0)
            }, 0)
            const totalEng   = posts.reduce((s, p) => s + (Number(p.stats?.engagement) || 0), 0)
            const totalImp   = posts.reduce((s, p) => {
              const isX = p.platform === 'X' || p.platform === 'Twitter' || (p.url||'').includes('twitter.com') || (p.url||'').includes('x.com')
              return s + Math.max(isX ? Number(p.xImpressions) || 0 : 0, Number(p.stats?.impressions) || 0)
            }, 0)
            const fmt = n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n)
            if (totalViews === 0 && totalEng === 0 && totalImp === 0) return null
            return (
              <div className="card-stats-row" style={{ marginTop: 5 }}>
                {totalViews > 0 && <span className="card-stat-badge" style={{ color:'#00e5ff', borderColor:'#00e5ff40', background:'#00e5ff10' }}>👁 {fmt(totalViews)}</span>}
                {totalEng > 0   && <span className="card-stat-badge" style={{ color:'#ff2d78', borderColor:'#ff2d7840', background:'#ff2d7810' }}>💬 {fmt(totalEng)}</span>}
                {totalImp > 0   && <span className="card-stat-badge" style={{ color:'#b44eff', borderColor:'#b44eff40', background:'#b44eff10' }}>📢 {fmt(totalImp)}</span>}
              </div>
            )
          })()}

          {posts[0]?.date && (
            <div style={{ fontFamily: 'DM Mono', fontSize: 8, color: 'var(--text3)', marginTop: 4 }}>
              {posts[0].date}
            </div>
          )}
        </div>
      )}

      {expanded && (
        <div className="ep-group-posts">
          {posts.map((post, i) => (
            <div key={post.id}>
              {i > 0 && <div className="ep-post-divider" />}
              <PostRow post={post} onDelete={onDelete} onMove={onMove}
                highlighted={post.id === highlightedPostId}
                selected={selectedIds?.has(post.id)}
                onToggleSelect={onToggleSelect} onUpdatePost={onUpdatePost}
                onClick={onClick} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
