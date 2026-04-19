import { useState } from 'react'
import { SHOWS, UNASSIGNED } from '../constants'
import Column from './Column'

const STORAGE_KEY = 'mt_hidden_cols'

function loadHidden() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) }
  catch { return new Set() }
}

function saveHidden(set) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])) } catch {}
}

export default function Board({ posts, onDelete, onMove, highlightedPostId, selectedIds, onToggleSelect, onUpdatePost }) {
  const [hidden, setHidden] = useState(loadHidden)

  function toggle(name) {
    setHidden(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      saveHidden(next)
      return next
    })
  }

  const unassignedPosts = posts.filter(p => !SHOWS.find(s => s.name === p.show))

  const allCols = [
    ...SHOWS,
    ...(unassignedPosts.length > 0 ? [UNASSIGNED] : []),
  ]

  return (
    <div>
      {/* Column toggle bar */}
      <div className="col-toggle-bar">
        <span className="col-toggle-label">COLUMNS</span>
        <div className="col-toggle-pills">
          {allCols.map(col => {
            const isHidden = hidden.has(col.name)
            const count = col.name === 'Unassigned'
              ? unassignedPosts.length
              : posts.filter(p => p.show === col.name).length
            return (
              <button key={col.name}
                className={`col-toggle-pill${isHidden ? ' col-toggle-pill--off' : ''}`}
                style={!isHidden ? { color: col.hex, borderColor: col.hex + '55', background: col.hex + '12' } : {}}
                onClick={() => toggle(col.name)}>
                <span className="col-toggle-dot" style={{ background: isHidden ? 'var(--border2)' : col.hex }} />
                {col.name}
                {count > 0 && <span className="col-toggle-count">{count}</span>}
                <span className="col-toggle-x">{isHidden ? '+' : '×'}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Board */}
      <div className="board">
        {SHOWS.filter(show => !hidden.has(show.name)).map(show => (
          <Column key={show.name} show={show}
            posts={posts.filter(p => p.show === show.name)}
            onDelete={onDelete} onMove={onMove}
            highlightedPostId={highlightedPostId}
            selectedIds={selectedIds} onToggleSelect={onToggleSelect}
            onHide={() => toggle(show.name)} onUpdatePost={onUpdatePost} />
        ))}
        {unassignedPosts.length > 0 && !hidden.has('Unassigned') && (
          <Column show={UNASSIGNED} posts={unassignedPosts}
            onDelete={onDelete} onMove={onMove}
            highlightedPostId={highlightedPostId}
            selectedIds={selectedIds} onToggleSelect={onToggleSelect}
            onHide={() => toggle('Unassigned')} onUpdatePost={onUpdatePost} />
        )}
      </div>
    </div>
  )
}
