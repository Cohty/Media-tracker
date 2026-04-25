import { useState, useMemo, useEffect } from 'react'
import { SHOWS, UNASSIGNED } from '../constants'

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
const SHOW_COLOR = Object.fromEntries(SHOWS.map(s => [s.name, s.hex]))
SHOW_COLOR[UNASSIGNED.name] = UNASSIGNED.hex

const MAX_DOTS_PER_CELL = 6

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

  // pendingStart: when user has clicked once and we're awaiting the second click.
  // null when no pending state.
  const [pendingStart, setPendingStart] = useState(null)
  const [previewEnd, setPreviewEnd] = useState(null)

  // Per-day data: count, top shows by count
  const dayData = useMemo(() => {
    const map = {}
    for (const p of posts) {
      const key = postDayKey(p)
      if (!key) continue
      if (!map[key]) map[key] = { count: 0, posts: [], byShow: {} }
      map[key].count++
      map[key].posts.push(p)
      const show = p.show || UNASSIGNED.name
      map[key].byShow[show] = (map[key].byShow[show] || 0) + 1
    }
    // Sort show buckets descending so dots reflect distribution accurately
    for (const k in map) {
      map[k].showOrder = Object.entries(map[k].byShow)
        .sort((a, b) => b[1] - a[1])
        .map(([show, c]) => ({ show, count: c }))
    }
    return map
  }, [posts])

  const maxCount = useMemo(() => {
    let max = 0
    for (const k in dayData) if (dayData[k].count > max) max = dayData[k].count
    return max || 1
  }, [dayData])

  const cells = useMemo(() => {
    const first = new Date(viewMonth.year, viewMonth.month, 1)
    const startDay = first.getDay()
    const daysInMonth = new Date(viewMonth.year, viewMonth.month+1, 0).getDate()
    const prevMonthDays = new Date(viewMonth.year, viewMonth.month, 0).getDate()
    const out = []
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i
      const d = new Date(viewMonth.year, viewMonth.month - 1, day)
      out.push({ date: d, key: dateToKey(d), outside: true })
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewMonth.year, viewMonth.month, day)
      out.push({ date: d, key: dateToKey(d), outside: false })
    }
    while (out.length < 42) {
      const last = out[out.length-1].date
      const d = new Date(last.getFullYear(), last.getMonth(), last.getDate()+1)
      out.push({ date: d, key: dateToKey(d), outside: true })
    }
    return out
  }, [viewMonth])

  const todayKey = dateToKey(new Date())

  // Active range visualization: pending preview takes precedence over selectedRange
  const activeRange = useMemo(() => {
    if (pendingStart) {
      const other = previewEnd || pendingStart
      const [start, end] = [pendingStart, other].sort()
      return { start, end, isPending: true }
    }
    return selectedRange ? { ...selectedRange, isPending: false } : null
  }, [pendingStart, previewEnd, selectedRange])

  function isInRange(key) {
    if (!activeRange) return false
    return key >= activeRange.start && key <= activeRange.end
  }
  function isRangeStart(key) { return activeRange && key === activeRange.start }
  function isRangeEnd(key) { return activeRange && key === activeRange.end }

  function handleClick(key) {
    if (!pendingStart) {
      // First click → mark as pending start, immediately filter to single day
      setPendingStart(key)
      setPreviewEnd(key)
      onChangeRange?.({ start: key, end: key })
    } else {
      // Second click → complete the range
      const [start, end] = [pendingStart, key].sort()
      onChangeRange?.({ start, end })
      setPendingStart(null)
      setPreviewEnd(null)
    }
  }

  function handleMouseEnter(key) {
    onHoverDay?.(key)
    if (pendingStart) setPreviewEnd(key)
  }

  function handleMouseLeave() {
    onHoverDay?.(null)
    if (pendingStart) setPreviewEnd(pendingStart)
  }

  // ESC to cancel pending selection
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && pendingStart) {
        setPendingStart(null)
        setPreviewEnd(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingStart])

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
    setPendingStart(null)
    setPreviewEnd(null)
  }

  function applyPreset(days) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days + 1)
    onChangeRange?.({ start: dateToKey(start), end: dateToKey(end) })
    setViewMonth({ year: end.getFullYear(), month: end.getMonth() })
    setPendingStart(null)
    setPreviewEnd(null)
  }

  const rangeSummary = useMemo(() => {
    if (pendingStart && !previewEnd) {
      const d = keyToDate(pendingStart)
      return `Pick end date · started ${MONTH_NAMES[d.getMonth()].slice(0,3).toLowerCase().replace(/^./,c=>c.toUpperCase())} ${d.getDate()}`
    }
    if (!selectedRange) return 'All time'
    const s = keyToDate(selectedRange.start)
    const e = keyToDate(selectedRange.end)
    const fmt = d => `${MONTH_NAMES[d.getMonth()].slice(0,3).toLowerCase().replace(/^./, c=>c.toUpperCase())} ${d.getDate()}`
    if (selectedRange.start === selectedRange.end) return fmt(s)
    const sameYear = s.getFullYear() === e.getFullYear()
    const currentYear = new Date().getFullYear()
    if (sameYear && s.getFullYear() === currentYear) return `${fmt(s)} → ${fmt(e)}`
    return `${fmt(s)}, ${s.getFullYear()} → ${fmt(e)}, ${e.getFullYear()}`
  }, [selectedRange, pendingStart, previewEnd])

  const postsInRange = useMemo(() => {
    if (!selectedRange) return posts.length
    return posts.filter(p => {
      const k = postDayKey(p)
      return k && k >= selectedRange.start && k <= selectedRange.end
    }).length
  }, [posts, selectedRange])

  const hintText = pendingStart
    ? '↳ Click another day to set the end (Esc to cancel)'
    : 'Click a day to filter · click a second day to set a range'

  return (
    <div className="win95-window analytics-calendar">
      <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #2a0040, #4a0090)' }}>
        <span className="win95-title">◫ DATE RANGE — {rangeSummary}</span>
      </div>

      <div className="cal-body">
        <div className="cal-month-nav">
          <button className="cal-nav-btn" onClick={() => nav(-1)} aria-label="Previous month">‹</button>
          <div className="cal-month-label">
            {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
          </div>
          <button className="cal-nav-btn" onClick={() => nav(1)} aria-label="Next month">›</button>
        </div>

        <div className="cal-day-labels">
          {DAY_LABELS.map((l, i) => <div key={i}>{l}</div>)}
        </div>

        <div className="cal-grid" onMouseLeave={handleMouseLeave}>
          {cells.map(cell => {
            const dat = dayData[cell.key]
            const count = dat?.count || 0
            const density = count / maxCount
            const inRange = isInRange(cell.key)
            const isStart = isRangeStart(cell.key)
            const isEnd = isRangeEnd(cell.key)
            const isToday = cell.key === todayKey
            const isHovered = hoveredKey === cell.key
            const isPendingStart = pendingStart === cell.key

            // Build dot list — one per post up to MAX_DOTS_PER_CELL, in show-color order
            const dots = []
            if (dat?.showOrder) {
              for (const { show, count: c } of dat.showOrder) {
                for (let i = 0; i < c; i++) {
                  if (dots.length >= MAX_DOTS_PER_CELL) break
                  dots.push(SHOW_COLOR[show] || UNASSIGNED.hex)
                }
                if (dots.length >= MAX_DOTS_PER_CELL) break
              }
            }
            const overflow = count > MAX_DOTS_PER_CELL ? count - MAX_DOTS_PER_CELL : 0

            const cls = [
              'cal-cell',
              cell.outside && 'cal-cell--outside',
              inRange && 'cal-cell--in-range',
              isStart && 'cal-cell--start',
              isEnd && 'cal-cell--end',
              isToday && 'cal-cell--today',
              isHovered && 'cal-cell--hovered',
              isPendingStart && 'cal-cell--pending',
              count > 0 && 'cal-cell--has-posts',
            ].filter(Boolean).join(' ')

            const titleSummary = count === 0
              ? cell.date.toLocaleDateString()
              : `${cell.date.toLocaleDateString()}\n${dat.showOrder.map(s => `${s.show}: ${s.count}`).join('\n')}`

            return (
              <div
                key={cell.key}
                className={cls}
                onClick={() => handleClick(cell.key)}
                onMouseEnter={() => handleMouseEnter(cell.key)}
                title={titleSummary}
              >
                {/* Density tint */}
                {count > 0 && (
                  <div className="cal-cell-tint" style={{
                    opacity: 0.18 + density * 0.45,
                  }} />
                )}

                {/* Top row: day number + count */}
                <div className="cal-cell-header">
                  <span className="cal-cell-day">{cell.date.getDate()}</span>
                  {count > 0 && (
                    <span className="cal-cell-count">{count}</span>
                  )}
                </div>

                {/* Dot strip */}
                {dots.length > 0 && (
                  <div className="cal-cell-dots">
                    {dots.map((color, i) => (
                      <span key={i} className="cal-dot" style={{
                        background: color,
                        boxShadow: `0 0 4px ${color}aa`,
                      }} />
                    ))}
                    {overflow > 0 && (
                      <span className="cal-dot-overflow">+{overflow}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Presets + footer */}
        <div className="cal-footer">
          <div className="cal-presets">
            <button className="cal-preset-btn" onClick={() => applyPreset(7)}>7d</button>
            <button className="cal-preset-btn" onClick={() => applyPreset(30)}>30d</button>
            <button className="cal-preset-btn" onClick={() => applyPreset(90)}>90d</button>
            <button className="cal-preset-btn" onClick={jumpToToday}>Today</button>
            {(selectedRange || pendingStart) && (
              <button className="cal-preset-btn cal-preset-btn--clear" onClick={clearRange}>✕ Clear</button>
            )}
            <span className="cal-post-count">
              {postsInRange} post{postsInRange === 1 ? '' : 's'}
            </span>
          </div>
          <div className="cal-hint">{hintText}</div>
        </div>
      </div>
    </div>
  )
}
