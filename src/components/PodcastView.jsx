import React, { useState, useEffect, useMemo, useRef } from 'react'

// Only track these shows
const TRACKED_SHOWS = ['The Crypto Beat', 'Layer One', 'The Big Brain Podcast']

// Show name → our board show name mapping
const SHOW_TO_BOARD = {
  'The Crypto Beat': 'The Crypto Beat',
  'Layer One': 'Layer One',
  'The Big Brain Podcast': 'The Big Brain Podcast',
}

const SHOW_COLORS = {
  'The Crypto Beat':       '#f0a020',
  'Layer One':             '#ff2d78',
  'The Big Brain Podcast': '#00e5ff',
}

async function transistorFetch(path, params = {}) {
  const qs = new URLSearchParams({ path, ...params })
  const res = await fetch(`/api/transistor?${qs}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Pure SVG chart — bar or line — with hover tooltip
function TrendChart({ data, chartType }) {
  const [tooltip, setTooltip] = useState(null)
  if (!data || data.length === 0) return null

  const w = 900, h = 180
  const padL = 48, padR = 16, padT = 12, padB = 40
  const cw = w - padL - padR, ch = h - padT - padB
  const maxVal = Math.max(...data.map(d => d.downloads), 1)

  const pts = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * cw,
    y: padT + ch * (1 - d.downloads / maxVal),
    ...d,
  }))

  const ticks = [0, 0.5, 1].map(t => ({
    val: Math.round(maxVal * t),
    y: padT + ch * (1 - t),
  }))

  // Show every ~7th label
  const labelStep = Math.ceil(pts.length / 8)

  const linePath = pts.map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${pts[pts.length-1].x},${padT+ch} L${pts[0].x},${padT+ch} Z`

  return (
    <div style={{ position: 'relative' }}>
      {tooltip && (
        <div style={{
          position: 'absolute', zIndex: 10, pointerEvents: 'none',
          left: `${Math.min(tooltip.svgX / 900 * 100, 65)}%`, top: 8,
          background: '#0f0c1e', border: '1px solid rgba(180,78,255,0.5)',
          borderRadius: 4, padding: '8px 12px', fontFamily: 'DM Mono', fontSize: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)', minWidth: 160,
        }}>
          <div style={{ color: '#e2d9ff', marginBottom: 4 }}>{tooltip.date}</div>
          <div style={{ color: '#b44eff' }}>Downloads: {tooltip.downloads.toLocaleString()}</div>
          {tooltip.topEp && (
            <div style={{ color: '#4a4168', fontSize: 9, marginTop: 4 }}>
              Top ep: {tooltip.topEp}
            </div>
          )}
        </div>
      )}

      <svg width="100%" viewBox={`0 0 ${w} ${h}`}
        style={{ display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setTooltip(null)}>

        {ticks.map(t => (
          <g key={t.val}>
            <line x1={padL} y1={t.y} x2={padL+cw} y2={t.y} stroke="rgba(180,78,255,0.07)" strokeWidth={1} />
            <text x={padL-4} y={t.y+3} textAnchor="end" fill="#4a4168" fontSize={9} fontFamily="DM Mono">
              {t.val >= 1000 ? `${(t.val/1000).toFixed(1)}k` : t.val}
            </text>
          </g>
        ))}
        <line x1={padL} y1={padT+ch} x2={padL+cw} y2={padT+ch} stroke="rgba(180,78,255,0.15)" strokeWidth={1}/>

        {chartType === 'bar' ? (
          pts.map((p, i) => {
            const bw = Math.max(cw / pts.length - 2, 2)
            const bh = ((p.downloads || 0) / maxVal) * ch
            return (
              <g key={i}
                onMouseMove={e => {
                  const rect = e.currentTarget.closest('svg').getBoundingClientRect()
                  const scaleX = 900 / rect.width
                  setTooltip({ ...p, svgX: (e.clientX - rect.left) * scaleX })
                }}>
                <rect x={p.x - bw/2} y={padT+ch-bh} width={bw} height={Math.max(bh,0)}
                  fill="#b44eff" opacity={0.8} rx={1} />
                <rect x={p.x - cw/pts.length/2} y={padT} width={cw/pts.length} height={ch}
                  fill="transparent" />
              </g>
            )
          })
        ) : (
          <g>
            <defs>
              <linearGradient id="tgrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b44eff" stopOpacity={0.2}/>
                <stop offset="100%" stopColor="#b44eff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#tgrad)" />
            <path d={linePath} fill="none" stroke="#b44eff" strokeWidth={2} />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3} fill="#b44eff"
                onMouseEnter={e => {
                  const rect = e.currentTarget.closest('svg').getBoundingClientRect()
                  setTooltip({ ...p, svgX: e.clientX - rect.left })
                }}
              />
            ))}
          </g>
        )}

        {/* X axis date labels */}
        {pts.filter((_, i) => i % labelStep === 0 || i === pts.length - 1).map((p, i) => (
          <text key={i} x={p.x} y={padT+ch+18} textAnchor="middle"
            fill="#4a4168" fontSize={9} fontFamily="DM Mono">
            {p.date?.slice(0, 5)}
          </text>
        ))}
      </svg>
    </div>
  )
}

const SORT_OPTIONS = [
  { id: 'downloads', label: 'Downloads' },
  { id: 'published', label: 'Publish Date' },
]

export default function PodcastView() {
  const [status, setStatus] = useState('loading')
  const [shows, setShows] = useState([])
  const [selectedShow, setSelectedShow] = useState(null)
  const [showAnalytics, setShowAnalytics] = useState(null)
  const [episodeAnalytics, setEpisodeAnalytics] = useState([])
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [range, setRange] = useState('30')
  const [chartType, setChartType] = useState('line')
  const [sortEpisodes, setSortEpisodes] = useState('downloads')

  useEffect(() => {
    transistorFetch('shows')
      .then(data => {
        // Filter to only tracked shows
        const all = data.data || []
        const filtered = all.filter(s =>
          TRACKED_SHOWS.some(name =>
            s.attributes.title.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(s.attributes.title.toLowerCase())
          )
        )
        setShows(filtered.length > 0 ? filtered : all)
        setStatus('ready')
        const first = filtered[0] || all[0]
        if (first) setSelectedShow(first)
      })
      .catch(err => setStatus(err.message.includes('503') ? 'no-key' : 'error'))
  }, [])

  useEffect(() => {
    if (!selectedShow) return
    setLoadingAnalytics(true)
    const today = new Date()
    const start = new Date(today); start.setDate(today.getDate() - parseInt(range))
    const fmt = d => `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`

    if (selectedShow === 'all') {
      // Fetch all shows and combine
      Promise.all(shows.map(show =>
        Promise.all([
          transistorFetch(`analytics/${show.id}`, { start_date: fmt(start), end_date: fmt(today) }),
          transistorFetch(`analytics/${show.id}/episodes`, { start_date: fmt(start), end_date: fmt(today) }),
        ]).then(([showData, epData]) => ({
          showTitle: show.attributes.title,
          downloads: showData.data?.attributes?.downloads || [],
          episodes: (epData.data?.attributes?.episodes || []).map(ep => ({
            ...ep, showTitle: show.attributes.title,
          })),
        }))
      )).then(results => {
        // Merge daily downloads across all shows
        const dateMap = {}
        results.forEach(r => {
          r.downloads.forEach(d => {
            dateMap[d.date] = (dateMap[d.date] || 0) + d.downloads
          })
        })
        const merged = Object.entries(dateMap).sort().map(([date, downloads]) => ({ date, downloads }))
        setShowAnalytics({ downloads: merged })
        setEpisodeAnalytics(results.flatMap(r => r.episodes))
        setLoadingAnalytics(false)
      }).catch(() => setLoadingAnalytics(false))
      return
    }

    Promise.all([
      transistorFetch(`analytics/${selectedShow.id}`, { start_date: fmt(start), end_date: fmt(today) }),
      transistorFetch(`analytics/${selectedShow.id}/episodes`, { start_date: fmt(start), end_date: fmt(today) }),
    ]).then(([showData, epData]) => {
      setShowAnalytics(showData.data?.attributes || null)
      setEpisodeAnalytics((epData.data?.attributes?.episodes || []).map(ep => ({ ...ep, showTitle: selectedShow.attributes.title })))
      setLoadingAnalytics(false)
    }).catch(() => setLoadingAnalytics(false))
  }, [selectedShow, range, shows])

  const trendData = useMemo(() =>
    (showAnalytics?.downloads || []).map(d => ({ date: d.date, downloads: d.downloads })),
    [showAnalytics]
  )

  const episodeTotals = useMemo(() => {
    const eps = episodeAnalytics.map(ep => ({
      ...ep,
      total: ep.downloads.reduce((s, d) => s + d.downloads, 0),
    }))
    if (sortEpisodes === 'downloads') return eps.sort((a, b) => b.total - a.total)
    return eps.sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
  }, [episodeAnalytics, sortEpisodes])

  const totalDownloads = trendData.reduce((s, d) => s + d.downloads, 0)
  const avgPerEp = episodeTotals.length > 0 ? Math.round(totalDownloads / episodeTotals.length) : 0
  const topEp = episodeTotals[0]
  const isAllShows = selectedShow === 'all'
  const showName = isAllShows ? 'All Shows' : (selectedShow?.attributes?.title || '')
  const showColor = isAllShows ? '#b44eff' : (Object.entries(SHOW_COLORS).find(([k]) => showName.includes(k) || k.includes(showName))?.[1] || '#b44eff')

  if (status === 'loading') return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200,
      fontFamily:'DM Mono', fontSize:10, color:'var(--text3)' }}>
      Connecting to Transistor.fm…
    </div>
  )

  if (status === 'no-key') return (
    <div className="podcast-wrapper">
      <div className="win95-window" style={{ maxWidth: 500 }}>
        <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #400010, #a00030)' }}>
          <span className="win95-title">⚠ SETUP REQUIRED</span>
        </div>
        <div style={{ padding: 24, fontFamily:'DM Mono', fontSize:10, color:'var(--text2)', lineHeight:1.8 }}>
          Add <span style={{ color:'var(--cyan)' }}>TRANSISTOR_API_KEY</span> in Cloudflare Pages → Settings → Environment Variables.
        </div>
      </div>
    </div>
  )

  return (
    <div className="podcast-wrapper">

      {/* Show selector */}
      <div className="win95-window">
        <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #1a0040, #4a0090)' }}>
          <span className="win95-title">🎙 PODCAST SHOWS</span>
        </div>
        <div className="podcast-shows-row">
          <button
            className={`podcast-show-btn${selectedShow === 'all' ? ' active' : ''}`}
            style={selectedShow === 'all' ? { color: 'var(--purple)', borderColor: 'rgba(180,78,255,0.5)', boxShadow: 'var(--win-out), 0 0 8px rgba(180,78,255,0.3)' } : {}}
            onClick={() => setSelectedShow('all')}>
            All Shows
          </button>
          {shows.map(show => (
            <button key={show.id}
              className={`podcast-show-btn${selectedShow?.id === show.id ? ' active' : ''}`}
              style={selectedShow?.id === show.id ? {
                color: SHOW_COLORS[show.attributes.title] || 'var(--purple)',
                borderColor: (SHOW_COLORS[show.attributes.title] || '#b44eff') + '66',
                boxShadow: `var(--win-out), 0 0 8px ${SHOW_COLORS[show.attributes.title] || '#b44eff'}33`,
              } : {}}
              onClick={() => setSelectedShow(show)}>
              {show.attributes.title}
            </button>
          ))}
        </div>
      </div>

      {selectedShow && (
        <>
          {/* Stats */}
          <div className="podcast-header">
            {[
              { label: 'Total Downloads', val: loadingAnalytics ? '…' : totalDownloads.toLocaleString(), sub: `last ${range} days`, accent: showColor },
              { label: 'Episodes w/ Activity', val: loadingAnalytics ? '…' : episodeTotals.length, sub: 'in range', accent: '#00e5ff' },
              { label: 'Avg / Episode', val: loadingAnalytics ? '…' : avgPerEp.toLocaleString(), sub: 'downloads', accent: '#39ff8c' },
              { label: 'Top Episode', val: loadingAnalytics ? '…' : (topEp?.total.toLocaleString() || '—'), sub: topEp ? topEp.title.slice(0, 24) + '…' : 'none', accent: '#f0e040' },
            ].map(({ label, val, sub, accent }) => (
              <div key={label} className="win95-window podcast-stat-card" style={{ '--accent': accent }}>
                <div style={{ padding: 14 }}>
                  <div className="stat-label">{label}</div>
                  <div className="stat-value" style={{ color: accent, textShadow: `0 0 10px ${accent}` }}>{val}</div>
                  <div className="stat-sub" title={sub}>{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Chart controls + chart */}
          <div className="win95-window">
            <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #001840, #003080)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span className="win95-title">📈 DOWNLOAD TREND — {showName}</span>
              <div style={{ display:'flex', gap:6, marginRight:8 }}>
                {['7','14','30'].map(d => (
                  <button key={d}
                    className={`metric-btn${range===d?' active':''}`}
                    style={range===d ? { color:'var(--purple)', borderColor:'rgba(180,78,255,0.4)', fontSize:8, padding:'2px 8px' } : { fontSize:8, padding:'2px 8px' }}
                    onClick={() => setRange(d)}>{d}d</button>
                ))}
                <div style={{ width:1, background:'var(--border)', margin:'0 4px' }} />
                <button className={`metric-btn${chartType==='line'?' active':''}`}
                  style={chartType==='line'?{color:'var(--purple)',borderColor:'rgba(180,78,255,0.4)',fontSize:8,padding:'2px 8px'}:{fontSize:8,padding:'2px 8px'}}
                  onClick={() => setChartType('line')}>╱ Line</button>
                <button className={`metric-btn${chartType==='bar'?' active':''}`}
                  style={chartType==='bar'?{color:'var(--purple)',borderColor:'rgba(180,78,255,0.4)',fontSize:8,padding:'2px 8px'}:{fontSize:8,padding:'2px 8px'}}
                  onClick={() => setChartType('bar')}>▦ Bar</button>
              </div>
            </div>
            <div style={{ padding:'12px 16px', overflowX:'auto' }}>
              {loadingAnalytics
                ? <div style={{ height:120, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'DM Mono', fontSize:10, color:'var(--text3)' }}>Loading…</div>
                : trendData.length === 0
                  ? <div style={{ height:120, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'DM Mono', fontSize:10, color:'var(--text3)' }}>No data for this period</div>
                  : <TrendChart data={trendData} chartType={chartType} />
              }
            </div>
          </div>

          {/* Episode breakdown */}
          <div className="win95-window">
            <div className="win95-titlebar" style={{ background:'linear-gradient(90deg, #001a20, #003040)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span className="win95-title">📋 EPISODE BREAKDOWN</span>
              <div style={{ display:'flex', gap:5, marginRight:8 }}>
                {SORT_OPTIONS.map(s => (
                  <button key={s.id}
                    className={`metric-btn${sortEpisodes===s.id?' active':''}`}
                    style={sortEpisodes===s.id?{color:'var(--yellow)',borderColor:'rgba(240,224,64,0.4)',fontSize:8,padding:'2px 8px'}:{fontSize:8,padding:'2px 8px'}}
                    onClick={() => setSortEpisodes(s.id)}>{s.label}</button>
                ))}
              </div>
            </div>
            <div className="analytics-table-wrap">
              <div className="analytics-table-header" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                <div>EPISODE</div>
                <div>SHOW</div>
                <div>DOWNLOADS</div>
                <div>PUBLISHED</div>
              </div>
              {loadingAnalytics ? (
                <div className="empty-analytics" style={{ padding:24 }}>Loading episodes…</div>
              ) : episodeTotals.length === 0 ? (
                <div className="empty-analytics" style={{ padding:24 }}>No episode activity in this period</div>
              ) : episodeTotals.map(ep => (
                <div key={ep.id} className="analytics-row" style={{ gridTemplateColumns:'2fr 1fr 1fr 1fr' }}>
                  <div className="analytics-cell">
                    <div className="analytics-cell-text">{ep.title}</div>
                  </div>
                  <div className="analytics-cell">
                    {(() => {
                      const epShow = ep.showTitle || showName
                      const epColor = Object.entries(SHOW_COLORS).find(([k]) => epShow.includes(k) || k.includes(epShow))?.[1] || '#b44eff'
                      return (
                        <span style={{
                          fontFamily:'DM Mono', fontSize:9, padding:'2px 8px', borderRadius:2,
                          background: epColor + '18', color: epColor, border: `1px solid ${epColor}44`,
                        }}>{epShow}</span>
                      )
                    })()}
                  </div>
                  <div className="analytics-cell">
                    <div style={{ fontFamily:'VT323', fontSize:22, color:'var(--purple)', textShadow:'0 0 8px var(--purple)', lineHeight:1 }}>
                      {ep.total.toLocaleString()}
                    </div>
                  </div>
                  <div className="analytics-cell">
                    <div className="analytics-cell-text" style={{ fontSize:9 }}>
                      {new Date(ep.published_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="podcast-note">
            <span style={{ color:'var(--yellow)' }}>ℹ</span>
            <span>Downloads = audio file deliveries via Transistor (IAB standard). Spotify streams and Apple listens are only available inside those platforms' dashboards.</span>
          </div>
        </>
      )}
    </div>
  )
}
