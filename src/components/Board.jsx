import { useState, useEffect } from 'react'
import { SHOWS, UNASSIGNED } from '../constants'
import Column from './Column'

const NEWSROOM = { name: 'Newsroom', hex: '#e0d0ff', bg: '#12101e', tc: '#c0b4e8' }
const EDITORIALS = { name: 'Editorials', hex: '#00a8ff', bg: '#001428', tc: '#00a8ff' }

const ALL_COLS = [...SHOWS, EDITORIALS, NEWSROOM]
const STORAGE_KEY = 'mt_hidden_cols'

function loadHidden() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) }
  catch { return new Set() }
}

function saveHidden(set) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])) } catch {}
}

export default function Board({ posts, onDelete, onMove, highlightedPostId, selectedIds, onToggleSelect }) {
  const [hidden, setHidden] = useState(loadHidden)

  function toggle(name) {
    setHidden(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      saveHidden(next)
      return next
    })
  }

  // All posts that don't match any known show
  const unassignedPosts = posts.filter(p =>
    !ALL_COLS.find(s => s.name === p.show)
  )

  // Posts per column (computed regardless of visibility for accurate counts)
  function colPosts(name) {
    if (name === 'Unassigned') return unassignedPosts
    return posts.filter(p => p.show === name)
  }

  return (
    <div>
      {/* Column toggle bar */}
      <div className="col-toggle-bar">
        <span className="col-toggle-label">COLUMNS</span>
        <div className="col-toggle-pills">
          {ALL_COLS.map(col => {
            const isHidden = hidden.has(col.name)
            const count = colPosts(col.name).length
            return (
              <button key={col.name}
                className={`col-toggle-pill${isHidden ? ' col-toggle-pill--off' : ''}`}
                style={!isHidden ? { color: col.hex, borderColor: col.hex + '55', background: col.hex + '12' } : {}}
                onClick={() => toggle(col.name)}
                title={isHidden ? `Show ${col.name}` : `Hide ${col.name}`}>
                <span className="col-toggle-dot" style={{ background: isHidden ? 'var(--border2)' : col.hex }} />
                {col.name}
                {count > 0 && <span className="col-toggle-count">{count}</span>}
                <span className="col-toggle-x">{isHidden ? '+' : '×'}</span>
              </button>
            )
          })}
          {unassignedPosts.length > 0 && (() => {
            const isHidden = hidden.has('Unassigned')
            return (
              <button
                className={`col-toggle-pill${isHidden ? ' col-toggle-pill--off' : ''}`}
                style={!isHidden ? { color: UNASSIGNED.hex, borderColor: UNASSIGNED.hex + '55', background: UNASSIGNED.hex + '12' } : {}}
                onClick={() => toggle('Unassigned')}
                title={isHidden ? 'Show Unassigned' : 'Hide Unassigned'}>
                <span className="col-toggle-dot" style={{ background: isHidden ? 'var(--border2)' : UNASSIGNED.hex }} />
                Unassigned
                <span className="col-toggle-count">{unassignedPosts.length}</span>
                <span className="col-toggle-x">{isHidden ? '+' : '×'}</span>
              </button>
            )
          })()}
        </div>
      </div>

      {/* Board */}
      <div className="board">
        {ALL_COLS.filter(col => !hidden.has(col.name)).map(col => (
          <Column key={col.name} show={col}
            posts={colPosts(col.name)}
            onDelete={onDelete} onMove={onMove}
            highlightedPostId={highlightedPostId}
            selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
        ))}
        {unassignedPosts.length > 0 && !hidden.has('Unassigned') && (
          <Column show={UNASSIGNED} posts={unassignedPosts}
            onDelete={onDelete} onMove={onMove}
            highlightedPostId={highlightedPostId}
            selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
        )}
      </div>
    </div>
  )
}
