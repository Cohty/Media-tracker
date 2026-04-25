import { useState, useMemo, useEffect, useRef } from 'react'

// Parse post.date "MM/DD/YYYY" → "YYYY-MM-DD" key (local timezone, stable for grouping)
export function postDayKey(post) {
  if (!post) return null
  if (post.ts) {
    const d = new Date(post.ts)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }
  if (post.date) {
    const [m, d, y] = post.date.split('/')
    if (m && d && y) return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }
  return null
}

export function dateToKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m-1, d)
}

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const DAY_LABELS = ['S','M','T','W','T','F','S']

export default function AnalyticsCalendar({
  posts,
  selectedRange,         // { start, end } key strings, or null
  onChangeRange,         // (range) => void
  hoveredKey,            // external hover (from chart)
  onHoverDay,            // (key) => void
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [dragAnchor, setDragAnchor] = useState(null)
  const [dragEnd, setDragEnd] = useState(null)
  const gridRef = useRef(null)

  // Post density per day + top post per day
  const dayData = useMemo(() => {
    const map = {}
    for (const p of posts) {
      const key = postDayKey(p)
      if (!key) continue
      if (!map[key]) map[key] = { count: 0, posts: [] }
      map[key].count++
      map[key].posts.push(p)
    }
    return map
  }, [posts])

  const maxCount = useMemo(() => {
    let max = 0
    for (const k in dayData) if (dayData[k].count > max) max = dayData[k].count
    return max || 1
  }, [dayData])

  // Build 6x7 grid for current view month
  const cells = useMemo(() => {
    const first = new Date(viewMonth.year, viewMonth.month, 1)
    const startDay = first.getDay() // 0 = Sun
    const daysInMonth = new Date(viewMonth.year, viewMonth.month+1, 0).getDate()
    const prevMonthDays = new Date(viewMonth.year, viewMonth.month, 0).getDate()
    const out = []
    // Leading days (previous month)
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i
      const d = new Date(viewMonth.year, viewMonth.month - 1, day)
      out.push({ date: d, key: dateToKey(d), outside: true })
    }
    // Current month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewMonth.year, viewMonth.month, day)
      out.push({ date: d, key: dateToKey(d), outside: false })
    }
    // Trailing to fill 6 weeks (42 cells)
    while (out.length < 42) {
      const last = out[out.length-1].date
      const d = new Date(last.getFullYear(), last.getMonth(), last.getDate()+1)
      out.push({ date: d, key: dateToKey(d), outside: true })
    }
    return out
  }, [viewMonth])

  const todayKey = dateToKey(new Date())

  // Compute active range: drag takes precedence, otherwise selectedRange
  const activeRange = useMemo(() => {
    if (dragAnchor) {
      const a = dragEnd || dragAnchor
      const [start, end] = [dragAnchor, a].sort()
      return { start, end }
    }
    return selectedRange
  }, [dragAnchor, dragEnd, selectedRange])

  function isInRange(key) {
    if (!activeRange) return false
    return key >= activeRange.start && key <= activeRange.end
  }
  function isRangeStart(key) { return activeRange && key === activeRange.start }
  function isRangeEnd(key) { return activeRange && key === activeRange.end }

  function handleMouseDown(key) {
    setDragAnchor(key)
    setDragEnd(key)
  }
  function handleMouseEnter(key) {
    onHoverDay?.(key)
    if (dragAnchor) setDragEnd(key)
  }
  function handleMouseUp(key) {
    if (!dragAnchor) return
    const [start, end] = [dragAnchor, key].sort()
    onChangeRange?.({ start, end })
    setDragAnchor(null)
    setDragEnd(null)
  }

  // Cancel drag if mouse leaves grid & releases
  useEffect(() => {
    function onUp() {
      if (dragAnchor && dragEnd) {
        const [start, end] = [dragAnchor, dragEnd].sort()
        onChangeRange?.({ start, end })
      }
      setDragAnchor(null)
      setDragEnd(null)
    }
    if (dragAnchor) {
      window.addEventListener('mouseup', onUp)
      return () => window.removeEventListener('mouseup', onUp)
    }
  }, [dragAnchor, dragEnd, onChangeRange])

  function nav(delta) {
    setViewMonth(v => {
      const m = v.month + delta
      if (m < 0) return { year: v.year-1, month: 11 }
      if (m > 11) return { year: v.year+1, month: 0 }
      return { year: v.year, month: m }
    })
  }

  function jumpToToday() {
    const d = new Date()
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() })
  }

  function clearRange() {
    onChangeRange?.(null)
  }

  // Quick-range helpers
  function applyPreset(days) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days + 1)
    onChangeRange?.({ start: dateToKey(start), end: dateToKey(end) })
    setViewMonth({ year: end.getFullYear(), month: end.getMonth() })
  }

  const rangeSummary = useMemo(() => {
    if (!selectedRange) return 'All time'
    const s = keyToDate(selectedRange.start)
    const e = keyToDate(selectedRange.end)
    const fmt = d => `${MONTH_NAMES[d.getMonth()].slice(0,3).toLowerCase().replace(/^./, c=>c.toUpperCase())} ${d.getDate()}`
    if (selectedRange.start === selectedRange.end) return fmt(s)
    const sameYear = s.getFullYear() === e.getFullYear()
    const currentYear = new Date().getFullYear()
    if (sameYear && s.getFullYear() === currentYear) return `${fmt(s)} → ${fmt(e)}`
    return `${fmt(s)}, ${s.getFullYear()} → ${fmt(e)}, ${e.getFullYear()}`
  }, [selectedRange])

  const postsInRange = useMemo(() => {
    if (!selectedRange) return posts.length
    return posts.filter(p => {
      const k = postDayKey(p)
      return k && k >= selectedRange.start && k <= selectedRange.end
    }).length
  }, [posts, selectedRange])

  return (
    <div className="win95-window analytics-calendar">
      <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #2a0040, #4a0090)' }}>
        <span className="win95-title">◫ DATE RANGE — {rangeSummary}</span>
      </div>

      <div style={{ padding: '10px 12px 12px' }}>
        {/* Month nav */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <button className="cal-nav-btn" onClick={() => nav(-1)} aria-label="Previous month">‹</button>
          <div style={{
            fontFamily: 'DM Mono', fontSize: 11, color: 'var(--text)',
            letterSpacing: '1.2px', fontWeight: 600,
          }}>
            {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
          </div>
          <button className="cal-nav-btn" onClick={() => nav(1)} aria-label="Next month">›</button>
        </div>

        {/* Day labels */}
        <div className="cal-day-labels">
          {DAY_LABELS.map((l, i) => <div key={i}>{l}</div>)}
        </div>

        {/* Grid */}
        <div className="cal-grid" ref={gridRef} onMouseLeave={() => onHoverDay?.(null)}>
          {cells.map(cell => {
            const dat = dayData[cell.key]
            const count = dat?.count || 0
            const density = count / maxCount
            const inRange = isInRange(cell.key)
            const isStart = isRangeStart(cell.key)
            const isEnd = isRangeEnd(cell.key)
            const isToday = cell.key === todayKey
            const isHovered = hoveredKey === cell.key
            return (
              <div
                key={cell.key}
                className={`cal-cell${cell.outside ? ' cal-cell--outside' : ''}${inRange ? ' cal-cell--in-range' : ''}${isStart ? ' cal-cell--start' : ''}${isEnd ? ' cal-cell--end' : ''}${isToday ? ' cal-cell--today' : ''}${isHovered ? ' cal-cell--hovered' : ''}${count > 0 ? ' cal-cell--has-posts' : ''}`}
                onMouseDown={() => handleMouseDown(cell.key)}
                onMouseEnter={() => handleMouseEnter(cell.key)}
                onMouseUp={() => handleMouseUp(cell.key)}
                title={count > 0 ? `${cell.date.toLocaleDateString()} — ${count} post${count===1?'':'s'}` : cell.date.toLocaleDateString()}
              >
                <div className="cal-cell-day">{cell.date.getDate()}</div>
                {count > 0 && (
                  <div className="cal-cell-density" style={{
                    opacity: 0.25 + density * 0.75,
                  }} />
                )}
                {count > 0 && (
                  <div className="cal-cell-count">{count}</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Presets + clear */}
        <div style={{
          display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap',
          borderTop: '1px solid var(--border)', paddingTop: 10,
        }}>
          <button className="cal-preset-btn" onClick={() => applyPreset(7)}>7d</button>
          <button className="cal-preset-btn" onClick={() => applyPreset(30)}>30d</button>
          <button className="cal-preset-btn" onClick={() => applyPreset(90)}>90d</button>
          <button className="cal-preset-btn" onClick={jumpToToday}>Today</button>
          {selectedRange && (
            <button className="cal-preset-btn cal-preset-btn--clear" onClick={clearRange}>✕ Clear</button>
          )}
          <span style={{
            marginLeft: 'auto', fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)',
            alignSelf: 'center',
          }}>
            {postsInRange} post{postsInRange === 1 ? '' : 's'}
          </span>
        </div>

        {/* Hint */}
        <div style={{
          marginTop: 6, fontFamily: 'DM Mono', fontSize: 8,
          color: 'var(--text3)', letterSpacing: '0.4px',
        }}>
          Click a day to filter · drag across days for a range
        </div>
      </div>
    </div>
  )
}
