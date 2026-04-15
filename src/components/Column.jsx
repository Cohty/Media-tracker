import { useMemo } from 'react'
import Card from './Card'
import EpisodeGroup from './EpisodeGroup'

export default function Column({ show, posts, onDelete }) {
  const { groups, singles } = useMemo(() => {
    const grouped = {}
    const singles = []

    posts.forEach(post => {
      if (post.episodeNumber) {
        if (!grouped[post.episodeNumber]) grouped[post.episodeNumber] = []
        grouped[post.episodeNumber].push(post)
      } else {
        singles.push(post)
      }
    })

    // Sort each group by clip index then timestamp
    Object.values(grouped).forEach(g => {
      g.sort((a, b) => {
        const ai = a.clipIndex === 'Clip' ? 1 : parseInt((a.clipIndex || 'Clip1').replace('Clip', '')) || 1
        const bi = b.clipIndex === 'Clip' ? 1 : parseInt((b.clipIndex || 'Clip1').replace('Clip', '')) || 1
        return ai - bi
      })
    })

    return { groups: grouped, singles }
  }, [posts])

  const hasContent = posts.length > 0

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

        {!hasContent && <div className="empty-col">NO POSTS YET</div>}

        {/* Episode groups */}
        {Object.entries(groups).map(([epNum, epPosts]) => (
          epPosts.length === 1
            ? <Card key={epPosts[0].id} post={epPosts[0]} onDelete={onDelete} />
            : <EpisodeGroup key={epNum} episodeNumber={epNum} posts={epPosts} onDelete={onDelete} />
        ))}

        {/* Posts without episode number */}
        {singles.map(post => (
          <Card key={post.id} post={post} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}
