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

export default function BatchBar({ selectedIds, posts, onDelete, onRetag, onClear }) {
  const [retagShow, setRetagShow] = useState('')
  const [retagType, setRetagType] = useState('')
  const [retagEpisode, setRetagEpisode] = useState('')
  const [confirming, setConfirming] = useState(false)

  if (selectedIds.size === 0) return null

  const selectedPosts = posts.filter(p => selectedIds.has(p.id))

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
      </div>

      <div className="batch-bar-right">
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
