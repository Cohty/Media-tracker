import { useState, useEffect } from 'react'
import { PLATFORMS } from '../constants'

const TYPE_COLORS = {
  'Full Episode':  { color: '#39ff8c', bg: 'rgba(57,255,140,0.08)', border: 'rgba(57,255,140,0.25)' },
  'Broadcast':     { color: '#f0a020', bg: 'rgba(240,160,32,0.08)', border: 'rgba(240,160,32,0.25)' },
  'Article':       { color: '#b44eff', bg: 'rgba(180,78,255,0.08)', border: 'rgba(180,78,255,0.25)' },
  'Partner Post':  { color: '#ff9de2', bg: 'rgba(255,157,226,0.08)', border: 'rgba(255,157,226,0.25)' },
}
const CLIP_COLOR = { color: '#00e5ff', bg: 'rgba(0,229,255,0.08)', border: 'rgba(0,229,255,0.25)' }

function PostRow({ post, onDelete, onMove, highlighted, selected, onToggleSelect }) {
  const [confirming, setConfirming] = useState(false)
  const pm = PLATFORMS[post.platform] || PLATFORMS.Other
  const isClip = post.mediaType === 'Clip'
  const typeLabel = isClip ? (post.clipIndex || 'Clip') : post.mediaType
  const tc = isClip ? CLIP_COLOR : (post.mediaType ? TYPE_COLORS[post.mediaType] : null)

  return (
    <div className={`ep-post-row${highlighted ? ' ep-post-row--highlighted' : ''}${selected ? ' selected' : ''}`}
      style={{ position: 'relative' }}>

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
      <div className="card-footer">
        <span className="card-date">{post.date}</span>
        <div className="card-actions" style={{ opacity: 1 }}>
          <a className="act-btn" href={post.url} target="_blank" rel="noreferrer">Open ↗</a>
          <button className="act-btn act-edit" onClick={() => onMove(post)}>Edit</button>
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

export default function EpisodeGroup({ groupKey, label, isEpisode, posts, onDelete, onMove, highlightedPostId, selectedIds, onToggleSelect }) {
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
                onToggleSelect={onToggleSelect} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
