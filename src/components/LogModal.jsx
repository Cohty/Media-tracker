import { useState, useEffect, useRef, useMemo } from 'react'
import { SHOWS, PLATFORMS, MEDIA_TYPES, detectPlatform, fetchYTTitle } from '../constants'

const newEntry = () => ({ url: '', title: '', fetching: false, titleFetched: false, platform: '', duplicate: null })

export default function LogModal({ isOpen, onClose, onSubmit, onNavigateToPost, posts, isContributor }) {
  const [entries, setEntries] = useState([newEntry()])
  const today = new Date().toISOString().split('T')[0]
  const [shared, setShared] = useState({ show: SHOWS[0].name, mediaType: 'Full Episode', episodeNumber: '', date: today })
  const urlRefs = useRef([])
  const timerRefs = useRef([])

  useEffect(() => {
    if (isOpen) {
      setEntries([newEntry()])
      setShared({ show: SHOWS[0].name, mediaType: 'Full Episode', episodeNumber: '' })
      setTimeout(() => urlRefs.current[0]?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && !e.shiftKey) {
        const tag = document.activeElement?.tagName
        if (tag !== 'TEXTAREA' && tag !== 'SELECT') {
          e.preventDefault()
          document.getElementById('log-modal-submit')?.click()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleUrlChange(idx, url) {
    setEntries(prev => prev.map((e, i) => i !== idx ? e : { ...e, url, platform: detectPlatform(url), titleFetched: false, duplicate: null }))
    clearTimeout(timerRefs.current[idx])

    // Duplicate check — normalize URLs to catch x.com vs twitter.com and ?s=20 variants
    function normUrl(u) {
      try {
        const parsed = new URL((u || '').toLowerCase().trim())
        parsed.hostname = parsed.hostname.replace('x.com', 'twitter.com')
        // Keep YouTube ?v= param, strip everything else (tracking params like ?s=20)
        const isYT = parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')
        const v = parsed.searchParams.get('v')
        parsed.search = ''
        if (isYT && v) parsed.searchParams.set('v', v)
        return parsed.toString().replace(/\/$/, '')
      } catch { return (u || '').toLowerCase().trim() }
    }
    const normInput = normUrl(url)
    const dup = posts.find(p => normUrl(p.url) === normInput)
    if (dup) {
      setEntries(prev => prev.map((e, i) => i !== idx ? e : { ...e, duplicate: dup }))
      return
    }

    // YouTube auto-title
    const detected = detectPlatform(url)
    if (detected === 'YouTube' && url.length > 20) {
      setEntries(prev => prev.map((e, i) => i !== idx ? e : { ...e, fetching: true }))
      timerRefs.current[idx] = setTimeout(async () => {
        const title = await fetchYTTitle(url)
        setEntries(prev => prev.map((e, i) => i !== idx ? e : { ...e, fetching: false, title: title || e.title, titleFetched: !!title }))
      }, 600)
    }
  }

  function addEntry() {
    setEntries(prev => [...prev, newEntry()])
    setTimeout(() => urlRefs.current[entries.length]?.focus(), 50)
  }

  function removeEntry(idx) {
    setEntries(prev => prev.filter((_, i) => i !== idx))
  }

  const clipIndex = useMemo(() => {
    if (shared.mediaType !== 'Clip') return ''
    const count = posts.filter(p =>
      p.show === shared.show && p.mediaType === 'Clip' && p.episodeNumber === shared.episodeNumber
    ).length
    return count === 0 ? 'Clip' : `Clip${count + 1}`
  }, [shared.mediaType, shared.show, shared.episodeNumber, posts])

  const validEntries = entries.filter(e => e.url.trim() && e.title.trim() && !e.duplicate && !e.fetching)
  const canSubmit = validEntries.length > 0

  async function handleSubmit() {
    if (!canSubmit) return
    for (const e of validEntries) {
      await onSubmit({ url: e.url, title: e.title, platform: e.platform, show: shared.show, mediaType: shared.mediaType, episodeNumber: shared.episodeNumber, clipIndex, date: shared.date })
    }
    onClose()
  }

  return (
    <div className={`overlay${isOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 560, width: '92vw' }}>
        <div className="modal-titlebar" style={isContributor ? { background: 'linear-gradient(90deg, #001840, #004080)' } : {}}>
          <span className="modal-titlebar-text">{isContributor ? '📤 Submit Post for Review' : '📝 Log New Post'}</span>
          <div className="modal-titlebar-controls">
            <button className="modal-ctrl">_</button>
            <button className="modal-ctrl">□</button>
            <button className="modal-ctrl" onClick={onClose}>×</button>
          </div>
        </div>

        {isContributor && (
          <div className="contributor-notice">
            <span style={{ color: 'var(--cyan)' }}>ℹ</span>
            Your submission will be reviewed by an admin before going live.
          </div>
        )}

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

          {/* URL entries */}
          {entries.map((entry, idx) => {
            const pm = entry.platform ? (PLATFORMS[entry.platform] || PLATFORMS.Other) : null
            const dupShow = entry.duplicate ? SHOWS.find(s => s.name === entry.duplicate.show) : null
            return (
              <div key={idx} style={{
                background: idx > 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                border: idx > 0 ? '1px solid var(--border)' : 'none',
                borderRadius: idx > 0 ? 'var(--radius)' : 0,
                padding: idx > 0 ? '10px 12px' : 0,
                marginBottom: 12,
                position: 'relative',
              }}>
                {idx > 0 && (
                  <button onClick={() => removeEntry(idx)}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none',
                      color: 'var(--text3)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 2 }}>×</button>
                )}
                {idx > 0 && (
                  <div style={{ fontFamily: 'DM Mono', fontSize: 8, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Link {idx + 1}
                  </div>
                )}
                <div className="field">
                  {idx === 0 && <label>URL</label>}
                  <input
                    ref={el => urlRefs.current[idx] = el}
                    type="url" placeholder="Paste the link here..."
                    value={entry.url} onChange={e => handleUrlChange(idx, e.target.value)}
                    style={entry.duplicate ? { borderColor: 'rgba(240,224,64,0.5)' } : {}} />
                  {entry.duplicate ? (
                    <div className="dup-warning">
                      <div className="dup-warning-header"><span className="dup-icon">⚠</span><span>Already logged</span></div>
                      <div className="dup-post-preview">
                        {dupShow && <div className="dup-show-bar" style={{ background: dupShow.hex + '22', borderLeft: `3px solid ${dupShow.hex}` }}><span style={{ color: dupShow.hex, fontFamily: 'DM Mono', fontSize: 9 }}>{entry.duplicate.show}</span></div>}
                        <div className="dup-post-title">{entry.duplicate.title}</div>
                      </div>
                      <button className="dup-jump-btn" onClick={() => { onNavigateToPost(entry.duplicate.id); onClose() }}>Jump to post →</button>
                    </div>
                  ) : (
                    <div className="field-hint">
                      {entry.fetching && 'Fetching title from YouTube…'}
                      {!entry.fetching && pm && <span className="platform-tag" style={{ background: pm.bg, color: pm.color }}>{entry.platform} detected{entry.titleFetched ? ' · title filled' : ''}</span>}
                    </div>
                  )}
                </div>
                {!entry.duplicate && (
                  <div className="field">
                    <input type="text" placeholder="Title..."
                      value={entry.title} onChange={e => setEntries(prev => prev.map((en, i) => i !== idx ? en : { ...en, title: e.target.value }))} />
                  </div>
                )}
              </div>
            )
          })}

          {/* Add more button */}
          <button onClick={addEntry}
            style={{ width: '100%', padding: '7px 0', background: 'transparent', border: '1px dashed var(--border2)',
              borderRadius: 'var(--radius)', fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)',
              cursor: 'pointer', marginBottom: 14, letterSpacing: '0.5px', transition: 'all .15s' }}
            onMouseEnter={e => { e.target.style.borderColor = 'var(--cyan)'; e.target.style.color = 'var(--cyan)' }}
            onMouseLeave={e => { e.target.style.borderColor = 'var(--border2)'; e.target.style.color = 'var(--text3)' }}>
            + Add another link
          </button>

          {/* Shared settings */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontFamily: 'DM Mono', fontSize: 8, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Applied to all {entries.length > 1 ? `${entries.length} links` : 'above'}
            </div>
            <div className="modal-row">
              <div className="field">
                <label>Show</label>
                <select value={shared.show} onChange={e => setShared(s => ({ ...s, show: e.target.value }))}>
                  {SHOWS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  <option value="Newsroom">Newsroom</option>
                  <option value="Editorials">Editorials</option>
                </select>
              </div>
              <div className="field">
                <label>Media Type</label>
                <select value={shared.mediaType} onChange={e => setShared(s => ({ ...s, mediaType: e.target.value }))}>
                  {MEDIA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Episode # <span style={{ color: 'var(--text3)' }}>(optional)</span></label>
              <input type="text" placeholder="e.g. 73 or Polymarket..."
                value={shared.episodeNumber} onChange={e => setShared(s => ({ ...s, episodeNumber: e.target.value }))} />
              {shared.mediaType === 'Clip' && (
                <div className="clip-index-preview">
                  <span className="clip-index-arrow">→</span>
                  <span>will be logged as</span>
                  <span className="clip-index-badge">{clipIndex}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!canSubmit}
            id="log-modal-submit" onClick={handleSubmit}
            style={isContributor ? { background: 'var(--cyan)', boxShadow: 'var(--win-out), 0 0 12px rgba(0,229,255,0.3)' } : {}}>
            {isContributor ? 'SUBMIT FOR REVIEW' : `LOG ${validEntries.length > 1 ? `${validEntries.length} POSTS` : 'POST'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
