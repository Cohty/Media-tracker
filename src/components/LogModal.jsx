import { useState, useEffect, useRef, useMemo } from 'react'
import { SHOWS, PLATFORMS, MEDIA_TYPES, detectPlatform, fetchYTTitle } from '../constants'

const EMPTY = { url: '', title: '', show: SHOWS[0].name, mediaType: 'Full Episode', episodeNumber: '' }

export default function LogModal({ isOpen, onClose, onSubmit, onNavigateToPost, posts }) {
  const [form, setForm] = useState(EMPTY)
  const [platform, setPlatform] = useState('')
  const [fetching, setFetching] = useState(false)
  const [titleFetched, setTitleFetched] = useState(false)
  const urlInputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY); setPlatform(''); setFetching(false); setTitleFetched(false)
      setTimeout(() => urlInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Duplicate URL detection
  const duplicatePost = useMemo(() => {
    const url = form.url.trim()
    if (url.length < 10) return null
    return posts.find(p => p.url.trim().toLowerCase() === url.toLowerCase()) || null
  }, [form.url, posts])

  const clipIndex = useMemo(() => {
    if (form.mediaType !== 'Clip') return ''
    const count = posts.filter(p =>
      p.show === form.show && p.mediaType === 'Clip' && p.episodeNumber === form.episodeNumber
    ).length
    return count === 0 ? 'Clip' : `Clip${count + 1}`
  }, [form.mediaType, form.show, form.episodeNumber, posts])

  function handleUrlChange(url) {
    setForm(f => ({ ...f, url }))
    clearTimeout(timerRef.current)
    const detected = detectPlatform(url)
    setPlatform(detected); setTitleFetched(false)
    if (detected === 'YouTube' && url.length > 20) {
      setFetching(true)
      timerRef.current = setTimeout(async () => {
        const title = await fetchYTTitle(url)
        setFetching(false)
        if (title) { setForm(f => ({ ...f, title })); setTitleFetched(true) }
      }, 600)
    }
  }

  function handleJump() {
    onNavigateToPost(duplicatePost.id)
    onClose()
  }

  function handleSubmit() {
    if (!canSubmit) return
    onSubmit({ ...form, platform, clipIndex })
    onClose()
  }

  const canSubmit = form.url.trim() && form.title.trim() && !fetching && !duplicatePost
  const pm = platform ? (PLATFORMS[platform] || PLATFORMS.Other) : null
  const dupShow = duplicatePost ? SHOWS.find(s => s.name === duplicatePost.show) : null

  return (
    <div className={`overlay${isOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-titlebar">
          <span className="modal-titlebar-text">📝 Log New Post</span>
          <div className="modal-titlebar-controls">
            <button className="modal-ctrl">_</button>
            <button className="modal-ctrl">□</button>
            <button className="modal-ctrl" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>URL</label>
            <input ref={urlInputRef} type="url" placeholder="Paste the link here..."
              value={form.url} onChange={e => handleUrlChange(e.target.value)}
              style={duplicatePost ? { borderColor: 'rgba(240,224,64,0.5)' } : {}} />

            {/* Duplicate warning */}
            {duplicatePost && (
              <div className="dup-warning">
                <div className="dup-warning-header">
                  <span className="dup-icon">⚠</span>
                  <span>This URL is already logged</span>
                </div>
                <div className="dup-post-preview">
                  {dupShow && (
                    <div className="dup-show-bar" style={{ background: dupShow.hex + '22', borderLeft: `3px solid ${dupShow.hex}` }}>
                      <span style={{ color: dupShow.hex, fontFamily: 'DM Mono', fontSize: 9 }}>{duplicatePost.show}</span>
                    </div>
                  )}
                  <div className="dup-post-title">{duplicatePost.title}</div>
                  <div className="dup-post-meta">
                    {duplicatePost.platform} · {duplicatePost.date}
                    {duplicatePost.episodeNumber && ` · EP ${duplicatePost.episodeNumber}`}
                  </div>
                </div>
                <button className="dup-jump-btn" onClick={handleJump}>
                  Jump to post on board →
                </button>
              </div>
            )}

            {/* Normal platform hint */}
            {!duplicatePost && (
              <div className="field-hint">
                {fetching && 'Fetching title from YouTube…'}
                {!fetching && pm && (
                  <span className="platform-tag" style={{ background: pm.bg, color: pm.color, borderColor: pm.pb }}>
                    {platform} detected{titleFetched ? ' · title filled' : ''}
                  </span>
                )}
              </div>
            )}
          </div>

          {!duplicatePost && (
            <>
              <div className="field">
                <label>Title</label>
                <input type="text" placeholder="Episode or post title..."
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
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
                <input type="text" placeholder="e.g. 73 or E42..."
                  value={form.episodeNumber} onChange={e => setForm(f => ({ ...f, episodeNumber: e.target.value }))} />
                {form.mediaType === 'Clip' && (
                  <div className="clip-index-preview">
                    <span className="clip-index-arrow">→</span>
                    <span>will be logged as</span>
                    <span className="clip-index-badge">{clipIndex}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          {duplicatePost
            ? <button className="btn-primary" style={{ background: 'var(--yellow)', color: '#000', boxShadow: 'var(--win-out), 0 0 12px rgba(240,224,64,0.3)' }} onClick={handleJump}>
                Jump to existing post
              </button>
            : <button className="btn-primary" disabled={!canSubmit} onClick={handleSubmit}>LOG POST</button>
          }
        </div>
      </div>
    </div>
  )
}
