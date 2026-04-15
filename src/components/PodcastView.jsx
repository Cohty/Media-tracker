import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts'

const PLATFORM_KEY = 'transistor_platform_stats'

function loadPlatformStats() {
  try { return JSON.parse(localStorage.getItem(PLATFORM_KEY) || '{}') }
  catch { return {} }
}
function savePlatformStats(data) {
  localStorage.setItem(PLATFORM_KEY, JSON.stringify(data))
}

async function transistorFetch(path, params = {}) {
  const qs = new URLSearchParams({ path, ...params })
  const res = await fetch(`/api/transistor?${qs}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

const TooltipStyle = {
  background: '#0f0c1e',
  border: '1px solid rgba(180,78,255,0.4)',
  borderRadius: 4,
  padding: '8px 12px',
  fontFamily: 'DM Mono',
  fontSize: 10,
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={TooltipStyle}>
      <div style={{ color: '#e2d9ff', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toLocaleString()}
        </div>
      ))}
    </div>
  )
}

export default function PodcastView() {
  const [status, setStatus] = useState('idle') // idle | loading | error | ready | no-key
  const [errorMsg, setErrorMsg] = useState('')
  const [shows, setShows] = useState([])
  const [selectedShow, setSelectedShow] = useState(null)
  const [showAnalytics, setShowAnalytics] = useState(null)
  const [episodeAnalytics, setEpisodeAnalytics] = useState([])
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [platformStats, setPlatformStats] = useState(loadPlatformStats)
  const [range, setRange] = useState('30') // days

  // Load shows on mount
  useEffect(() => {
    setStatus('loading')
    transistorFetch('shows')
      .then(data => {
        const list = data.data || []
        setShows(list)
        setStatus('ready')
        if (list.length > 0) setSelectedShow(list[0])
      })
      .catch(err => {
        if (err.message.includes('not set')) {
          setStatus('no-key')
        } else {
          setStatus('error')
          setErrorMsg(err.message)
        }
      })
  }, [])

  // Load analytics when show or range changes
  useEffect(() => {
    if (!selectedShow) return
    setLoadingAnalytics(true)

    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - parseInt(range))
    const fmt = d => `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`

    Promise.all([
      transistorFetch(`analytics/${selectedShow.id}`, {
        start_date: fmt(start), end_date: fmt(today)
      }),
      transistorFetch(`analytics/${selectedShow.id}/episodes`, {
        start_date: fmt(start), end_date: fmt(today)
      }),
    ])
      .then(([showData, epData]) => {
        setShowAnalytics(showData.data?.attributes || null)
        setEpisodeAnalytics(epData.data?.attributes?.episodes || [])
        setLoadingAnalytics(false)
      })
      .catch(() => setLoadingAnalytics(false))
  }, [selectedShow, range])

  // Chart data for show trend
  const trendData = useMemo(() => {
    if (!showAnalytics?.downloads) return []
    return showAnalytics.downloads.map(d => ({
      date: d.date.slice(0, 5), // dd-mm
      downloads: d.downloads,
    }))
  }, [showAnalytics])

  // Episode totals (sum of daily downloads)
  const episodeTotals = useMemo(() =>
    episodeAnalytics.map(ep => ({
      ...ep,
      total: ep.downloads.reduce((s, d) => s + d.downloads, 0),
    })).sort((a, b) => b.total - a.total),
    [episodeAnalytics]
  )

  const totalDownloads = trendData.reduce((s, d) => s + d.downloads, 0)

  function updatePlatformStat(epId, field, value) {
    const updated = {
      ...platformStats,
      [epId]: { ...(platformStats[epId] || {}), [field]: value }
    }
    setPlatformStats(updated)
    savePlatformStats(updated)
  }

  // ── Renders ──────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="podcast-wrapper">
        <div className="podcast-loading">
          <div className="podcast-loading-dot" />
          <div className="podcast-loading-dot" style={{ animationDelay: '.2s' }} />
          <div className="podcast-loading-dot" style={{ animationDelay: '.4s' }} />
          <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text3)', marginTop: 12 }}>
            CONNECTING TO TRANSISTOR.FM
          </div>
        </div>
      </div>
    )
  }

  if (status === 'no-key') {
    return (
      <div className="podcast-wrapper">
        <div className="win95-window" style={{ maxWidth: 580 }}>
          <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #400010, #a00030)' }}>
            <span className="win95-title">⚠ SETUP REQUIRED</span>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ fontFamily: 'Press Start 2P', fontSize: 9, color: 'var(--pink)', marginBottom: 16, lineHeight: 2 }}>
              TRANSISTOR API KEY NOT FOUND
            </div>
            <p style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16 }}>
              To connect Transistor.fm, add your API key as a Cloudflare Pages environment variable.
            </p>
            <div className="setup-steps">
              {[
                ['1', 'Get your API key', 'Go to dashboard.transistor.fm → Account → API Key'],
                ['2', 'Open Cloudflare Pages', 'Your project → Settings → Environment Variables'],
                ['3', 'Add the variable', 'Name: TRANSISTOR_API_KEY  ·  Value: your key'],
                ['4', 'Redeploy', 'Trigger a new deployment — the key will be live'],
              ].map(([n, title, desc]) => (
                <div key={n} className="setup-step">
                  <div className="setup-step-num">{n}</div>
                  <div>
                    <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--cyan)', marginBottom: 3 }}>{title}</div>
                    <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="setup-note">
              <span style={{ color: 'var(--yellow)' }}>Note:</span> Your API key is stored only on Cloudflare's servers and never sent to the browser — it's secure.
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="podcast-wrapper">
        <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--pink)', padding: 24 }}>
          Error: {errorMsg}
        </div>
      </div>
    )
  }

  return (
    <div className="podcast-wrapper">

      {/* Show selector */}
      <div className="win95-window" style={{ marginBottom: 12 }}>
        <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #1a0040, #4a0090)' }}>
          <span className="win95-title">🎙 PODCAST SHOWS</span>
        </div>
        <div className="podcast-shows-row">
          {shows.map(show => (
            <button
              key={show.id}
              className={`podcast-show-btn${selectedShow?.id === show.id ? ' active' : ''}`}
              onClick={() => setSelectedShow(show)}
            >
              {show.attributes.title}
            </button>
          ))}
        </div>
      </div>

      {selectedShow && (
        <>
          {/* Header stats + range selector */}
          <div className="podcast-header">
            <div className="win95-window podcast-stat-card" style={{ '--accent': '#b44eff' }}>
              <div style={{ padding: 14 }}>
                <div className="stat-label">Total Downloads</div>
                <div className="stat-value">{loadingAnalytics ? '…' : totalDownloads.toLocaleString()}</div>
                <div className="stat-sub">last {range} days</div>
              </div>
            </div>
            <div className="win95-window podcast-stat-card" style={{ '--accent': '#00e5ff' }}>
              <div style={{ padding: 14 }}>
                <div className="stat-label">Episodes Tracked</div>
                <div className="stat-value">{loadingAnalytics ? '…' : episodeTotals.length}</div>
                <div className="stat-sub">with activity</div>
              </div>
            </div>
            <div className="win95-window podcast-stat-card" style={{ '--accent': '#39ff8c' }}>
              <div style={{ padding: 14 }}>
                <div className="stat-label">Avg / Episode</div>
                <div className="stat-value">
                  {loadingAnalytics || episodeTotals.length === 0 ? '…'
                    : Math.round(totalDownloads / episodeTotals.length).toLocaleString()}
                </div>
                <div className="stat-sub">downloads</div>
              </div>
            </div>
            <div className="win95-window" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="stat-label">DATE RANGE</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {['7','14','30'].map(d => (
                  <button
                    key={d}
                    className={`metric-btn${range === d ? ' active' : ''}`}
                    style={range === d ? { color: 'var(--purple)', borderColor: 'rgba(180,78,255,0.4)' } : {}}
                    onClick={() => setRange(d)}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Download trend chart */}
          <div className="win95-window">
            <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #001840, #003080)' }}>
              <span className="win95-title">📈 DOWNLOAD TREND — {selectedShow.attributes.title}</span>
            </div>
            <div style={{ padding: 16 }}>
              {loadingAnalytics ? (
                <div className="podcast-chart-loading">Loading chart data…</div>
              ) : trendData.length === 0 ? (
                <div className="empty-analytics">No download data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,78,255,0.08)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#4a4168', fontSize: 9, fontFamily: 'DM Mono' }}
                      axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#4a4168', fontSize: 9, fontFamily: 'DM Mono' }}
                      axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="downloads" name="Downloads"
                      stroke="#b44eff" strokeWidth={2} dot={false}
                      activeDot={{ r: 4, fill: '#b44eff', stroke: '#0f0c1e', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Episode breakdown */}
          <div className="win95-window">
            <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #001a20, #003040)' }}>
              <span className="win95-title">📋 EPISODE BREAKDOWN — enter Spotify & Apple stats manually</span>
            </div>
            <div className="analytics-table-wrap">
              <div className="analytics-table-header" style={{ gridTemplateColumns: '2fr 0.7fr 0.8fr 0.8fr 0.8fr' }}>
                <div>EPISODE</div>
                <div>DOWNLOADS</div>
                <div>SPOTIFY STREAMS</div>
                <div>APPLE LISTENS</div>
                <div>TOTAL REACH</div>
              </div>
              {loadingAnalytics ? (
                <div className="empty-analytics" style={{ padding: 24 }}>Loading episodes…</div>
              ) : episodeTotals.length === 0 ? (
                <div className="empty-analytics" style={{ padding: 24 }}>No episode activity in this period</div>
              ) : episodeTotals.map(ep => {
                const ps = platformStats[ep.id] || {}
                const spotify = Number(ps.spotify) || 0
                const apple = Number(ps.apple) || 0
                const total = ep.total + spotify + apple
                return (
                  <div key={ep.id} className="analytics-row" style={{ gridTemplateColumns: '2fr 0.7fr 0.8fr 0.8fr 0.8fr' }}>
                    <div className="analytics-cell">
                      <div className="analytics-cell-text">{ep.title}</div>
                      <div className="analytics-cell-sub">
                        {new Date(ep.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}{ep.total.toLocaleString()} transistor dl
                      </div>
                    </div>
                    <div className="analytics-cell">
                      <div style={{ fontFamily: 'VT323', fontSize: 22, color: 'var(--purple)', lineHeight: 1, textShadow: '0 0 8px var(--purple)' }}>
                        {ep.total.toLocaleString()}
                      </div>
                    </div>
                    <div className="analytics-cell">
                      <input type="number" className="stat-input"
                        value={ps.spotify ?? ''}
                        placeholder="—"
                        onChange={e => updatePlatformStat(ep.id, 'spotify', e.target.value)}
                      />
                    </div>
                    <div className="analytics-cell">
                      <input type="number" className="stat-input"
                        value={ps.apple ?? ''}
                        placeholder="—"
                        onChange={e => updatePlatformStat(ep.id, 'apple', e.target.value)}
                      />
                    </div>
                    <div className="analytics-cell">
                      <div style={{ fontFamily: 'VT323', fontSize: 22, color: total > 0 ? 'var(--green)' : 'var(--text3)', lineHeight: 1, textShadow: total > 0 ? '0 0 8px var(--green)' : 'none' }}>
                        {total > 0 ? total.toLocaleString() : '—'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Platform note */}
          <div className="podcast-note">
            <span style={{ color: 'var(--yellow)' }}>ℹ️</span>
            <span>
              <strong style={{ color: 'var(--text2)' }}>Downloads</strong> come from the Transistor API (audio delivery across all apps).{' '}
              <strong style={{ color: 'var(--cyan)' }}>Spotify streams</strong> and <strong style={{ color: 'var(--pink)' }}>Apple listens</strong> must be entered manually —
              get them from{' '}
              <a href="https://podcasters.spotify.com" target="_blank" rel="noreferrer" className="podcast-ext-link">Spotify for Podcasters</a>
              {' '}and{' '}
              <a href="https://podcastsconnect.apple.com" target="_blank" rel="noreferrer" className="podcast-ext-link">Apple Podcasts Connect</a>.
              Values are saved locally in your browser.
            </span>
          </div>
        </>
      )}
    </div>
  )
}
