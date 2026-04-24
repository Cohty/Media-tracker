import { useState } from 'react'
import { SHOWS, MEDIA_TYPES } from '../constants'

function exportCSV(posts) {
  const rows = [
    ['Title', 'Show', 'Platform', 'Media Type', 'Episode', 'Date', 'Views', 'Engagement', 'Impressions', 'URL'],
    ...posts.map(p => [
      `"${(p.title || '').replace(/"/g, '""')}"`,
      `"${p.show || ''}"`,
      p.platform || '',
      p.mediaType || '',
      p.episodeNumber || '',
      p.date || '',
      p.stats?.views || '',
      p.stats?.engagement || '',
      p.stats?.impressions || '',
      `"${p.url || ''}"`,
    ])
  ]
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `media-tracker-export-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function fmt(n) {
  const v = Number(n)
  if (!v || isNaN(v)) return '—'
  if (v >= 1000000) return `${(v/1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v/1000).toFixed(1)}k`
  return String(v)
}

export default function BatchBar({ selectedIds, posts, onDelete, onRetag, onClear, onCompare }) {
  const [retagShow, setRetagShow] = useState('')
  const [retagType, setRetagType] = useState('')
  const [retagEpisode, setRetagEpisode] = useState('')
  const [confirming, setConfirming] = useState(false)

  if (selectedIds.size === 0) return null

  // Use ALL posts (not date-filtered) so metrics are accurate for cross-range selections
  const selectedPosts = posts.filter(p => selectedIds.has(p.id))

  // Compute combined metrics for selected posts
  const totalViews = selectedPosts.reduce((s, p) => {
    const isX = p.platform === 'X' || p.platform === 'Twitter' || (p.url||'').includes('twitter.com') || (p.url||'').includes('x.com')
    return s + Math.max(isX ? Number(p.videoViews)||0 : 0, Number(p.stats?.views)||0)
  }, 0)
  const totalEng = selectedPosts.reduce((s, p) => s + (Number(p.stats?.engagement)||0), 0)
  const totalImp = selectedPosts.reduce((s, p) => {
    const isX = p.platform === 'X' || p.platform === 'Twitter' || (p.url||'').includes('twitter.com') || (p.url||'').includes('x.com')
    return s + Math.max(isX ? Number(p.xImpressions)||0 : 0, Number(p.stats?.impressions)||0)
  }, 0)

  async function handleRetag() {
    if (!retagShow && !retagType && !retagEpisode) return
    const updates = {}
    if (retagShow) updates.show = retagShow
    if (retagType) updates.mediaType = retagType
    if (retagEpisode) updates.episodeNumber = retagEpisode
    await onRetag([...selectedIds], updates)
    onClear()
    setRetagShow('')
    setRetagType('')
    setRetagEpisode('')
  }

  async function handleDelete() {
    await onDelete([...selectedIds])
    onClear()
    setConfirming(false)
  }

  return (
    <div className="batch-bar">
      <div className="batch-bar-left">
        <span className="batch-count">{selectedIds.size} selected</span>
        <button className="batch-clear" onClick={onClear}>✕ Clear</button>
        {totalViews > 0 && (
          <span style={{ fontFamily:'DM Mono', fontSize:9, color:'#00e5ff', marginLeft:8 }}>
            👁 {fmt(totalViews)}
          </span>
        )}
        {totalEng > 0 && (
          <span style={{ fontFamily:'DM Mono', fontSize:9, color:'#ff2d78', marginLeft:6 }}>
            💬 {fmt(totalEng)}
          </span>
        )}
        {totalImp > 0 && (
          <span style={{ fontFamily:'DM Mono', fontSize:9, color:'#b44eff', marginLeft:6 }}>
            📢 {fmt(totalImp)}
          </span>
        )}
      </div>

      <div className="batch-bar-right">
        {/* Compare — only when exactly 2 selected */}
        {selectedIds.size === 2 && (
          <>
            <button className="batch-btn batch-btn--compare"
              onClick={() => onCompare(selectedPosts)}
              title="Compare these two posts side by side">
              ⚔ Compare
            </button>
            <div className="batch-divider" />
          </>
        )}

        {/* CSV Export */}
        <button className="batch-btn batch-btn--export" onClick={() => exportCSV(selectedPosts)}
          title="Export selected posts with views, engagement & impressions">
          ⬇ Export CSV
        </button>

        <div className="batch-divider" />

        {/* Retag controls */}
        <select className="batch-select" value={retagShow} onChange={e => setRetagShow(e.target.value)}>
          <option value="">Move to show…</option>
          {SHOWS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          <option value="Newsroom">Newsroom</option>
          <option value="Unassigned">Unassigned</option>
        </select>
        <select className="batch-select" value={retagType} onChange={e => setRetagType(e.target.value)}>
          <option value="">Change type…</option>
          {MEDIA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="batch-btn batch-btn--apply" disabled={!retagShow && !retagType} onClick={handleRetag}>
          Apply
        </button>

        <div className="batch-divider" />

        {/* Delete */}
        {confirming ? (
          <>
            <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--pink)' }}>
              Delete {selectedIds.size}?
            </span>
            <button className="batch-btn batch-btn--confirm" onClick={handleDelete}>Yes</button>
            <button className="batch-btn" onClick={() => setConfirming(false)}>No</button>
          </>
        ) : (
          <button className="batch-btn batch-btn--delete" onClick={() => setConfirming(true)}>
            🗑 Delete {selectedIds.size}
          </button>
        )}
      </div>
    </div>
  )
}
