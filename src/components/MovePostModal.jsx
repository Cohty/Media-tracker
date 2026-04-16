import { useState, useEffect, useMemo } from 'react'
import { SHOWS, MEDIA_TYPES } from '../constants'

const ALL_SHOWS = [
  ...SHOWS.map(s => s.name),
  'Newsroom',
  'Editorials',
  'Unassigned',
]

export default function MovePostModal({ post, isOpen, onClose, onSave, posts }) {
  const [show, setShow] = useState('')
  const [mediaType, setMediaType] = useState('')
  const [episodeNumber, setEpisodeNumber] = useState('')

  // Reset form when post changes
  useEffect(() => {
    if (post) {
      setShow(post.show || SHOWS[0].name)
      setMediaType(post.mediaType || 'Full Episode')
      setEpisodeNumber(post.episodeNumber || '')
    }
  }, [post?.id, isOpen])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const clipIndex = useMemo(() => {
    if (!post || mediaType !== 'Clip') return ''
    const count = posts.filter(p =>
      p.id !== post.id &&
      p.show === show &&
      p.mediaType === 'Clip' &&
      p.episodeNumber === episodeNumber
    ).length
    return count === 0 ? 'Clip' : `Clip${count + 1}`
  }, [mediaType, show, episodeNumber, posts, post])

  function handleSave() {
    const updates = {
      show,
      mediaType,
      episodeNumber,
      clipIndex: mediaType === 'Clip' ? clipIndex : '',
    }
    onSave(post.id, updates)
    onClose()
  }

  const hasChanges = post && (
    show !== (post.show || '') ||
    mediaType !== (post.mediaType || '') ||
    episodeNumber !== (post.episodeNumber || '')
  )

  if (!post || !isOpen) return null

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-titlebar" style={{ background: 'linear-gradient(90deg, #001a40, #004080)' }}>
          <span className="modal-titlebar-text">✦ Edit Post</span>
          <div className="modal-titlebar-controls">
            <button className="modal-ctrl">_</button>
            <button className="modal-ctrl">□</button>
            <button className="modal-ctrl" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body">
          {/* Post preview */}
          <div className="move-post-preview">
            <div style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--text3)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.8px' }}>Moving</div>
            <div style={{ fontFamily:'Syne', fontSize:12, color:'var(--text)', lineHeight:1.4 }}>{post.title}</div>
            <div style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--text3)', marginTop:3 }}>{post.platform} · {post.date}</div>
          </div>

          <div className="modal-row">
            <div className="field">
              <label>Show</label>
              <select value={show} onChange={e => setShow(e.target.value)}>
                {ALL_SHOWS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Media Type</label>
              <select value={mediaType} onChange={e => setMediaType(e.target.value)}>
                {MEDIA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>
              Episode # or Label
              <span style={{ color:'var(--text3)', fontWeight:400 }}> (optional — e.g. 73, Polymarket, Q1)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 73, Polymarket, Q1..."
              value={episodeNumber}
              onChange={e => setEpisodeNumber(e.target.value)}
              autoComplete="off"
            />
            {mediaType === 'Clip' && (
              <div className="clip-index-preview">
                <span className="clip-index-arrow">→</span>
                <span>will be labeled</span>
                <span className="clip-index-badge">{clipIndex || 'Clip'}</span>
              </div>
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            style={{ background:'var(--cyan)', boxShadow:'var(--win-out), 0 0 12px rgba(0,229,255,0.3)' }}
            onClick={handleSave}
          >
            SAVE CHANGES
          </button>
        </div>
      </div>
    </div>
  )
}
