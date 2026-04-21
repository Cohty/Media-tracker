import { useMemo, memo } from 'react'
import Card from './Card'
import EpisodeGroup from './EpisodeGroup'

function normalizeTitle(t) {
  return t.toLowerCase().trim().replace(/\s+/g, ' ')
}

const Column = memo(function Column({ show, posts, onDelete, onMove, highlightedPostId, selectedIds, onToggleSelect, onHide, onUpdatePost }) {
  const items = useMemo(() => {
    const epGroups = {}
    const titleGroups = {}
    const singles = []

    posts.forEach(post => {
      if (post.episodeNumber) {
        const key = post.episodeNumber
        if (!epGroups[key]) epGroups[key] = []
        epGroups[key].push(post)
      } else {
        const key = normalizeTitle(post.title)
        if (!titleGroups[key]) titleGroups[key] = []
        titleGroups[key].push(post)
      }
    })

    Object.values(epGroups).forEach(g => {
      g.sort((a, b) => {
        const ai = a.clipIndex === 'Clip' || !a.clipIndex ? 1 : parseInt(a.clipIndex.replace('Clip', '')) || 1
        const bi = b.clipIndex === 'Clip' || !b.clipIndex ? 1 : parseInt(b.clipIndex.replace('Clip', '')) || 1
        return ai - bi
      })
    })

    const result = []
    Object.entries(epGroups).forEach(([epNum, epPosts]) => {
      if (epPosts.length > 1) {
        result.push({ type: 'epGroup', key: epNum, label: epNum, posts: epPosts })
      } else {
        result.push({ type: 'card', key: epPosts[0].id, post: epPosts[0] })
      }
    })
    Object.entries(titleGroups).forEach(([normTitle, titlePosts]) => {
      if (titlePosts.length > 1) {
        result.push({ type: 'titleGroup', key: normTitle, label: titlePosts[0].title, posts: titlePosts })
      } else {
        singles.push(titlePosts[0])
      }
    })
    singles.forEach(post => result.push({ type: 'card', key: post.id, post }))
    return result
  }, [posts])

  return (
    <div className="column">
      <div className="col-titlebar" style={{ '--sc': show.hex }}>
        <span className="col-name">{show.name}</span>
        <div className="col-controls">
          <button className="col-ctrl">_</button>
          <button className="col-ctrl">□</button>
          <button className="col-ctrl" onClick={onHide} title="Hide column">×</button>
        </div>
      </div>
      <div className="col-body">
        <div className="col-subheader">
          <span className="col-badge-label">POSTS</span>
          <span className="col-badge" style={{ '--sc': show.hex }}>{posts.length}</span>
        </div>
        {posts.length === 0 && <div className="empty-col">NO POSTS YET</div>}
        {items.map(item => {
          if (item.type === 'epGroup' || item.type === 'titleGroup') {
            return <EpisodeGroup key={item.key} groupKey={item.key} label={item.label}
              isEpisode={item.type === 'epGroup'} posts={item.posts}
              onDelete={onDelete} onMove={onMove} highlightedPostId={highlightedPostId}
              selectedIds={selectedIds} onToggleSelect={onToggleSelect} onUpdatePost={onUpdatePost} />
          }
          return <Card key={item.key} post={item.post} onDelete={onDelete} onMove={onMove}
            highlighted={item.post.id === highlightedPostId}
            selected={selectedIds?.has(item.post.id)}
            onToggleSelect={onToggleSelect} onUpdatePost={onUpdatePost} />
        })}
      </div>
    </div>
  )
}
)
export default Column
