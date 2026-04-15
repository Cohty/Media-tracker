import { useState } from 'react'
import { PLATFORMS } from '../constants'

const TYPE_COLORS = {
  'Full Episode': { color: '#39ff8c', bg: 'rgba(57,255,140,0.08)', border: 'rgba(57,255,140,0.25)' },
  'Broadcast':    { color: '#f0a020', bg: 'rgba(240,160,32,0.08)', border: 'rgba(240,160,32,0.25)' },
}
const CLIP_COLOR = { color: '#00e5ff', bg: 'rgba(0,229,255,0.08)', border: 'rgba(0,229,255,0.25)' }

function PostRow({ post, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const pm = PLATFORMS[post.platform] || PLATFORMS.Other
  const isClip = post.mediaType === 'Clip'
  const typeLabel = isClip ? (post.clipIndex || 'Clip') : post.mediaType
  const tc = isClip ? CLIP_COLOR : (post.mediaType ? TYPE_COLORS[post.mediaType] : null)

  return (
    <div className="ep-post-row">
      <div className="card-pills-row" style={{ marginBottom: 5 }}>
        <div className="p-pill" style={{ background: pm.bg, color: pm.color, '--pb': pm.pb }}>
          {post.platform}
        </div>
        {tc && (
          <div className="p-pill" style={{ background: tc.bg, color: tc.color, borderColor: tc.border }}>
            {typeLabel}
          </div>
        )}
      </div>
      <div className="card-title" style={{ marginBottom: 6 }}>{post.title}</div>
      <div className="card-footer">
        <span className="card-date">{post.date}</span>
        <div className="card-actions" style={{ opacity: 1 }}>
          <a className="act-btn" href={post.url} target="_blank" rel="noreferrer">Open ↗</a>
          <button className="act-btn act-del" onClick={() => setConfirming(true)}>Remove</button>
        </div>
      </div>
      {confirming && (
        <div className="del-confirm">
          <span>Remove this post?</span>
          <div className="del-confirm-btns">
            <button className="del-no" onClick={() => setConfirming(false)}>No</button>
            <button className="del-yes" onClick={() => onDelete(post.id)}>Yes</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EpisodeGroup({ episodeNumber, posts, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  // Unique platforms in this group
  const platforms = [...new Set(posts.map(p => p.platform))]
  // Clip labels (sorted: Clip, Clip2, Clip3...)
  const clipLabels = posts
    .filter(p => p.mediaType === 'Clip')
    .map(p => p.clipIndex || 'Clip')
    .sort((a, b) => {
      const na = a === 'Clip' ? 1 : parseInt(a.replace('Clip', ''))
      const nb = b === 'Clip' ? 1 : parseInt(b.replace('Clip', ''))
      return na - nb
    })
  const otherTypes = [...new Set(posts.filter(p => p.mediaType !== 'Clip').map(p => p.mediaType).filter(Boolean))]

  return (
    <div className={`ep-group${expanded ? ' expanded' : ''}`}>
      {/* Header — always visible */}
      <div className="ep-group-header" onClick={() => setExpanded(v => !v)}>
        <div className="ep-group-left">
          <span className="ep-group-num">EP {episodeNumber}</span>
          <span className="ep-group-count">{posts.length} post{posts.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="ep-group-right">
          <span className="ep-group-chevron">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Summary pills — visible when collapsed */}
      {!expanded && (
        <div className="ep-group-summary">
          <div className="card-pills-row" style={{ flexWrap: 'wrap', gap: 3 }}>
            {platforms.map(p => {
              const pm = PLATFORMS[p] || PLATFORMS.Other
              return (
                <span key={p} className="p-pill" style={{ background: pm.bg, color: pm.color }}>
                  {p}
                </span>
              )
            })}
            {clipLabels.map(label => (
              <span key={label} className="p-pill" style={{ background: CLIP_COLOR.bg, color: CLIP_COLOR.color, borderColor: CLIP_COLOR.border }}>
                {label}
              </span>
            ))}
            {otherTypes.map(t => {
              const tc = TYPE_COLORS[t]
              return tc ? (
                <span key={t} className="p-pill" style={{ background: tc.bg, color: tc.color, borderColor: tc.border }}>
                  {t}
                </span>
              ) : null
            })}
          </div>
        </div>
      )}

      {/* Expanded post list */}
      {expanded && (
        <div className="ep-group-posts">
          {posts.map((post, i) => (
            <div key={post.id}>
              {i > 0 && <div className="ep-post-divider" />}
              <PostRow post={post} onDelete={onDelete} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
