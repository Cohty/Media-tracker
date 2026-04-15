import Card from './Card'

export default function Column({ show, posts, onDelete }) {
  return (
    <div className="column">
      <div className="col-titlebar" style={{ '--sc': show.hex }}>
        <span className="col-name">{show.name}</span>
        <div className="col-controls">
          <button className="col-ctrl">_</button>
          <button className="col-ctrl">□</button>
          <button className="col-ctrl">×</button>
        </div>
      </div>
      <div className="col-body">
        <div className="col-subheader">
          <span className="col-badge-label">POSTS</span>
          <span className="col-badge" style={{ '--sc': show.hex }}>{posts.length}</span>
        </div>
        {posts.length === 0
          ? <div className="empty-col">NO POSTS YET</div>
          : posts.map(post => (
              <Card key={post.id} post={post} onDelete={onDelete} />
            ))
        }
      </div>
    </div>
  )
}
