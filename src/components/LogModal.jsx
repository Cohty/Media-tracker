import { useState, useEffect, useRef } from 'react'
import { SHOWS, PLATFORMS, MEDIA_TYPES, detectPlatform, fetchYTTitle } from '../constants'

const EMPTY = { url: '', title: '', show: SHOWS[0].name, mediaType: 'Full Episode', episodeNumber: '' }

export default function LogModal({ isOpen, onClose, onSubmit }) {
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

  function handleSubmit() {
    if (!canSubmit) return
    onSubmit({ ...form, platform })
    onClose()
  }

  const canSubmit = form.url.trim() && form.title.trim() && !fetching
  const pm = platform ? (PLATFORMS[platform] || PLATFORMS.Other) : null

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
              value={form.url} onChange={e => handleUrlChange(e.target.value)} />
            <div className="field-hint">
              {fetching && 'Fetching title from YouTube…'}
              {!fetching && pm && (
                <span className="platform-tag" style={{ background: pm.bg, color: pm.color, borderColor: pm.pb }}>
                  {platform} detected{titleFetched ? ' · title filled' : ''}
                </span>
              )}
            </div>
          </div>
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
            <label>Episode # <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
            <input type="text" placeholder="e.g. E42 or 042..."
              value={form.episodeNumber} onChange={e => setForm(f => ({ ...f, episodeNumber: e.target.value }))} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!canSubmit} onClick={handleSubmit}>LOG POST</button>
        </div>
      </div>
    </div>
  )
}
