import { SHOWS } from '../constants'
import Column from './Column'

export default function Board({ posts, onDelete }) {
  return (
    <div className="board">
      {SHOWS.map(show => (
        <Column
          key={show.name}
          show={show}
          posts={posts.filter(p => p.show === show.name)}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
