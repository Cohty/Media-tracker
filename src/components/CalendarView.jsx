import { useState, useMemo, useRef } from 'react'
import { SHOWS, PLATFORMS, MEDIA_TYPES } from '../constants'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const TYPE_COLORS = {
  'Clip': '#00e5ff', 'Full Episode': '#39ff8c', 'Broadcast': '#f0a020',
  'Article': '#b44eff', 'Thread': '#40e0d0', 'Reply': '#ffd700', 'Partner Post': '#ff9de2',
}

function dateKey(ts) { return new Date(ts).toISOString().split('T')[0] }

function formatRange(start, end) {
  if (!start) return 'Click a day to filter · drag for a range'
  const s = new Date(start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (!end || end === start) return s
  const e = new Date(end + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${s} — ${e}`
}

function fmt(n) {
  if (!n || isNaN(n) || n === 0) return '—'
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n/1000).toFixed(1)}k`
  return String(n)
}

function fmtFull(n) {
  if (!n || isNaN(n) || n === 0) return null
  return Number(n).toLocaleString()
}

// Tooltip for metric totals
function MetricTotal({ label, value, color }) {
  const [hover, setHover] = useState(false)
  const full = fmtFull(value)
  if (value === 0) return null
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, position:'relative' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <span style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px' }}>{label}</span>
      <span style={{ fontFamily:'VT323', fontSize:22, color, textShadow:`0 0 8px ${color}`, lineHeight:1, cursor: full ? 'help' : 'default' }}>
        {fmt(value)}
      </span>
      {hover && full && (
        <div style={{ position:'absolute', bottom:'calc(100% + 6px)', left:0,
          background:'#0f0c1e', border:`1px solid ${color}44`, borderRadius:4,
          padding:'4px 10px', fontFamily:'VT323', fontSize:20, color, whiteSpace:'nowrap',
          zIndex:100, boxShadow:'0 4px 16px rgba(0,0,0,0.6)', pointerEvents:'none' }}>
          {full}
        </div>
      )}
    </div>
  )
}

// Tooltip for type count — shows breakdown of posts
function TypeCount({ label, count, color, posts }) {
  const [hover, setHover] = useState(false)
  const ref = useRef(null)
  if (count === 0) return null
  const typePosts = posts.filter(p => (p.mediaType || 'Unknown') === label)
  return (
    <div className="cal-summary-item" style={{ position:'relative' }} ref={ref}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <span className="cal-summary-val" style={{ color, cursor:'help' }}>{count}</span>
      <span className="cal-summary-label">{label}s</span>
      {hover && (
        <div style={{ position:'absolute', top:'calc(100% + 8px)', left:0, minWidth:220, maxWidth:300,
          background:'#0f0c1e', border:`1px solid ${color}44`, borderRadius:6,
          padding:'8px 10px', zIndex:200, boxShadow:'0 8px 24px rgba(0,0,0,0.8)' }}>
          <div style={{ fontFamily:'DM Mono', fontSize:8, color, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>
            {count} {label}{count !== 1 ? 's' : ''}
          </div>
          {typePosts.slice(0, 8).map(p => (
            <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'3px 0', borderBottom:'1px solid var(--border)', gap:8 }}>
              <div style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--text)', overflow:'hidden',
                textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                {p.title?.slice(0, 35)}{p.title?.length > 35 ? '…' : ''}
              </div>
              <div style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--text3)', flexShrink:0 }}>
                {p.platform}
                {Number(p.stats?.views) > 0 && <span style={{ color:'#00e5ff', marginLeft:4 }}>👁{fmt(Number(p.stats.views))}</span>}
              </div>
            </div>
          ))}
          {typePosts.length > 8 && (
            <div style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--text3)', marginTop:4 }}>
              +{typePosts.length - 8} more
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const SORT_OPTIONS = [
  { id: 'date',        label: 'Date' },
  { id: 'views',       label: '👁 Views' },
  { id: 'engagement',  label: '💬 Engage' },
  { id: 'impressions', label: '📢 Impressions' },
  { id: 'type',        label: 'Type' },
]

export default function CalendarView({ posts }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [rangeStart, setRangeStart] = useState(null)
  const [rangeEnd, setRangeEnd] = useState(null)
  const [sortBy, setSortBy] = useState('date')

  const postsByDate = useMemo(() => {
    const map = {}
    posts.forEach(p => {
      const k = dateKey(p.ts)
      if (!map[k]) map[k] = []
      map[k].push(p)
    })
    return map
  }, [posts])

  const { firstDay, daysInMonth } = useMemo(() => ({
    firstDay: new Date(year, month, 1).getDay(),
    daysInMonth: new Date(year, month + 1, 0).getDate(),
  }), [year, month])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  function handleDayClick(day) {
    const k = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (!rangeStart || (rangeStart && rangeEnd)) { setRangeStart(k); setRangeEnd(null) }
    else {
      if (k >= rangeStart) setRangeEnd(k)
      else { setRangeEnd(rangeStart); setRangeStart(k) }
    }
  }

  function clearRange() { setRangeStart(null); setRangeEnd(null) }

  const filteredPosts = useMemo(() => {
    if (!rangeStart) return []
    const end = rangeEnd || rangeStart
    const result = posts.filter(p => {
      const k = dateKey(p.ts)
      return k >= rangeStart && k <= end
    })
    switch (sortBy) {
      case 'views':       return [...result].sort((a, b) => (Number(b.stats?.views) || 0) - (Number(a.stats?.views) || 0))
      case 'engagement':  return [...result].sort((a, b) => (Number(b.stats?.engagement) || 0) - (Number(a.stats?.engagement) || 0))
      case 'impressions': return [...result].sort((a, b) => (Number(b.stats?.impressions) || 0) - (Number(a.stats?.impressions) || 0))
      case 'type':        return [...result].sort((a, b) => (a.mediaType || '').localeCompare(b.mediaType || ''))
      default:            return [...result].sort((a, b) => b.ts - a.ts)
    }
  }, [posts, rangeStart, rangeEnd, sortBy])

  const typeCounts = useMemo(() => {
    const counts = {}
    filteredPosts.forEach(p => { counts[p.mediaType || 'Unknown'] = (counts[p.mediaType || 'Unknown'] || 0) + 1 })
    return counts
  }, [filteredPosts])

  const metricTotals = useMemo(() => {
    let views = 0, engagement = 0, impressions = 0
    filteredPosts.forEach(p => {
      views       += Number(p.stats?.views)       || 0
      engagement  += Number(p.stats?.engagement)  || 0
      impressions += Number(p.stats?.impressions) || 0
    })
    return { views, engagement, impressions }
  }, [filteredPosts])

  const todayKey = dateKey(Date.now())
  const showColors = Object.fromEntries(SHOWS.map(s => [s.name, s.hex]))

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="cal-wrapper">
      <div className="cal-layout">

        {/* Calendar panel — bigger */}
        <div className="cal-panel win95-window" style={{ minWidth: 340 }}>
          <div className="win95-titlebar">
            <span className="win95-title">📅 CALENDAR.EXE</span>
            <div className="win95-controls">
              <button className="win95-ctrl">_</button>
              <button className="win95-ctrl">□</button>
              <button className="win95-ctrl">×</button>
            </div>
          </div>
          <div className="cal-body" style={{ padding: '12px 14px' }}>
            <div className="cal-month-nav">
              <button className="cal-nav-btn" onClick={prevMonth}>◀</button>
              <span className="cal-month-title">{MONTHS[month]} {year}</span>
              <button className="cal-nav-btn" onClick={nextMonth}>▶</button>
            </div>
            <div className="cal-grid">
              <div className="cal-weekdays">
                {WEEKDAYS.map(d => <div key={d} className="cal-weekday">{d}</div>)}
              </div>
              <div className="cal-days">
                {cells.map((day, i) => {
                  if (!day) return <div key={`e-${i}`} className="cal-day empty" />
                  const k = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const dayPosts = postsByDate[k] || []
                  const isToday = k === todayKey
                  const isStart = k === rangeStart
                  const isEnd = k === (rangeEnd || rangeStart)
                  const inRange = rangeStart && (rangeEnd || rangeStart) && k >= rangeStart && k <= (rangeEnd || rangeStart)
                  return (
                    <div key={k}
                      className={`cal-day${dayPosts.length > 0 ? ' has-posts' : ''}${isToday ? ' today' : ''}${isStart || isEnd ? ' selected' : ''}${inRange && !isStart && !isEnd ? ' in-range' : ''}`}
                      onClick={() => handleDayClick(day)}>
                      <span className="cal-day-num">{day}</span>
                      {dayPosts.length > 0 && (
                        <div className="cal-dots">
                          {dayPosts.slice(0, 4).map((p, idx) => (
                            <span key={idx} className="cal-dot" style={{ background: showColors[p.show] || '#b44eff' }} />
                          ))}
                          {dayPosts.length > 4 && <span className="cal-dot-more">+{dayPosts.length - 4}</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            {rangeStart && (
              <div style={{ marginTop:10, textAlign:'center' }}>
                <button onClick={clearRange} style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--text3)',
                  background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--radius)',
                  padding:'3px 10px', cursor:'pointer' }}>✕ Clear selection</button>
              </div>
            )}
          </div>
        </div>

        {/* Results panel */}
        <div className="cal-results">
          <div className="win95-window">
            <div className="win95-titlebar" style={{ background:'linear-gradient(90deg, #002a00, #005500)' }}>
              <span className="win95-title">📊 FILTER RESULTS</span>
              {rangeStart && (
                <button className="win95-ctrl" onClick={clearRange} style={{ marginLeft:'auto' }}>CLEAR</button>
              )}
            </div>
            <div className="cal-results-body">
              <div className="cal-range-label">{formatRange(rangeStart, rangeEnd)}</div>
              {rangeStart && (
                <>
                  {/* Type counts with hover breakdown */}
                  <div className="cal-summary">
                    <div className="cal-summary-item">
                      <span className="cal-summary-val" style={{ color:'#b44eff' }}>{filteredPosts.length}</span>
                      <span className="cal-summary-label">Total</span>
                    </div>
                    {MEDIA_TYPES.map(t => (
                      <TypeCount key={t} label={t} count={typeCounts[t] || 0}
                        color={TYPE_COLORS[t] || '#b44eff'} posts={filteredPosts} />
                    ))}
                  </div>

                  {/* Metric totals with hover full number */}
                  {(metricTotals.views > 0 || metricTotals.engagement > 0 || metricTotals.impressions > 0) && (
                    <div style={{ display:'flex', gap:20, padding:'8px 0 4px', borderTop:'1px solid var(--border)', marginTop:4, flexWrap:'wrap' }}>
                      <MetricTotal label="Total Views"    value={metricTotals.views}       color="#00e5ff" />
                      <MetricTotal label="Engagement"     value={metricTotals.engagement}  color="#ff2d78" />
                      <MetricTotal label="Impressions"    value={metricTotals.impressions} color="#b44eff" />
                    </div>
                  )}

                  {/* Sort bar */}
                  <div style={{ display:'flex', gap:5, alignItems:'center', padding:'8px 0 4px', borderTop:'1px solid var(--border)', marginTop:4, flexWrap:'wrap' }}>
                    <span style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--text3)', marginRight:4 }}>SORT</span>
                    {SORT_OPTIONS.map(s => (
                      <button key={s.id} className={`metric-btn${sortBy === s.id ? ' active' : ''}`}
                        style={sortBy === s.id ? { color:'var(--cyan)', borderColor:'rgba(0,229,255,0.4)' } : {}}
                        onClick={() => setSortBy(s.id)}>{s.label}</button>
                    ))}
                  </div>

                  {filteredPosts.length === 0 ? (
                    <div className="cal-empty">No posts in this range</div>
                  ) : (
                    <div className="cal-post-list">
                      {filteredPosts.map(post => (
                        <div key={post.id} className="cal-post-row">
                          <div className="cal-post-dot" style={{ background: showColors[post.show] || '#b44eff' }} />
                          <div className="cal-post-info">
                            <div className="cal-post-title">{post.title}</div>
                            <div className="cal-post-meta">
                              <span>{post.show} · {post.platform} · {post.date}</span>
                              {Number(post.stats?.views) > 0 && <span style={{ color:'#00e5ff' }}>👁 {fmt(Number(post.stats.views))}</span>}
                              {Number(post.stats?.engagement) > 0 && <span style={{ color:'#ff2d78' }}>💬 {fmt(Number(post.stats.engagement))}</span>}
                              {Number(post.stats?.impressions) > 0 && <span style={{ color:'#b44eff' }}>📢 {fmt(Number(post.stats.impressions))}</span>}
                              {!Number(post.stats?.views) && !Number(post.stats?.impressions) && !Number(post.stats?.engagement) && (
                                <span style={{ color:'rgba(74,65,104,0.6)', fontSize:8, fontStyle:'italic' }}>no stats · sync from Sprout</span>
                              )}
                            </div>
                          </div>
                          {post.mediaType && (
                            <span className="cal-post-type" style={{ color: TYPE_COLORS[post.mediaType] || 'var(--text3)',
                              borderColor: (TYPE_COLORS[post.mediaType] || '#b44eff') + '44',
                              background: (TYPE_COLORS[post.mediaType] || '#b44eff') + '11' }}>
                              {post.mediaType}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
