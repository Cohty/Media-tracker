import { useState, useEffect, useMemo } from 'react'
import { SHOWS, MEDIA_TYPES } from '../constants'

export default function MovePostModal({ post, isOpen, onClose, onSave, posts }) {
  const [form, setForm] = useState({ show: '', episodeNumber: '', mediaType: '' })

  useEffect(() => {
    if (isOpen && post) {
      setForm({
        show: post.show || SHOWS[0].name,
        episodeNumber: post.episodeNumber || '',
        mediaType: post.mediaType || 'Clip',
      })
    }
  }, [isOpen, post])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Recompute clip index excluding this post
  const clipIndex = useMemo(() => {
    if (!post || form.mediaType !== 'Clip') return ''
    const count = posts.filter(p =>
      p.id !== post.id &&
      p.show === form.show &&
      p.mediaType === 'Clip' &&
      p.episodeNumber === form.episodeNumber
    ).length
    return count === 0 ? 'Clip' : `Clip${count + 1}`
  }, [form.mediaType, form.show, form.episodeNumber, posts, post])

  function handleSave() {
    const updates = { ...form, ...(form.mediaType === 'Clip' ? { clipIndex } : { clipIndex: '' }) }
    onSave(post.id, updates)
    onClose()
  }

  const unchanged = post &&
    form.show === post.show &&
    form.episodeNumber === (post.episodeNumber || '') &&
    form.mediaType === post.mediaType

  if (!post) return null

  return (
    <div className={`overlay${isOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
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
            <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Moving</div>
            <div style={{ fontFamily: 'Syne', fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>{post.title}</div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)', marginTop: 3 }}>{post.platform} · {post.date}</div>
          </div>

          <div className="modal-row">
            <div className="field">
              <label>Show</label>
              <select value={form.show} onChange={e => setForm(f => ({ ...f, show: e.target.value }))}>
                {SHOWS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Media Type</label>
              <select value={form.mediaType} onChange={e => setForm(f => ({ ...f, mediaType: e.target.value }))}>
                {MEDIA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Episode # <span style={{ color: 'var(--text3)' }}>(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. 73 or leave blank..."
              value={form.episodeNumber}
              onChange={e => setForm(f => ({ ...f, episodeNumber: e.target.value }))}
            />
            {form.mediaType === 'Clip' && (
              <div className="clip-index-preview">
                <span className="clip-index-arrow">→</span>
                <span>will be</span>
                <span className="clip-index-badge">{clipIndex || 'Clip'}</span>
                {unchanged && <span style={{ color: 'var(--text3)' }}>no changes</span>}
              </div>
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            style={{ background: 'var(--cyan)', boxShadow: 'var(--win-out), 0 0 12px rgba(0,229,255,0.3)' }}
            disabled={unchanged}
            onClick={handleSave}
          >
            SAVE CHANGES
          </button>
        </div>
      </div>
    </div>
  )
}
