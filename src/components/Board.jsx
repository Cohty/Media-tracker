import { SHOWS } from '../constants'
import Column from './Column'

export default function Board({ posts, onDelete, onMove, highlightedPostId }) {
  return (
    <div className="board">
      {SHOWS.map(show => (
        <Column
          key={show.name}
          show={show}
          posts={posts.filter(p => p.show === show.name)}
          onDelete={onDelete}
          onMove={onMove}
          highlightedPostId={highlightedPostId}
        />
      ))}
    </div>
  )
}
