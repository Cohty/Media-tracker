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
