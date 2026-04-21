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
  const [syncUrl, setSyncUrl] = useState('')
  const [postDate, setPostDate] = useState('')
  const [manualViews, setManualViews] = useState('')
  const [manualEngagement, setManualEngagement] = useState('')
  const [manualImpressions, setManualImpressions] = useState('')
  const [showManualStats, setShowManualStats] = useState(false)

  // Reset form when post changes
  useEffect(() => {
    if (post) {
      setShow(post.show || SHOWS[0].name)
      setMediaType(post.mediaType || 'Full Episode')
      setEpisodeNumber(post.episodeNumber || '')
      setSyncUrl(post.syncUrl || '')
      // Convert MM/DD/YYYY to YYYY-MM-DD for date input
      const d = post.date || ''
      const parts = d.split('/')
      setPostDate(parts.length === 3 ? `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}` : '')
      setManualViews(post.stats?.views || '')
      setManualEngagement(post.stats?.engagement || '')
      setManualImpressions(post.stats?.impressions || '')
      setShowManualStats(!!(post.stats?.views || post.stats?.engagement || post.stats?.impressions))
    }
  }, [post?.id, isOpen])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Enter' && !e.shiftKey) {
        const updates = {
          show, mediaType, episodeNumber,
          clipIndex: mediaType === 'Clip' ? ((() => {
            const count = posts.filter(p =>
              p.id !== post.id && p.show === show &&
              p.mediaType === 'Clip' && p.episodeNumber === episodeNumber
            ).length
            return count === 0 ? 'Clip' : 'Clip' + (count + 1)
          })()) : '',
        }
        onSave(post.id, updates)
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, onSave, show, mediaType, episodeNumber, post, posts])

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
      syncUrl: syncUrl.trim(),
      date: postDate ? new Date(postDate + 'T12:00:00').toLocaleDateString('en-US', { month:'2-digit', day:'2-digit', year:'numeric' }) : undefined,
      stats: {
        views: manualViews.trim(),
        engagement: manualEngagement.trim(),
        impressions: manualImpressions.trim(),
      },
    }
    onSave(post.id, updates)
    onClose()
  }

  const hasChanges = post && (
    show !== (post.show || '') ||
    mediaType !== (post.mediaType || '') ||
    episodeNumber !== (post.episodeNumber || '') ||
    syncUrl.trim() !== (post.syncUrl || '') ||
    postDate !== '' ||
    manualViews !== (post.stats?.views || '') ||
    manualEngagement !== (post.stats?.engagement || '') ||
    manualImpressions !== (post.stats?.impressions || '')
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

          <div className="field" style={{ marginTop: 4 }}>
            <label>Publish Date <span style={{ color:'var(--text3)', fontWeight:400 }}>(change if logged with wrong date)</span></label>
            <input type="date" value={postDate}
              onChange={e => setPostDate(e.target.value)}
              style={{ colorScheme: 'dark' }} />
          </div>

          <div className="field" style={{ marginTop: 4 }}>
            <label>
              Sprout Sync URL
              <span style={{ color:'var(--text3)', fontWeight:400 }}> (optional — paste if Sprout has a different URL)</span>
            </label>
            <input
              type="url"
              placeholder="https://x.com/... or youtube.com/..."
              value={syncUrl}
              onChange={e => setSyncUrl(e.target.value)}
              autoComplete="off"
              style={{ color: syncUrl ? 'var(--cyan)' : undefined }}
            />
            {syncUrl.trim() && (
              <div style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--cyan)', marginTop:4 }}>
                ⟳ Sync will use this URL to match against Sprout
              </div>
            )}
            {post.syncUrl && !syncUrl.trim() && (
              <div style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--text3)', marginTop:4 }}>
                Currently using: {post.syncUrl}
              </div>
            )}
          </div>

          {/* Manual Stats Entry */}
          <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <button
              onClick={() => setShowManualStats(v => !v)}
              style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--text3)', background:'none',
                border:'none', cursor:'pointer', padding:0, marginBottom: showManualStats ? 10 : 0,
                display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:11 }}>{showManualStats ? '▾' : '▸'}</span>
              Enter stats manually
              <span style={{ color:'var(--text3)', fontSize:8 }}>(from YouTube Studio, X Analytics, etc.)</span>
            </button>
            {showManualStats && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                <div className="field">
                  <label style={{ color:'#00e5ff' }}>👁 Views</label>
                  <input type="number" placeholder="0"
                    value={manualViews} onChange={e => setManualViews(e.target.value)}
                    style={{ color:'#00e5ff' }} />
                </div>
                <div className="field">
                  <label style={{ color:'#ff2d78' }}>💬 Engagement</label>
                  <input type="number" placeholder="0"
                    value={manualEngagement} onChange={e => setManualEngagement(e.target.value)}
                    style={{ color:'#ff2d78' }} />
                </div>
                <div className="field">
                  <label style={{ color:'#b44eff' }}>📢 Impressions</label>
                  <input type="number" placeholder="0"
                    value={manualImpressions} onChange={e => setManualImpressions(e.target.value)}
                    style={{ color:'#b44eff' }} />
                </div>
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
