import { useState, useMemo } from 'react'
import { SHOWS } from '../constants'

const SHOW_COLORS = Object.fromEntries([
  ...SHOWS.map(s => [s.name, s.hex]),
  ['Newsroom', '#e0d0ff'],
  ['Editorials', '#00a8ff'],
  ['Unassigned', '#4a4168'],
])

const RANGES = [
  { id: '1d',   label: 'Today',     days: 1 },
  { id: '7d',   label: 'This Week', days: 7 },
  { id: '30d',  label: 'Month',     days: 30 },
  { id: '365d', label: 'Year',      days: 365 },
  { id: 'all',  label: 'All Time',  days: null },
]

const METRICS = [
  { id: 'views',       label: 'Views',       color: '#00e5ff', icon: '👁' },
  { id: 'engagement',  label: 'Engagement',  color: '#ff2d78', icon: '💬' },
  { id: 'impressions', label: 'Impressions', color: '#b44eff', icon: '📢' },
]

const TYPE_COLORS = {
  'Full Episode': '#39ff8c',
  'Clip':         '#00e5ff',
  'Broadcast':    '#f0a020',
  'Article':      '#b44eff',
  'Thread':       '#40e0d0',
  'Reply':        '#ffd700',
  'Partner Post': '#ff9de2',
}

function fmt(n) {
  if (!n || isNaN(n)) return '—'
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n/1000).toFixed(1)}k`
  return String(n)
}

function Medal({ rank }) {
  if (rank === 1) return <span style={{ fontSize: 16 }}>🥇</span>
  if (rank === 2) return <span style={{ fontSize: 16 }}>🥈</span>
  if (rank === 3) return <span style={{ fontSize: 16 }}>🥉</span>
  return <span style={{ fontFamily: 'VT323', fontSize: 18, color: 'var(--text3)', lineHeight: 1 }}>{rank}</span>
}

export default function LeaderboardView({ posts }) {
  const [range, setRange] = useState('7d')
  const [metric, setMetric] = useState('views')
  const [filterShow, setFilterShow] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [limit, setLimit] = useState(25)

  const activeMetric = METRICS.find(m => m.id === metric)
  const activeRange = RANGES.find(r => r.id === range)

  const filtered = useMemo(() => {
    const now = Date.now()
    const cutoff = activeRange.days ? now - activeRange.days * 86400000 : 0

    return posts
      .filter(p => {
        if ((p.ts || 0) < cutoff) return false
        if (filterShow !== 'all' && p.show !== filterShow) return false
        if (filterType !== 'all' && p.mediaType !== filterType) return false
        const val = Number(p.stats?.[metric]) || 0
        return val > 0
      })
      .map(p => ({ ...p, metricVal: Number(p.stats?.[metric]) || 0 }))
      .sort((a, b) => b.metricVal - a.metricVal)
      .slice(0, limit)
  }, [posts, range, metric, filterShow, filterType, limit, activeRange])

  const allShows = ['all', ...new Set(posts.map(p => p.show).filter(Boolean))]
  const allTypes = ['all', ...new Set(posts.map(p => p.mediaType).filter(Boolean))]

  // Top 3 for hero display
  const top3 = filtered.slice(0, 3)
  const rest = filtered.slice(3)

  // Totals for filtered set
  const totals = useMemo(() => {
    const views = filtered.reduce((s, p) => s + (Number(p.stats?.views) || 0), 0)
    const engagement = filtered.reduce((s, p) => s + (Number(p.stats?.engagement) || 0), 0)
    const impressions = filtered.reduce((s, p) => s + (Number(p.stats?.impressions) || 0), 0)
    return { views, engagement, impressions }
  }, [filtered])

  return (
    <div style={{ padding: '0 0 60px' }}>

      {/* Header */}
      <div className="win95-window" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
        <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #1a0040, #4a0090)' }}>
          <span className="win95-title">🏆 LEADERBOARD — top performing content</span>
        </div>
        <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Row 1: Range + Metric */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>RANGE</span>
              {RANGES.map(r => (
                <button key={r.id} className={`metric-btn${range === r.id ? ' active' : ''}`}
                  style={range === r.id ? { color: 'var(--yellow)', borderColor: 'rgba(240,224,64,0.4)' } : {}}
                  onClick={() => setRange(r.id)}>{r.label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>RANKED BY</span>
              {METRICS.map(m => (
                <button key={m.id} className={`metric-btn${metric === m.id ? ' active' : ''}`}
                  style={metric === m.id ? { color: m.color, borderColor: m.color + '55' } : {}}
                  onClick={() => setMetric(m.id)}>{m.icon} {m.label}</button>
              ))}
            </div>
          </div>

          {/* Row 2: Show + Type filters */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>SHOW</span>
              <button className={`metric-btn${filterShow === 'all' ? ' active' : ''}`}
                style={filterShow === 'all' ? { color: 'var(--purple)', borderColor: 'rgba(180,78,255,0.4)' } : {}}
                onClick={() => setFilterShow('all')}>All</button>
              {allShows.filter(s => s !== 'all').map(s => (
                <button key={s} className={`metric-btn${filterShow === s ? ' active' : ''}`}
                  style={filterShow === s ? { color: SHOW_COLORS[s] || 'var(--purple)', borderColor: (SHOW_COLORS[s] || '#b44eff') + '55' } : {}}
                  onClick={() => setFilterShow(s)}>{s}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>TYPE</span>
              <button className={`metric-btn${filterType === 'all' ? ' active' : ''}`}
                style={filterType === 'all' ? { color: 'var(--text)', borderColor: 'rgba(255,255,255,0.2)' } : {}}
                onClick={() => setFilterType('all')}>All</button>
              {allTypes.filter(t => t !== 'all').map(t => (
                <button key={t} className={`metric-btn${filterType === t ? ' active' : ''}`}
                  style={filterType === t ? { color: TYPE_COLORS[t] || 'var(--cyan)', borderColor: (TYPE_COLORS[t] || '#00e5ff') + '55' } : {}}
                  onClick={() => setFilterType(t)}>{t}</button>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div style={{ display: 'flex', gap: 20, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>{filtered.length} posts ranked</span>
            {[
              { label: 'Total Views', val: totals.views, color: '#00e5ff' },
              { label: 'Total Engagement', val: totals.engagement, color: '#ff2d78' },
              { label: 'Total Impressions', val: totals.impressions, color: '#b44eff' },
            ].map(({ label, val, color }) => val > 0 && (
              <span key={label} style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>
                {label}: <span style={{ color, fontFamily: 'VT323', fontSize: 16, lineHeight: 1 }}>{fmt(val)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text3)' }}>
          No posts with {activeMetric.label.toLowerCase()} stats in this range.<br />
          <span style={{ fontSize: 9, marginTop: 8, display: 'block' }}>Try syncing from Sprout or selecting a wider date range.</span>
        </div>
      ) : (
        <>
          {/* Top 3 hero cards */}
          {top3.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${top3.length}, 1fr)`, gap: 12, padding: '16px 16px 8px' }}>
              {top3.map((post, i) => (
                <div key={post.id} className="win95-window" style={{ position: 'relative', overflow: 'hidden' }}>
                  <div style={{ height: 3, background: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : '#cd7f32' }} />
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <Medal rank={i + 1} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text)', lineHeight: 1.4,
                          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {post.title}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'DM Mono', fontSize: 8, color: SHOW_COLORS[post.show] || 'var(--text3)',
                            background: (SHOW_COLORS[post.show] || '#4a4168') + '18',
                            border: `1px solid ${(SHOW_COLORS[post.show] || '#4a4168')}44`,
                            padding: '1px 6px', borderRadius: 2 }}>{post.show}</span>
                          {post.platform && <span style={{ fontFamily: 'DM Mono', fontSize: 8, color: 'var(--text3)' }}>{post.platform}</span>}
                          {post.mediaType && <span style={{ fontFamily: 'DM Mono', fontSize: 8, color: TYPE_COLORS[post.mediaType] || 'var(--text3)' }}>{post.mediaType}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontFamily: 'VT323', fontSize: 36, color: activeMetric.color,
                          textShadow: `0 0 12px ${activeMetric.color}`, lineHeight: 1 }}>
                          {fmt(post.metricVal)}
                        </div>
                        <div style={{ fontFamily: 'DM Mono', fontSize: 8, color: 'var(--text3)' }}>{activeMetric.label.toLowerCase()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {['views','engagement','impressions'].filter(k => k !== metric).map(k => {
                          const v = Number(post.stats?.[k]) || 0
                          const m = METRICS.find(x => x.id === k)
                          return v > 0 ? (
                            <div key={k} style={{ fontFamily: 'DM Mono', fontSize: 8, color: m.color }}>
                              {m.icon} {fmt(v)}
                            </div>
                          ) : null
                        })}
                        <div style={{ fontFamily: 'DM Mono', fontSize: 8, color: 'var(--text3)', marginTop: 2 }}>{post.date}</div>
                      </div>
                    </div>
                    <a href={post.url} target="_blank" rel="noreferrer"
                      style={{ fontFamily: 'DM Mono', fontSize: 8, color: 'var(--cyan)', textDecoration: 'none',
                        display: 'block', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {post.url}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rest of the list */}
          {rest.length > 0 && (
            <div style={{ padding: '0 16px' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '40px 3fr 1fr 80px 80px 80px 100px',
                  padding: '6px 14px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
                  fontFamily: 'DM Mono', fontSize: 8, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', gap: 8 }}>
                  <div>#</div><div>TITLE</div><div>SHOW</div>
                  <div style={{ color: '#00e5ff' }}>VIEWS</div>
                  <div style={{ color: '#ff2d78' }}>ENGAGE</div>
                  <div style={{ color: '#b44eff' }}>IMPRESSIONS</div>
                  <div>DATE</div>
                </div>
                {rest.map((post, i) => (
                  <div key={post.id} style={{ display: 'grid', gridTemplateColumns: '40px 3fr 1fr 80px 80px 80px 100px',
                    padding: '8px 14px', borderBottom: '1px solid var(--border)', gap: 8,
                    background: i % 2 === 0 ? 'var(--surface)' : 'rgba(255,255,255,0.01)',
                    alignItems: 'center' }}>
                    <div style={{ fontFamily: 'VT323', fontSize: 18, color: 'var(--text3)', lineHeight: 1 }}>{i + 4}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {post.title}
                      </div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 8, color: 'var(--text3)', marginTop: 1 }}>
                        {post.platform} · {post.mediaType}
                        {post.episodeNumber ? ` · EP ${post.episodeNumber}` : ''}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontFamily: 'DM Mono', fontSize: 8, color: SHOW_COLORS[post.show] || 'var(--text3)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {post.show}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'VT323', fontSize: 18, color: '#00e5ff', lineHeight: 1 }}>{fmt(Number(post.stats?.views)||0)}</div>
                    <div style={{ fontFamily: 'VT323', fontSize: 18, color: '#ff2d78', lineHeight: 1 }}>{fmt(Number(post.stats?.engagement)||0)}</div>
                    <div style={{ fontFamily: 'VT323', fontSize: 18, color: '#b44eff', lineHeight: 1 }}>{fmt(Number(post.stats?.impressions)||0)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'DM Mono', fontSize: 8, color: 'var(--text3)' }}>{post.date}</span>
                      <a href={post.url} target="_blank" rel="noreferrer"
                        style={{ fontFamily: 'DM Mono', fontSize: 8, color: 'var(--cyan)', textDecoration: 'none' }}>↗</a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Show more */}
              {posts.filter(p => Number(p.stats?.[metric]) > 0).length > limit && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <button className="btn-ghost" onClick={() => setLimit(l => l + 25)}>
                    Show 25 more
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
