import { useState, useEffect, useRef } from 'react'
import { SHOWS, PLATFORMS, detectPlatform, fetchYTTitle } from '../constants'

const EMPTY = { url: '', title: '', show: SHOWS[0].name }

export default function LogModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY)
  const [platform, setPlatform] = useState('')
  const [fetching, setFetching] = useState(false)
  const [titleFetched, setTitleFetched] = useState(false)
  const urlInputRef = useRef(null)
  const timerRef = useRef(null)

  // Reset and focus when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY)
      setPlatform('')
      setFetching(false)
      setTitleFetched(false)
      setTimeout(() => urlInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Escape key to close
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleUrlChange(url) {
    setForm(f => ({ ...f, url }))
    clearTimeout(timerRef.current)

    const detected = detectPlatform(url)
    setPlatform(detected)
    setTitleFetched(false)

    if (detected === 'YouTube' && url.length > 20) {
      setFetching(true)
      timerRef.current = setTimeout(async () => {
        const title = await fetchYTTitle(url)
        setFetching(false)
        if (title) {
          setForm(f => ({ ...f, title }))
          setTitleFetched(true)
        }
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
    <div
      className={`overlay${isOpen ? ' open' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal">
        <div className="modal-title">Log a post</div>

        <div className="field">
          <label>URL</label>
          <input
            ref={urlInputRef}
            type="url"
            placeholder="Paste the link here..."
            value={form.url}
            onChange={e => handleUrlChange(e.target.value)}
          />
          <div className="field-hint">
            {fetching && 'Fetching title from YouTube…'}
            {!fetching && pm && (
              <span
                className="platform-tag"
                style={{ background: pm.bg, color: pm.color }}
              >
                {platform} detected{titleFetched ? ' · title filled' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="field">
          <label>Title</label>
          <input
            type="text"
            placeholder="Episode or post title..."
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
        </div>

        <div className="field">
          <label>Show</label>
          <select
            value={form.show}
            onChange={e => setForm(f => ({ ...f, show: e.target.value }))}
          >
            {SHOWS.map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            Log post
          </button>
        </div>
      </div>
    </div>
  )
}
