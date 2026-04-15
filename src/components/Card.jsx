import { useState } from 'react'
import { PLATFORMS } from '../constants'

export default function Card({ post, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const pm = PLATFORMS[post.platform] || PLATFORMS.Other

  return (
    <div className="card">
      <div
        className="p-pill"
        style={{ background: pm.bg, color: pm.color, '--pb': pm.pb }}
      >
        {post.platform}
      </div>
      <div className="card-title">{post.title}</div>
      <div className="card-footer">
        <span className="card-date">{post.date}</span>
        <div className="card-actions">
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
