import { SHOWS, UNASSIGNED } from '../constants'
import Column from './Column'

export default function Board({ posts, onDelete, onMove, highlightedPostId, selectedIds, onToggleSelect, onUpdatePost, hiddenCols, onToggleHiddenCol }) {
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
            const isHidden = hiddenCols.has(col.name)
            const count = col.name === 'Unassigned'
              ? unassignedPosts.length
              : posts.filter(p => p.show === col.name).length
            return (
              <button key={col.name}
                className={`col-toggle-pill${isHidden ? ' col-toggle-pill--off' : ''}`}
                style={!isHidden ? { color: col.hex, borderColor: col.hex + '55', background: col.hex + '12' } : {}}
                onClick={() => onToggleHiddenCol(col.name)}>
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
        {SHOWS.filter(show => !hiddenCols.has(show.name)).map(show => (
          <Column key={show.name} show={show}
            posts={posts.filter(p => p.show === show.name)}
            onDelete={onDelete} onMove={onMove}
            highlightedPostId={highlightedPostId}
            selectedIds={selectedIds} onToggleSelect={onToggleSelect}
            onHide={() => onToggleHiddenCol(show.name)} onUpdatePost={onUpdatePost} />
        ))}
        {unassignedPosts.length > 0 && !hiddenCols.has('Unassigned') && (
          <Column show={UNASSIGNED} posts={unassignedPosts}
            onDelete={onDelete} onMove={onMove}
            highlightedPostId={highlightedPostId}
            selectedIds={selectedIds} onToggleSelect={onToggleSelect}
            onHide={() => onToggleHiddenCol('Unassigned')} onUpdatePost={onUpdatePost} />
        )}
      </div>
    </div>
  )
}
