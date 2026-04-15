import Card from './Card'

export default function Column({ show, posts, onDelete }) {
  return (
    <div className="column">
      <div
        className="col-header"
        style={{ '--sc': show.hex }}
      >
        <span className="col-name">{show.name}</span>
        <span className="col-badge">{posts.length}</span>
      </div>
      <div className="cards">
        {posts.length === 0
          ? <div className="empty-col">No posts yet</div>
          : posts.map(post => (
              <Card key={post.id} post={post} onDelete={onDelete} />
            ))
        }
      </div>
    </div>
  )
}
