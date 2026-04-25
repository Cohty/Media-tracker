import { useState, useMemo } from 'react'
import { SHOWS } from '../constants'
import { useSprout } from '../hooks/useSprout'
import SproutImportModal from './SproutImportModal'
import ImportSummaryModal from './ImportSummaryModal'
import AnalyticsCalendar, { postDayKey } from './AnalyticsCalendar'
import AnalyticsAreaChart from './AnalyticsAreaChart'

const METRICS = [
  { id: 'views',       label: 'Views',       color: '#00e5ff' },
  { id: 'engagement',  label: 'Engagement',  color: '#ff2d78' },
  { id: 'impressions', label: 'Impressions', color: '#b44eff' },
]

const SORT_OPTIONS = [
  { id: 'date',        label: 'Date Posted' },
  { id: 'episode',     label: 'EP #' },
  { id: 'views',       label: 'Views' },
  { id: 'engagement',  label: 'Engagement' },
  { id: 'impressions', label: 'Impressions' },
]

export default function AnalyticsView({ posts, onUpdatePost, onImportDone, onPostClick }) {
  const [filterShow, setFilterShow] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeMetrics, setActiveMetrics] = useState(['views', 'engagement', 'impressions'])
  const [sortBy, setSortBy] = useState('date')
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncMsg, setSyncMsg] = useState('')
  const [lastSynced, setLastSynced] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [summaryLogId, setSummaryLogId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectedRange, setSelectedRange] = useState(null)  // { start, end } | null
  const [hoveredKey, setHoveredKey] = useState(null)

  const { status: sproutStatus, syncPostStats } = useSprout()

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  function clearSelection() { setSelectedIds(new Set()) }

  function toggleMetric(id) {
    setActiveMetrics(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
  }

  function exportCSV(postsToExport) {
    const rows = [
      ['Title', 'Show', 'Platform', 'Media Type', 'Episode', 'Date', 'Views', 'Engagement', 'Impressions', 'URL'],
      ...postsToExport.map(p => [
        `"${(p.title||'').replace(/"/g,'""')}"`,
        `"${p.show||''}"`, p.platform||'', p.mediaType||'', p.episodeNumber||'', p.date||'',
        (() => { const isX = p.platform==='X'||(p.url||'').includes('twitter.com')||(p.url||'').includes('x.com'); return (isX && p.videoViews) ? p.videoViews : p.stats?.views||'' })(),
        p.stats?.engagement||'',
        p.stats?.impressions||'',
        `"${p.url||''}"`,
      ])
    ]
    const csv = rows.map(r=>r.join(',')).join('\n')
    const blob = new Blob([csv], {type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href=url; a.download=`media-tracker-${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const allTypes = useMemo(() => {
    return [...new Set(posts.map(p => p.mediaType).filter(Boolean))].sort()
  }, [posts])

  // Posts filtered by calendar date range FIRST — this is the fundamental filter
  const rangedPosts = useMemo(() => {
    if (!selectedRange) return posts
    return posts.filter(p => {
      const k = postDayKey(p)
      return k && k >= selectedRange.start && k <= selectedRange.end
    })
  }, [posts, selectedRange])

  // Then show/type/search filters + sort for the table
  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let result = rangedPosts.filter(p => {
      if (filterShow !== 'all' && p.show !== filterShow) return false
      if (filterType !== 'all' && p.mediaType !== filterType) return false
      if (q) {
        const haystack = [
          p.title, p.show, p.platform, p.mediaType, p.episodeNumber,
          p.clipIndex, p.url, p.notes,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    result = [...result].sort((a, b) => {
      if (sortBy === 'date') return (b.ts || 0) - (a.ts || 0)
      if (sortBy === 'episode') {
        const na = parseInt(a.episodeNumber) || 0
        const nb = parseInt(b.episodeNumber) || 0
        return nb - na
      }
      const va = Number(a.stats?.[sortBy]) || 0
      const vb = Number(b.stats?.[sortBy]) || 0
      return vb - va
    })
    return result
  }, [rangedPosts, filterShow, filterType, searchQuery, sortBy])

  // Chart source: selection wins over filters
  const chartPosts = useMemo(() => {
    if (selectedIds.size > 0) return filteredPosts.filter(p => selectedIds.has(p.id))
    return filteredPosts
  }, [filteredPosts, selectedIds])

  async function handleSproutSync() {
    setSyncStatus('syncing'); setSyncMsg('Connecting to Sprout Social…')
    try {
      const results = await syncPostStats(posts, msg => setSyncMsg(msg))
      for (const { id, stats, dateUpdate } of results) {
        const updates = { stats }
        // If Sprout returned a more accurate publish date, also update post.date and post.ts
        if (dateUpdate) {
          updates.date = dateUpdate.date
          updates.ts = dateUpdate.ts
        }
        await onUpdatePost(id, updates)
      }
      setLastSynced(new Date().toLocaleTimeString())
      setSyncStatus('done'); setSyncMsg(`${results.length} posts synced`)
      setTimeout(() => setSyncStatus(null), 5000)
    } catch (err) {
      setSyncStatus('error'); setSyncMsg(`Sync failed: ${err.message}`)
      setTimeout(() => setSyncStatus(null), 6000)
    }
  }

  function handleStatChange(postId, field, value) {
    const post = posts.find(p => p.id === postId)
    if (!post) return
    onUpdatePost(postId, { stats: { ...(post.stats || {}), [field]: value } })
  }

  function getViews(p) {
    const isX = p.platform === 'X' || p.platform === 'Twitter' || (p.url||'').includes('twitter.com') || (p.url||'').includes('x.com')
    return Math.max(isX ? Number(p.videoViews)||0 : 0, Number(p.stats?.views)||0)
  }
  function getImp(p) {
    const isX = p.platform === 'X' || p.platform === 'Twitter' || (p.url||'').includes('twitter.com') || (p.url||'').includes('x.com')
    return Math.max(isX ? Number(p.xImpressions)||0 : 0, Number(p.stats?.impressions)||0)
  }
  function fmtN(n) {
    if (!n || n === 0) return '—'
    if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n/1000).toFixed(1)}k`
    return String(n)
  }

  const selectedPosts = filteredPosts.filter(p => selectedIds.has(p.id))
  const selViews = selectedPosts.reduce((s, p) => s + getViews(p), 0)
  const selEng   = selectedPosts.reduce((s, p) => s + (Number(p.stats?.engagement)||0), 0)
  const selImp   = selectedPosts.reduce((s, p) => s + getImp(p), 0)
  const hasSelection = selectedIds.size > 0
  const sproutReady = sproutStatus === 'ready'

  return (
    <div className="analytics-wrapper">

      {/* ── SEARCH BAR ── */}
      <div className="analytics-search">
        <span className="analytics-search-icon">🔍</span>
        <input
          type="text"
          className="analytics-search-input"
          placeholder="Search posts by title, show, platform, episode, URL…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          autoComplete="off"
        />
        {searchQuery && (
          <button className="analytics-search-clear" onClick={() => setSearchQuery('')}>×</button>
        )}
        {searchQuery && (
          <span className="analytics-search-count">
            {filteredPosts.length} match{filteredPosts.length === 1 ? '' : 'es'}
          </span>
        )}
      </div>

      {/* ── FILTER BAR ── */}
      <div className="win95-window">
        <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #001840, #003080)' }}>
          <span className="win95-title">🔬 FILTERS & SYNC</span>
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Row 1: Show + Type + Metrics */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="filter-group">
              <span className="filter-label">SHOW</span>
              <select className="filter-select" value={filterShow} onChange={e => setFilterShow(e.target.value)}>
                <option value="all">All Shows</option>
                {SHOWS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <span className="filter-label">TYPE</span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <button className={`metric-btn${filterType === 'all' ? ' active' : ''}`}
                  style={filterType === 'all' ? { color: 'var(--text)', borderColor: 'rgba(255,255,255,0.3)' } : {}}
                  onClick={() => setFilterType('all')}>All</button>
                {allTypes.map(t => (
                  <button key={t} className={`metric-btn${filterType === t ? ' active' : ''}`}
                    style={filterType === t ? { color: 'var(--cyan)', borderColor: 'rgba(0,229,255,0.4)' } : {}}
                    onClick={() => setFilterType(t)}>{t}</button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <span className="filter-label">METRICS</span>
              <div style={{ display: 'flex', gap: 5 }}>
                {METRICS.map(m => (
                  <button key={m.id} className={`metric-btn${activeMetrics.includes(m.id) ? ' active' : ''}`}
                    style={activeMetrics.includes(m.id) ? { color: m.color, borderColor: m.color+'66' } : {}}
                    onClick={() => toggleMetric(m.id)}>{m.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Sort + Actions */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="filter-group">
              <span className="filter-label">SORT BY</span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {SORT_OPTIONS.map(s => (
                  <button key={s.id} className={`metric-btn${sortBy === s.id ? ' active' : ''}`}
                    style={sortBy === s.id ? { color: 'var(--yellow)', borderColor: 'rgba(240,224,64,0.4)' } : {}}
                    onClick={() => setSortBy(s.id)}>{s.label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              {lastSynced && <span style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--text3)' }}>synced {lastSynced}</span>}
              <button className="sprout-import-btn" onClick={() => setImportOpen(true)}>📥 IMPORT FROM SPROUT</button>
              <button
                className={`sprout-sync-btn${syncStatus==='syncing'?' syncing':''}${!sproutReady?' disabled':''}`}
                onClick={sproutReady && syncStatus!=='syncing' ? handleSproutSync : undefined}>
                <span className="sprout-icon">⟳</span>
                {syncStatus==='syncing' ? 'SYNCING…' : 'SYNC SPROUT'}
              </button>
              <button onClick={() => exportCSV(filteredPosts)}
                style={{ fontFamily:'DM Mono', fontSize:10, padding:'6px 12px', borderRadius:'var(--radius)',
                  cursor:'pointer', boxShadow:'var(--win-out)', background:'rgba(240,224,64,0.06)',
                  border:'1px solid rgba(240,224,64,0.25)', color:'var(--yellow)' }}>
                ⬇ CSV
              </button>
            </div>
          </div>

          {syncStatus && <div className={`sync-status sync-status--${syncStatus}`}>{syncMsg}</div>}
          <div style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--text3)' }}>
            {filteredPosts.length} posts in view
          </div>
        </div>
      </div>

      {/* ── BATCH METRICS BAR ── */}
      {hasSelection && (
        <div style={{ display:'flex', alignItems:'center', gap:16, padding:'10px 16px',
          background:'rgba(180,78,255,0.06)', border:'1px solid rgba(180,78,255,0.25)',
          borderRadius:'var(--radius)' }}>
          <span style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--purple)', fontWeight:700, letterSpacing:'0.5px' }}>
            {selectedIds.size} SELECTED
          </span>
          <div style={{ display:'flex', gap:16, alignItems:'center' }}>
            {selViews > 0 && <span style={{ fontFamily:'VT323', fontSize:22, color:'#00e5ff', textShadow:'0 0 8px #00e5ff', lineHeight:1 }}>👁 {fmtN(selViews)}</span>}
            {selEng > 0   && <span style={{ fontFamily:'VT323', fontSize:22, color:'#ff2d78', textShadow:'0 0 8px #ff2d78', lineHeight:1 }}>💬 {fmtN(selEng)}</span>}
            {selImp > 0   && <span style={{ fontFamily:'VT323', fontSize:22, color:'#b44eff', textShadow:'0 0 8px #b44eff', lineHeight:1 }}>📢 {fmtN(selImp)}</span>}
          </div>
          <span style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--text3)' }}>↓ chart shows selected posts · shift-click rows to select</span>
          <button onClick={clearSelection}
            style={{ marginLeft:'auto', fontFamily:'DM Mono', fontSize:9, color:'var(--text3)',
              background:'none', border:'1px solid var(--border)', borderRadius:4,
              padding:'3px 8px', cursor:'pointer' }}>
            ✕ Clear
          </button>
        </div>
      )}

      {/* ── CALENDAR + CHART (two-pane) ── */}
      <div className="analytics-twopane">
        <AnalyticsCalendar
          posts={posts}
          selectedRange={selectedRange}
          onChangeRange={setSelectedRange}
          hoveredKey={hoveredKey}
          onHoverDay={setHoveredKey}
        />

        <div className="win95-window analytics-chart-pane">
          <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #1a0040, #4a0090)' }}>
            <span className="win95-title">
              📈 {hasSelection ? `PERFORMANCE — ${selectedIds.size} SELECTED` : 'PERFORMANCE OVER TIME'}
            </span>
          </div>
          <div className="analytics-chart-body">
            <AnalyticsAreaChart
              posts={chartPosts}
              activeMetrics={activeMetrics}
              selectedRange={selectedRange}
              hoveredKey={hoveredKey}
              onHoverDay={setHoveredKey}
            />
            {/* Inline legend / toggles below chart */}
            <div className="analytics-chart-chips">
              {METRICS.map(m => {
                const on = activeMetrics.includes(m.id)
                return (
                  <button key={m.id}
                    onClick={() => toggleMetric(m.id)}
                    className="chart-metric-chip"
                    style={{
                      borderColor: on ? m.color+'66' : 'var(--border)',
                      background: on ? m.color+'10' : 'transparent',
                      color: on ? m.color : 'var(--text3)',
                      textShadow: on ? `0 0 6px ${m.color}66` : 'none',
                    }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: m.color, display: 'inline-block',
                      marginRight: 6, opacity: on ? 1 : 0.3,
                      boxShadow: on ? `0 0 6px ${m.color}` : 'none',
                    }} />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="win95-window">
        <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #001a20, #003040)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span className="win95-title">📋 POST STATS — synced from Sprout or edit manually</span>
          <div style={{ display:'flex', gap:5, marginRight:8 }}>
            {SORT_OPTIONS.map(s => (
              <button key={s.id} className={`metric-btn${sortBy === s.id ? ' active' : ''}`}
                style={sortBy === s.id
                  ? { color:'var(--yellow)', borderColor:'rgba(240,224,64,0.4)', fontSize:8, padding:'2px 8px' }
                  : { fontSize:8, padding:'2px 8px' }}
                onClick={() => setSortBy(s.id)}>{s.label}</button>
            ))}
          </div>
        </div>
        <div className="analytics-table-wrap">
          <div className="analytics-table-header" style={{ gridTemplateColumns:'28px 2fr 1fr 1fr 100px 100px 100px' }}>
            <div><input type="checkbox"
              checked={hasSelection && selectedIds.size === filteredPosts.length}
              onChange={() => setSelectedIds(prev => prev.size === filteredPosts.length ? new Set() : new Set(filteredPosts.map(p => p.id)))}
              style={{ cursor:'pointer' }} /></div>
            <div>TITLE</div><div>SHOW</div><div>TYPE</div>
            <div>VIEWS</div><div>ENGAGEMENT</div><div>IMPRESSIONS</div>
          </div>
          {filteredPosts.length === 0 ? (
            <div className="empty-analytics" style={{ padding: 24 }}>
              {selectedRange ? 'No posts in the selected date range' : 'No posts match the current filters'}
            </div>
          ) : filteredPosts.map(post => {
            const dayKey = postDayKey(post)
            const isHighlighted = hoveredKey && dayKey === hoveredKey
            return (
              <div key={post.id} className="analytics-row"
                style={{ gridTemplateColumns:'28px 2fr 1fr 1fr 100px 100px 100px',
                  background: selectedIds.has(post.id) ? 'rgba(180,78,255,0.06)' :
                              isHighlighted ? 'rgba(0,229,255,0.05)' : undefined,
                  cursor:'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={() => setHoveredKey(dayKey)}
                onClick={e => {
                  if (e.shiftKey) {
                    e.preventDefault()
                    toggleSelect(post.id)
                  } else if (onPostClick) {
                    onPostClick(post)
                  } else {
                    toggleSelect(post.id)
                  }
                }}
                title="Click to open · Shift-click to select for chart">
                <div className="analytics-cell" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(post.id)}
                    onChange={() => toggleSelect(post.id)} style={{ cursor:'pointer' }} />
                </div>
                <div className="analytics-cell">
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div className="analytics-cell-text">{post.title}</div>
                    <a href={post.url} target="_blank" rel="noreferrer" className="analytics-link-btn">↗</a>
                    {post.stats?.lastSynced && (
                      <span style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--green)',
                        background:'rgba(57,255,140,0.08)', border:'1px solid rgba(57,255,140,0.2)',
                        padding:'1px 4px', borderRadius:2 }}>sprout</span>
                    )}
                  </div>
                  <div className="analytics-cell-sub">{post.date} · {post.platform}</div>
                </div>
                <div className="analytics-cell">
                  <div className="analytics-cell-text" style={{ fontSize:9 }}>{post.show}</div>
                </div>
                <div className="analytics-cell">
                  <div className="analytics-cell-text">{post.mediaType || '—'}</div>
                  {post.episodeNumber && <div className="analytics-cell-sub">EP {post.episodeNumber}</div>}
                </div>
                {['views','engagement','impressions'].map(field => (
                  <div key={field} className="analytics-cell">
                    <input type="number" className="stat-input"
                      value={post.stats?.[field] ?? ''}
                      placeholder="—"
                      onChange={e => handleStatChange(post.id, field, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <SproutImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => { setImportOpen(false); window.location.reload() }}
        onShowSummary={logId => { setSummaryLogId(logId) }}
      />
      <ImportSummaryModal
        logId={summaryLogId}
        isOpen={!!summaryLogId}
        onClose={() => setSummaryLogId(null)}
      />
    </div>
  )
}
