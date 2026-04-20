import { useState, useMemo } from 'react'
import { SHOWS, MEDIA_TYPES, PLATFORMS } from '../constants'

const ALL_SHOWS = [...SHOWS.map(s => s.name), 'Unassigned']

const SHOW_COLORS = Object.fromEntries([...SHOWS, { name: 'Newsroom', hex: '#e0d0ff' }, { name: 'Editorials', hex: '#00a8ff' }].map(s => [s.name, s.hex]))

function fmt(n) {
  if (!n || Number(n) === 0) return null
  const v = Number(n)
  return v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)
}

export default function InboxView({ posts, onUpdatePost, onDeletePost }) {
  const [filterShow, setFilterShow] = useState('Newsroom')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [editing, setEditing] = useState({}) // id → {show, mediaType, episodeNumber}
  const [saving, setSaving] = useState(new Set())
  const [saved, setSaved] = useState(new Set())

  const inboxPosts = useMemo(() => {
    let result = posts.filter(p => {
      if (filterShow !== 'all' && p.show !== filterShow) return false
      if (filterPlatform !== 'all' && p.platform !== filterPlatform) return false
      if (filterType !== 'all' && p.mediaType !== filterType) return false
      if (search && !p.title?.toLowerCase().includes(search.toLowerCase()) &&
          !p.url?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    if (sortBy === 'date') result = result.sort((a, b) => (b.ts || 0) - (a.ts || 0))
    if (sortBy === 'platform') result = result.sort((a, b) => (a.platform || '').localeCompare(b.platform || ''))
    if (sortBy === 'type') result = result.sort((a, b) => (a.mediaType || '').localeCompare(b.mediaType || ''))
    if (sortBy === 'show') result = result.sort((a, b) => (a.show || '').localeCompare(b.show || ''))
    return result
  }, [posts, filterShow, filterPlatform, filterType, search, sortBy])

  const platforms = useMemo(() => ['all', ...[...new Set(posts.filter(p => filterShow === 'all' || p.show === filterShow).map(p => p.platform))].sort()], [posts, filterShow])
  const types = useMemo(() => ['all', ...[...new Set(posts.filter(p => filterShow === 'all' || p.show === filterShow).map(p => p.mediaType).filter(Boolean))].sort()], [posts, filterShow])

  function getEdit(post) {
    return editing[post.id] || { show: post.show, mediaType: post.mediaType || '', episodeNumber: post.episodeNumber || '' }
  }

  function setEdit(id, field, value) {
    setEditing(prev => ({ ...prev, [id]: { ...getEdit({ id, show: '', mediaType: '', episodeNumber: '' }), ...prev[id], [field]: value } }))
  }

  async function savePost(post) {
    const e = editing[post.id]
    if (!e) return
    setSaving(prev => new Set([...prev, post.id]))
    await onUpdatePost(post.id, e)
    setSaved(prev => new Set([...prev, post.id]))
    setEditing(prev => { const n = { ...prev }; delete n[post.id]; return n })
    setSaving(prev => { const n = new Set(prev); n.delete(post.id); return n })
    setTimeout(() => setSaved(prev => { const n = new Set(prev); n.delete(post.id); return n }), 2000)
  }

  const showCounts = useMemo(() => {
    const counts = {}
    ALL_SHOWS.forEach(s => { counts[s] = posts.filter(p => p.show === s).length })
    counts['all'] = posts.length
    return counts
  }, [posts])

  return (
    <div style={{ padding: '0 0 40px' }}>

      {/* Header */}
      <div className="win95-window" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
        <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #1a0030, #3a0060)' }}>
          <span className="win95-title">📬 INBOX — sort & assign unorganized posts</span>
        </div>
        <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Show filter pills */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)', marginRight: 4 }}>SHOW</span>
            {[{ id: 'all', label: 'All' }, ...ALL_SHOWS.map(s => ({ id: s, label: s }))].map(s => (
              <button key={s.id}
                className={`metric-btn${filterShow === s.id ? ' active' : ''}`}
                style={filterShow === s.id ? { color: SHOW_COLORS[s.id] || 'var(--purple)', borderColor: (SHOW_COLORS[s.id] || '#b44eff') + '66' } : {}}
                onClick={() => setFilterShow(s.id)}>
                {s.label} {showCounts[s.id] ? <span style={{ opacity: 0.6 }}>({showCounts[s.id]})</span> : null}
              </button>
            ))}
          </div>

          {/* Platform + Type + Sort + Search */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>PLATFORM</span>
              {platforms.map(p => (
                <button key={p} className={`metric-btn${filterPlatform === p ? ' active' : ''}`}
                  style={filterPlatform === p ? { color: 'var(--cyan)', borderColor: 'rgba(0,229,255,0.4)' } : {}}
                  onClick={() => setFilterPlatform(p)}>{p === 'all' ? 'All' : p}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>TYPE</span>
              {types.map(t => (
                <button key={t} className={`metric-btn${filterType === t ? ' active' : ''}`}
                  style={filterType === t ? { color: 'var(--yellow)', borderColor: 'rgba(240,224,64,0.4)' } : {}}
                  onClick={() => setFilterType(t)}>{t === 'all' ? 'All' : t}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>SORT</span>
              {[['date','Date'],['show','Show'],['platform','Platform'],['type','Type']].map(([id, label]) => (
                <button key={id} className={`metric-btn${sortBy === id ? ' active' : ''}`}
                  style={sortBy === id ? { color: 'var(--green)', borderColor: 'rgba(57,255,140,0.4)' } : {}}
                  onClick={() => setSortBy(id)}>{label}</button>
              ))}
            </div>
            <input
              type="text" placeholder="Search titles…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                padding: '5px 10px', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text)',
                outline: 'none', width: 200, boxShadow: 'var(--win-in)', marginLeft: 'auto' }}
            />
          </div>

          <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>
            {inboxPosts.length} posts · click a row to edit inline · Enter to save
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 80px',
          padding: '6px 16px', borderBottom: '1px solid var(--border)',
          fontFamily: 'DM Mono', fontSize: 8, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px',
          background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 2 }}>
          <div>TITLE / URL</div><div>SHOW</div><div>TYPE</div><div>EP / LABEL</div><div>DATE</div><div>ACTIONS</div>
        </div>

        {inboxPosts.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text3)' }}>
            No posts match current filters
          </div>
        )}

        {inboxPosts.map(post => {
          const e = getEdit(post)
          const isDirty = editing[post.id] !== undefined
          const isSaving = saving.has(post.id)
          const isSaved = saved.has(post.id)
          const pm = PLATFORMS[post.platform] || PLATFORMS.Other

          return (
            <div key={post.id}
              style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 80px',
                padding: '8px 16px', borderBottom: '1px solid var(--border)',
                background: isDirty ? 'rgba(180,78,255,0.04)' : isSaved ? 'rgba(57,255,140,0.04)' : 'var(--surface)',
                alignItems: 'center', gap: 8, transition: 'background .2s' }}>

              {/* Title */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                  {post.title || post.url}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="p-pill" style={{ background: pm.bg, color: pm.color, fontSize: 8, padding: '1px 6px' }}>{post.platform}</span>
                  <a href={post.url} target="_blank" rel="noreferrer"
                    style={{ fontFamily: 'DM Mono', fontSize: 8, color: 'var(--cyan)', textDecoration: 'none' }}>↗</a>
                  {post.stats?.views && fmt(post.stats.views) && (
                    <span style={{ fontFamily: 'DM Mono', fontSize: 8, color: '#00e5ff' }}>👁 {fmt(post.stats.views)}</span>
                  )}
                  {post.stats?.engagement && fmt(post.stats.engagement) && (
                    <span style={{ fontFamily: 'DM Mono', fontSize: 8, color: '#ff2d78' }}>💬 {fmt(post.stats.engagement)}</span>
                  )}
                </div>
              </div>

              {/* Show */}
              <select
                value={e.show}
                onChange={ev => setEdit(post.id, 'show', ev.target.value)}
                style={{ background: 'var(--surface2)', border: `1px solid ${isDirty ? 'rgba(180,78,255,0.5)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)', padding: '4px 6px', fontFamily: 'DM Mono', fontSize: 9,
                  color: SHOW_COLORS[e.show] || 'var(--text)', outline: 'none', width: '100%', boxShadow: 'var(--win-in)', cursor: 'pointer' }}>
                {ALL_SHOWS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Type */}
              <select
                value={e.mediaType}
                onChange={ev => setEdit(post.id, 'mediaType', ev.target.value)}
                style={{ background: 'var(--surface2)', border: `1px solid ${isDirty ? 'rgba(180,78,255,0.5)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)', padding: '4px 6px', fontFamily: 'DM Mono', fontSize: 9,
                  color: 'var(--text)', outline: 'none', width: '100%', boxShadow: 'var(--win-in)', cursor: 'pointer' }}>
                <option value="">— select —</option>
                {MEDIA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              {/* Episode / Label */}
              <input
                type="text"
                value={e.episodeNumber}
                placeholder="EP # or label"
                onChange={ev => setEdit(post.id, 'episodeNumber', ev.target.value)}
                onKeyDown={ev => { if (ev.key === 'Enter') savePost(post) }}
                style={{ background: 'var(--surface2)', border: `1px solid ${isDirty ? 'rgba(180,78,255,0.5)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)', padding: '4px 6px', fontFamily: 'DM Mono', fontSize: 9,
                  color: 'var(--text)', outline: 'none', width: '100%', boxShadow: 'var(--win-in)' }}
              />

              {/* Date */}
              <div style={{ fontFamily: 'DM Mono', fontSize: 8, color: 'var(--text3)' }}>{post.date}</div>

              {/* Save / Delete */}
              <div style={{ display: 'flex', gap: 4 }}>
                {isSaved ? (
                  <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--green)' }}>✓ saved</span>
                ) : (
                  <button
                    onClick={() => savePost(post)}
                    disabled={!isDirty || isSaving}
                    style={{ fontFamily: 'DM Mono', fontSize: 9, padding: '3px 8px',
                      background: isDirty ? 'rgba(0,229,255,0.1)' : 'transparent',
                      border: `1px solid ${isDirty ? 'rgba(0,229,255,0.4)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)', color: isDirty ? 'var(--cyan)' : 'var(--text3)',
                      cursor: isDirty ? 'pointer' : 'default', boxShadow: 'var(--win-out)' }}>
                    {isSaving ? '…' : 'Save'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
