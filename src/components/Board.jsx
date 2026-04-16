import { SHOWS, UNASSIGNED } from '../constants'
import Column from './Column'

export default function Board({ posts, onDelete, onMove, highlightedPostId }) {
  const unassignedPosts = posts.filter(p => !SHOWS.find(s => s.name === p.show))

  return (
    <div className="board">
      {SHOWS.map(show => (
        <Column key={show.name} show={show}
          posts={posts.filter(p => p.show === show.name)}
          onDelete={onDelete} onMove={onMove} highlightedPostId={highlightedPostId} />
      ))}
      {unassignedPosts.length > 0 && (
        <Column show={UNASSIGNED} posts={unassignedPosts}
          onDelete={onDelete} onMove={onMove} highlightedPostId={highlightedPostId} />
      )}
    </div>
  )
}
