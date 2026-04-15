import { useState } from 'react'
import { PLATFORMS } from '../constants'

const TYPE_COLORS = {
  'Full Episode': { color: '#39ff8c', bg: 'rgba(57,255,140,0.08)', border: 'rgba(57,255,140,0.25)' },
  'Broadcast':    { color: '#f0a020', bg: 'rgba(240,160,32,0.08)', border: 'rgba(240,160,32,0.25)' },
  'Article':      { color: '#b44eff', bg: 'rgba(180,78,255,0.08)', border: 'rgba(180,78,255,0.25)' },
}
const CLIP_COLOR = { color: '#00e5ff', bg: 'rgba(0,229,255,0.08)', border: 'rgba(0,229,255,0.25)' }

export default function Card({ post, onDelete, onMove, highlighted }) {
  const [confirming, setConfirming] = useState(false)
  const pm = PLATFORMS[post.platform] || PLATFORMS.Other
  const isClip = post.mediaType === 'Clip'
  const typeLabel = isClip ? (post.clipIndex || 'Clip') : post.mediaType
  const tc = isClip ? CLIP_COLOR : (post.mediaType ? TYPE_COLORS[post.mediaType] : null)

  return (
    <div className={`card${highlighted ? ' card--highlighted' : ''}`}>
      <div className="card-pills-row">
        <div className="p-pill" style={{ background: pm.bg, color: pm.color, '--pb': pm.pb }}>{post.platform}</div>
        {tc && <div className="p-pill" style={{ background: tc.bg, color: tc.color, borderColor: tc.border }}>{typeLabel}</div>}
        {post.episodeNumber && <div className="p-pill ep-pill">{post.episodeNumber}</div>}
      </div>
      <div className="card-title">{post.title}</div>
      <div className="card-footer">
        <span className="card-date">{post.date}</span>
        <div className="card-actions">
          <a className="act-btn" href={post.url} target="_blank" rel="noreferrer">Open ↗</a>
          <button className="act-btn act-edit" onClick={() => onMove(post)}>Edit</button>
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
