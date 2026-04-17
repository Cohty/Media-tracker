import { useState, useMemo } from 'react'
import { SHOWS, PLATFORMS, MEDIA_TYPES } from '../constants'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function dateKey(ts) {
  return new Date(ts).toISOString().split('T')[0]
}

function formatRange(start, end) {
  if (!start) return 'Click a day to filter by date'
  const s = new Date(start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (!end || end === start) return s
  const e = new Date(end + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${s} — ${e}`
}

export default function CalendarView({ posts }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [rangeStart, setRangeStart] = useState(null)
  const [rangeEnd, setRangeEnd] = useState(null)

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
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(k); setRangeEnd(null)
    } else {
      if (k >= rangeStart) setRangeEnd(k)
      else { setRangeEnd(rangeStart); setRangeStart(k) }
    }
  }

  function clearRange() { setRangeStart(null); setRangeEnd(null) }

  const filteredPosts = useMemo(() => {
    if (!rangeStart) return []
    const end = rangeEnd || rangeStart
    return posts.filter(p => {
      const k = dateKey(p.ts)
      return k >= rangeStart && k <= end
    }).sort((a, b) => b.ts - a.ts)
  }, [posts, rangeStart, rangeEnd])

  const typeCounts = useMemo(() => {
    const counts = {}
    filteredPosts.forEach(p => { counts[p.mediaType || 'Unknown'] = (counts[p.mediaType || 'Unknown'] || 0) + 1 })
    return counts
  }, [filteredPosts])

  const todayKey = dateKey(Date.now())

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const showColors = Object.fromEntries(SHOWS.map(s => [s.name, s.hex]))

  return (
    <div className="cal-wrapper">
      <div className="cal-layout">
        <div className="cal-panel win95-window">
          <div className="win95-titlebar">
            <span className="win95-title">📅 CALENDAR.EXE</span>
            <div className="win95-controls">
              <button className="win95-ctrl">_</button>
              <button className="win95-ctrl">□</button>
              <button className="win95-ctrl">×</button>
            </div>
          </div>
          <div className="cal-body">
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
                    <div
                      key={k}
                      className={`cal-day${dayPosts.length > 0 ? ' has-posts' : ''}${isToday ? ' today' : ''}${isStart || isEnd ? ' selected' : ''}${inRange && !isStart && !isEnd ? ' in-range' : ''}`}
                      onClick={() => handleDayClick(day)}
                    >
                      <span className="cal-day-num">{day}</span>
                      {dayPosts.length > 0 && (
                        <div className="cal-dots">
                          {dayPosts.slice(0, 3).map((p, idx) => (
                            <span key={idx} className="cal-dot" style={{ background: showColors[p.show] || '#b44eff' }} />
                          ))}
                          {dayPosts.length > 3 && <span className="cal-dot-more">+{dayPosts.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="cal-results">
          <div className="win95-window">
            <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #002a00, #005500)' }}>
              <span className="win95-title">📊 FILTER RESULTS</span>
              {rangeStart && (
                <button className="win95-ctrl" onClick={clearRange} style={{ marginLeft: 'auto' }}>CLEAR</button>
              )}
            </div>
            <div className="cal-results-body">
              <div className="cal-range-label">{formatRange(rangeStart, rangeEnd)}</div>
              {rangeStart && (
                <>
                  <div className="cal-summary">
                    <div className="cal-summary-item">
                      <span className="cal-summary-val" style={{ color: '#b44eff' }}>{filteredPosts.length}</span>
                      <span className="cal-summary-label">Total</span>
                    </div>
                    {MEDIA_TYPES.map(t => (
                      <div key={t} className="cal-summary-item">
                        <span className="cal-summary-val" style={{ color: t === 'Clip' ? '#00e5ff' : t === 'Full Episode' ? '#39ff8c' : '#f0a020' }}>
                          {typeCounts[t] || 0}
                        </span>
                        <span className="cal-summary-label">{t}s</span>
                      </div>
                    ))}
                  </div>
                  {/* Metric totals for selected range */}
                  {(() => {
                    let views = 0, engagement = 0, impressions = 0
                    filteredPosts.forEach(p => {
                      views       += Number(p.stats?.views)       || 0
                      engagement  += Number(p.stats?.engagement)  || 0
                      impressions += Number(p.stats?.impressions) || 0
                    })
                    const fmt = n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}k` : n > 0 ? String(n) : '—'
                    return (views > 0 || engagement > 0 || impressions > 0) ? (
                      <div style={{ display:'flex', gap:16, padding:'8px 0 4px', borderTop:'1px solid var(--border)', marginTop:4, flexWrap:'wrap' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px' }}>Total Views</span>
                          <span style={{ fontFamily:'VT323', fontSize:22, color:'#00e5ff', textShadow:'0 0 8px #00e5ff', lineHeight:1 }}>{fmt(views)}</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px' }}>Engagement</span>
                          <span style={{ fontFamily:'VT323', fontSize:22, color:'#ff2d78', textShadow:'0 0 8px #ff2d78', lineHeight:1 }}>{fmt(engagement)}</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px' }}>Impressions</span>
                          <span style={{ fontFamily:'VT323', fontSize:22, color:'#b44eff', textShadow:'0 0 8px #b44eff', lineHeight:1 }}>{fmt(impressions)}</span>
                        </div>
                      </div>
                    ) : null
                  })()}
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
                              {post.stats?.views && Number(post.stats.views) > 0 && (
                                <span style={{ color:'#00e5ff' }}>
                                  👁 {Number(post.stats.views)>=1000?`${(Number(post.stats.views)/1000).toFixed(1)}k`:post.stats.views}
                                </span>
                              )}
                              {post.stats?.engagement && Number(post.stats.engagement) > 0 && (
                                <span style={{ color:'#ff2d78' }}>
                                  💬 {Number(post.stats.engagement)>=1000?`${(Number(post.stats.engagement)/1000).toFixed(1)}k`:post.stats.engagement}
                                </span>
                              )}
                              {post.stats?.impressions && Number(post.stats.impressions) > 0 && (
                                <span style={{ color:'#b44eff' }}>
                                  📢 {Number(post.stats.impressions)>=1000?`${(Number(post.stats.impressions)/1000).toFixed(1)}k`:post.stats.impressions}
                                </span>
                              )}
                              {(!post.stats?.views || Number(post.stats.views) === 0) &&
                               (!post.stats?.impressions || Number(post.stats.impressions) === 0) &&
                               (!post.stats?.engagement || Number(post.stats.engagement) === 0) && (
                                <span style={{ color:'rgba(74,65,104,0.6)', fontSize:8, fontStyle:'italic' }}>
                                  no stats · sync from Sprout
                                </span>
                              )}
                            </div>
                          </div>
                          {post.mediaType && (
                            <span className="cal-post-type">{post.mediaType}</span>
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
