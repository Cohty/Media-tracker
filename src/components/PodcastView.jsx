import { useState, useEffect, useMemo } from 'react'
import { XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts'

async function transistorFetch(path, params = {}) {
  const qs = new URLSearchParams({ path, ...params })
  const res = await fetch(`/api/transistor?${qs}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Simple SVG line chart — no ResponsiveContainer
function TrendChart({ data }) {
  if (!data || data.length === 0) return null
  const w = Math.max(data.length * 30, 600), h = 160
  const padL = 48, padR = 16, padT = 8, padB = 24
  const cw = w - padL - padR, ch = h - padT - padB
  const maxVal = Math.max(...data.map(d => d.downloads), 1)

  const pts = data.map((d, i) => ({
    x: padL + (i / (data.length - 1 || 1)) * cw,
    y: padT + ch * (1 - d.downloads / maxVal),
    ...d,
  }))

  const path = pts.map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${path} L${pts[pts.length-1].x},${padT+ch} L${pts[0].x},${padT+ch} Z`

  const ticks = [0, 0.5, 1].map(t => ({
    val: Math.round(maxVal * t),
    y: padT + ch * (1 - t),
  }))

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      {ticks.map(t => (
        <g key={t.val}>
          <line x1={padL} y1={t.y} x2={padL+cw} y2={t.y} stroke="rgba(180,78,255,0.08)" strokeWidth={1} />
          <text x={padL-4} y={t.y+3} textAnchor="end" fill="#4a4168" fontSize={9} fontFamily="DM Mono">
            {t.val >= 1000 ? `${(t.val/1000).toFixed(1)}k` : t.val}
          </text>
        </g>
      ))}
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b44eff" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#b44eff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#grad)" />
      <path d={path} fill="none" stroke="#b44eff" strokeWidth={2} />
      {pts.filter((_, i) => i % Math.ceil(pts.length / 10) === 0).map((p, i) => (
        <text key={i} x={p.x} y={padT+ch+14} textAnchor="middle" fill="#4a4168" fontSize={8} fontFamily="DM Mono">
          {p.date?.slice(0,5)}
        </text>
      ))}
    </svg>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0f0c1e', border: '1px solid rgba(180,78,255,0.4)', borderRadius: 4, padding: '8px 12px', fontFamily: 'DM Mono', fontSize: 10 }}>
      <div style={{ color: '#e2d9ff', marginBottom: 4 }}>{label}</div>
      {payload.map(p => <div key={p.dataKey} style={{ color: p.color }}>{p.name}: {Number(p.value).toLocaleString()}</div>)}
    </div>
  )
}

export default function PodcastView() {
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [shows, setShows] = useState([])
  const [selectedShow, setSelectedShow] = useState(null)
  const [showAnalytics, setShowAnalytics] = useState(null)
  const [episodeAnalytics, setEpisodeAnalytics] = useState([])
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [range, setRange] = useState('30')

  useEffect(() => {
    transistorFetch('shows')
      .then(data => {
        const list = data.data || []
        setShows(list); setStatus('ready')
        if (list.length > 0) setSelectedShow(list[0])
      })
      .catch(err => {
        setStatus(err.message.includes('503') ? 'no-key' : 'error')
        setErrorMsg(err.message)
      })
  }, [])

  useEffect(() => {
    if (!selectedShow) return
    setLoadingAnalytics(true)
    const today = new Date()
    const start = new Date(today); start.setDate(today.getDate() - parseInt(range))
    const fmt = d => `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`

    Promise.all([
      transistorFetch(`analytics/${selectedShow.id}`, { start_date: fmt(start), end_date: fmt(today) }),
      transistorFetch(`analytics/${selectedShow.id}/episodes`, { start_date: fmt(start), end_date: fmt(today) }),
    ]).then(([showData, epData]) => {
      setShowAnalytics(showData.data?.attributes || null)
      setEpisodeAnalytics(epData.data?.attributes?.episodes || [])
      setLoadingAnalytics(false)
    }).catch(() => setLoadingAnalytics(false))
  }, [selectedShow, range])

  const trendData = useMemo(() =>
    (showAnalytics?.downloads || []).map(d => ({ date: d.date, downloads: d.downloads })),
    [showAnalytics]
  )

  const episodeTotals = useMemo(() =>
    episodeAnalytics.map(ep => ({
      ...ep,
      total: ep.downloads.reduce((s, d) => s + d.downloads, 0),
    })).sort((a, b) => b.total - a.total),
    [episodeAnalytics]
  )

  const totalDownloads = trendData.reduce((s, d) => s + d.downloads, 0)
  const avgPerEp = episodeTotals.length > 0 ? Math.round(totalDownloads / episodeTotals.length) : 0
  const topEp = episodeTotals[0]

  if (status === 'loading') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text3)' }}>
      Connecting to Transistor.fm…
    </div>
  )

  if (status === 'no-key') return (
    <div className="podcast-wrapper">
      <div className="win95-window" style={{ maxWidth: 500 }}>
        <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #400010, #a00030)' }}>
          <span className="win95-title">⚠ SETUP REQUIRED</span>
        </div>
        <div style={{ padding: 24, fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text2)', lineHeight: 1.8 }}>
          Add <span style={{ color: 'var(--cyan)' }}>TRANSISTOR_API_KEY</span> in Cloudflare Pages → Settings → Environment Variables.
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
          {shows.map(show => (
            <button key={show.id}
              className={`podcast-show-btn${selectedShow?.id === show.id ? ' active' : ''}`}
              onClick={() => setSelectedShow(show)}>
              {show.attributes.title}
            </button>
          ))}
        </div>
      </div>

      {selectedShow && (
        <>
          {/* Stats + range */}
          <div className="podcast-header">
            {[
              { label: 'Total Downloads', val: loadingAnalytics ? '…' : totalDownloads.toLocaleString(), sub: `last ${range} days`, accent: '#b44eff' },
              { label: 'Episodes w/ Activity', val: loadingAnalytics ? '…' : episodeTotals.length, sub: 'in range', accent: '#00e5ff' },
              { label: 'Avg / Episode', val: loadingAnalytics ? '…' : avgPerEp.toLocaleString(), sub: 'downloads', accent: '#39ff8c' },
              { label: 'Top Episode', val: loadingAnalytics ? '…' : (topEp?.total.toLocaleString() || '—'), sub: topEp ? topEp.title.slice(0, 22) + '…' : 'none', accent: '#f0e040' },
            ].map(({ label, val, sub, accent }) => (
              <div key={label} className="win95-window podcast-stat-card" style={{ '--accent': accent }}>
                <div style={{ padding: 14 }}>
                  <div className="stat-label">{label}</div>
                  <div className="stat-value" style={{ color: accent, textShadow: `0 0 10px ${accent}` }}>{val}</div>
                  <div className="stat-sub" title={sub}>{sub}</div>
                </div>
              </div>
            ))}
            <div className="win95-window" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="stat-label">DATE RANGE</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {['7','14','30'].map(d => (
                  <button key={d}
                    className={`metric-btn${range === d ? ' active' : ''}`}
                    style={range === d ? { color: 'var(--purple)', borderColor: 'rgba(180,78,255,0.4)' } : {}}
                    onClick={() => setRange(d)}>{d}d</button>
                ))}
              </div>
            </div>
          </div>

          {/* Download trend */}
          <div className="win95-window">
            <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #001840, #003080)' }}>
              <span className="win95-title">📈 DOWNLOAD TREND — {selectedShow.attributes.title}</span>
            </div>
            <div style={{ padding: 16, overflowX: 'auto' }}>
              {loadingAnalytics
                ? <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text3)' }}>Loading…</div>
                : trendData.length === 0
                  ? <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text3)' }}>No data for this period</div>
                  : <TrendChart data={trendData} />
              }
            </div>
          </div>

          {/* Episode breakdown — downloads only, no manual fields */}
          <div className="win95-window">
            <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #001a20, #003040)' }}>
              <span className="win95-title">📋 EPISODE BREAKDOWN</span>
            </div>
            <div className="analytics-table-wrap">
              <div className="analytics-table-header" style={{ gridTemplateColumns: '3fr 1fr 1fr' }}>
                <div>EPISODE</div>
                <div>DOWNLOADS</div>
                <div>PUBLISHED</div>
              </div>
              {loadingAnalytics ? (
                <div className="empty-analytics" style={{ padding: 24 }}>Loading episodes…</div>
              ) : episodeTotals.length === 0 ? (
                <div className="empty-analytics" style={{ padding: 24 }}>No episode activity in this period</div>
              ) : episodeTotals.map(ep => (
                <div key={ep.id} className="analytics-row" style={{ gridTemplateColumns: '3fr 1fr 1fr' }}>
                  <div className="analytics-cell">
                    <div className="analytics-cell-text">{ep.title}</div>
                  </div>
                  <div className="analytics-cell">
                    <div style={{ fontFamily: 'VT323', fontSize: 24, color: 'var(--purple)', textShadow: '0 0 8px var(--purple)', lineHeight: 1 }}>
                      {ep.total.toLocaleString()}
                    </div>
                  </div>
                  <div className="analytics-cell">
                    <div className="analytics-cell-text" style={{ fontSize: 9 }}>
                      {new Date(ep.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="podcast-note">
            <span style={{ color: 'var(--yellow)' }}>ℹ</span>
            <span>Downloads = audio file deliveries via Transistor (industry standard IAB metric). Spotify streams and Apple listens are separate metrics only available inside those platforms' dashboards — they measure consumption, not delivery.</span>
          </div>
        </>
      )}
    </div>
  )
}
