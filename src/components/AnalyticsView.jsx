import { useState, useMemo, useRef } from 'react'
import { SHOWS, MEDIA_TYPES } from '../constants'
import { useSprout } from '../hooks/useSprout'
import SproutImportModal from './SproutImportModal'
import ImportSummaryModal from './ImportSummaryModal'

const SHOW_COLORS = Object.fromEntries(SHOWS.map(s => [s.name, s.hex]))

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

// Pure SVG chart — bar or line, with hover tooltip
function StatChart({ data, activeMetrics, chartType }) {
  const [tooltip, setTooltip] = useState(null)
  const svgRef = useRef(null)

  if (!data || data.length === 0) return null

  const w = 900, h = 220
  const padL = 52, padR = 16, padT = 16, padB = 32
  const cw = w - padL - padR, ch = h - padT - padB

  const maxVal = Math.max(...data.flatMap(d =>
    METRICS.filter(m => activeMetrics.includes(m.id)).map(m => Number(d[m.id]) || 0)
  ), 1)

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    val: Math.round(maxVal * t),
    y: padT + ch * (1 - t),
  }))

  function fmtVal(v) {
    const n = Number(v)
    if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n/1000).toFixed(1)}k`
    return String(n)
  }

  const activeCols = METRICS.filter(m => activeMetrics.includes(m.id))
  const groupW = cw / data.length
  const barW = Math.min(Math.floor(groupW / (activeCols.length + 0.5)), 44)

  // Convert an SVG x-coordinate to a pixel offset inside the relative wrapper.
  // We use the SVG's live bounding rect so this stays correct at any viewport width.
  function svgXToPixel(svgX) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return (svgX / w) * rect.width
  }

  function showTooltip(d, svgX) {
    const px = svgXToPixel(svgX)
    setTooltip({ ...d, px })
  }

  return (
    <div style={{ position: 'relative' }}>
      {tooltip && (
        <div style={{
          position: 'absolute', zIndex: 10, pointerEvents: 'none',
          left: tooltip.px, top: 4, transform: 'translateX(-50%)',
          background: '#0f0c1e', border: '1px solid rgba(180,78,255,0.5)',
          borderRadius: 4, padding: '8px 12px', fontFamily: 'DM Mono', fontSize: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)', minWidth: 160, maxWidth: 260,
          whiteSpace: 'nowrap',
        }}>
          <div style={{ color: '#e2d9ff', marginBottom: 5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{tooltip.title}</div>
          {tooltip.ep && <div style={{ color: '#4a4168', fontSize: 9, marginBottom: 5 }}>EP {tooltip.ep}</div>}
          {activeCols.map(m => (
            <div key={m.id} style={{ color: m.color, marginBottom: 2 }}>
              {m.label}: {fmtVal(tooltip[m.id] || 0)}
            </div>
          ))}
        </div>
      )}
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${w} ${h}`}
        style={{ display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setTooltip(null)}>

        {/* Grid */}
        {ticks.map(t => (
          <g key={t.val}>
            <line x1={padL} y1={t.y} x2={padL+cw} y2={t.y} stroke="rgba(180,78,255,0.07)" strokeWidth={1} />
            <text x={padL-5} y={t.y+3} textAnchor="end" fill="#4a4168" fontSize={9} fontFamily="DM Mono">
              {fmtVal(t.val)}
            </text>
          </g>
        ))}
        <line x1={padL} y1={padT+ch} x2={padL+cw} y2={padT+ch} stroke="rgba(180,78,255,0.15)" strokeWidth={1}/>

        {chartType === 'bar' ? (
          // BAR CHART
          data.map((d, i) => {
            const gx = padL + i * groupW
            const groupPad = (groupW - barW * activeCols.length) / 2
            const groupCenterX = gx + groupW / 2
            return (
              <g key={i} onMouseEnter={() => showTooltip(d, groupCenterX)}>
                {/* Invisible hit area */}
                <rect x={gx} y={padT} width={groupW} height={ch} fill="transparent" />
                {activeCols.map((m, ki) => {
                  const val = Number(d[m.id]) || 0
                  const bh = (val / maxVal) * ch
                  const bx = gx + groupPad + ki * barW
                  return (
                    <rect key={m.id} x={bx} y={padT+ch-bh} width={barW-2} height={Math.max(bh,0)}
                      fill={m.color} opacity={0.85} rx={2} />
                  )
                })}
              </g>
            )
          })
        ) : (
          // LINE CHART
          activeCols.map(m => {
            const pts = data.map((d, i) => {
              const val = Number(d[m.id]) || 0
              return {
                x: padL + (i + 0.5) * groupW,
                y: padT + ch * (1 - val / maxVal),
              }
            })
            const pathD = pts.map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
            return (
              <g key={m.id}>
                <path d={pathD} fill="none" stroke={m.color} strokeWidth={2} opacity={0.85} />
                {pts.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={3} fill={m.color}
                    onMouseEnter={() => showTooltip(data[i], p.x)}
                  />
                ))}
              </g>
            )
          })
        )}

        {/* Legend */}
        {activeCols.map((m, i) => (
          <g key={m.id} transform={`translate(${padL + i * 120}, ${h - 14})`}>
            {chartType === 'bar'
              ? <rect width={10} height={10} fill={m.color} rx={1} />
              : <line x1={0} y1={5} x2={16} y2={5} stroke={m.color} strokeWidth={2} />
            }
            <text x={chartType==='bar'?14:20} y={9} fill="#8b7eb8" fontSize={10} fontFamily="DM Mono">
              {m.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function AnalyticsView({ posts, onUpdatePost, onImportDone }) {
  const [filterShow, setFilterShow] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [activeMetrics, setActiveMetrics] = useState(['views', 'engagement', 'impressions'])
  const [sortBy, setSortBy] = useState('date')
  const [chartType, setChartType] = useState('bar')
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncMsg, setSyncMsg] = useState('')
  const [lastSynced, setLastSynced] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [summaryLogId, setSummaryLogId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [chartKey, setChartKey] = useState(0)

  const { status: sproutStatus, syncPostStats } = useSprout()

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  function clearSelection() { setSelectedIds(new Set()); setChartKey(k => k + 1) }

  function toggleMetric(id) {
    setActiveMetrics(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
  }

  function exportCSV(postsToExport) {
    const rows = [
      ['Title', 'Show', 'Platform', 'Media Type', 'Episode', 'Date', 'Views', 'Engagement', 'Impressions', 'URL'],
      ...postsToExport.map(p => [
        `"${(p.title||'').replace(/"/g,'""')}"`,
        `"${p.show||''}"`, p.platform||'', p.mediaType||'', p.episodeNumber||'', p.date||'',
        (() => { const isX = p.platform==='X'||(p.url||'').includes('twitter.com')||(p.url||'').includes('x.com'); return (isX && p.videoViews) ? p.videoViews : p.stats?.views||'' })(), p.stats?.engagement||'', p.stats?.impressions||'',
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
    const types = [...new Set(posts.map(p => p.mediaType).filter(Boolean))]
    return types.sort()
  }, [posts])

  const filteredPosts = useMemo(() => {
    let result = posts.filter(p =>
      (filterShow === 'all' || p.show === filterShow) &&
      (filterType === 'all' || p.mediaType === filterType)
    )
    // Sort
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
  }, [posts, filterShow, filterType, sortBy])

  const chartData = useMemo(() => {
    const source = selectedIds.size > 0
      ? filteredPosts.filter(p => selectedIds.has(p.id))
      : filteredPosts
    return source
      .filter(p => p.stats && (p.stats.views || p.stats.engagement || p.stats.impressions))
      .slice(0, 20)
      .map(p => ({
        name: p.title?.length > 20 ? p.title.slice(0, 20) + '…' : (p.title || ''),
        title: p.title || '',
        ep: p.episodeNumber || '',
        views: (() => {
          const isX = p.platform === 'X' || p.platform === 'Twitter' || (p.url||'').includes('twitter.com') || (p.url||'').includes('x.com')
          return Math.max(isX ? Number(p.videoViews) || 0 : 0, Number(p.stats?.views) || 0)
        })(),
        engagement: Number(p.stats?.engagement) || 0,
        impressions: (() => {
          const isX = p.platform === 'X' || p.platform === 'Twitter' || (p.url||'').includes('twitter.com') || (p.url||'').includes('x.com')
          return Math.max(isX ? Number(p.xImpressions) || 0 : 0, Number(p.stats?.impressions) || 0)
        })(),
      }))
  }, [filteredPosts, selectedIds])

  async function handleSproutSync() {
    setSyncStatus('syncing'); setSyncMsg('Connecting to Sprout Social…')
    try {
      const results = await syncPostStats(posts, msg => setSyncMsg(msg))
      for (const { id, stats } of results) await onUpdatePost(id, { stats })
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

  const selectedPosts = filteredPosts.filter(p => selectedIds.has(p.id))
  const hasSelection = selectedIds.size > 0

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

  const selViews = selectedPosts.reduce((s, p) => s + getViews(p), 0)
  const selEng   = selectedPosts.reduce((s, p) => s + (Number(p.stats?.engagement)||0), 0)
  const selImp   = selectedPosts.reduce((s, p) => s + getImp(p), 0)

  // Chart shows selected posts if any are selected, otherwise filtered posts
  const sproutReady = sproutStatus === 'ready'

  return (
    <div className="analytics-wrapper">

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

          {/* Row 2: Sort + Chart type + Actions */}
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

            <div className="filter-group">
              <span className="filter-label">CHART</span>
              <div style={{ display: 'flex', gap: 5 }}>
                <button className={`metric-btn${chartType==='bar'?' active':''}`}
                  style={chartType==='bar'?{color:'var(--purple)',borderColor:'rgba(180,78,255,0.4)'}:{}}
                  onClick={() => setChartType('bar')}>▦ Bar</button>
                <button className={`metric-btn${chartType==='line'?' active':''}`}
                  style={chartType==='line'?{color:'var(--purple)',borderColor:'rgba(180,78,255,0.4)'}:{}}
                  onClick={() => setChartType('line')}>╱ Line</button>
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
            {filteredPosts.length} posts · {chartData.length} with stats
          </div>
        </div>
      </div>

      {/* ── BATCH METRICS BAR ── */}
      {hasSelection && (
        <div style={{ display:'flex', alignItems:'center', gap:16, padding:'10px 16px',
          background:'rgba(180,78,255,0.06)', border:'1px solid rgba(180,78,255,0.25)',
          borderRadius:'var(--radius)', marginBottom:0 }}>
          <span style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--purple)', fontWeight:700, letterSpacing:'0.5px' }}>
            {selectedIds.size} SELECTED
          </span>
          <div style={{ display:'flex', gap:16, alignItems:'center' }}>
            {selViews > 0 && <span style={{ fontFamily:'VT323', fontSize:22, color:'#00e5ff', textShadow:'0 0 8px #00e5ff', lineHeight:1 }}>👁 {fmtN(selViews)}</span>}
            {selEng > 0   && <span style={{ fontFamily:'VT323', fontSize:22, color:'#ff2d78', textShadow:'0 0 8px #ff2d78', lineHeight:1 }}>💬 {fmtN(selEng)}</span>}
            {selImp > 0   && <span style={{ fontFamily:'VT323', fontSize:22, color:'#b44eff', textShadow:'0 0 8px #b44eff', lineHeight:1 }}>📢 {fmtN(selImp)}</span>}
          </div>
          <span style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--text3)' }}>↓ chart shows selected posts</span>
          <button onClick={clearSelection}
            style={{ marginLeft:'auto', fontFamily:'DM Mono', fontSize:9, color:'var(--text3)',
              background:'none', border:'1px solid var(--border)', borderRadius:4,
              padding:'3px 8px', cursor:'pointer' }}>
            ✕ Clear
          </button>
        </div>
      )}

      {/* ── CHART ── */}
      <div className="win95-window">
        <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #1a0040, #4a0090)' }}>
          <span className="win95-title">
            📈 {hasSelection ? `PERFORMANCE CHART — ${selectedIds.size} SELECTED POSTS` : 'PERFORMANCE CHART — hover bars for details'}
          </span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          {chartData.length === 0 ? (
            <div className="empty-analytics" style={{ height: 120 }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>📊</div>
              <div>No stats yet — sync from Sprout or add manually below</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <StatChart
                key={chartKey}
                data={chartData}
                activeMetrics={activeMetrics}
                chartType={chartType}
              />
            </div>
          )}
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
            <div className="empty-analytics" style={{ padding: 24 }}>No posts match the current filters</div>
          ) : filteredPosts.map(post => (
            <div key={post.id} className="analytics-row"
              style={{ gridTemplateColumns:'28px 2fr 1fr 1fr 100px 100px 100px',
                background: selectedIds.has(post.id) ? 'rgba(180,78,255,0.06)' : undefined,
                cursor:'pointer' }}
              onClick={() => toggleSelect(post.id)}>
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
          ))}
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
