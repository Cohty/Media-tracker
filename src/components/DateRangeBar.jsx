import { useState, useMemo } from 'react'

const PRESETS = [
  { id: 'today',  label: 'Today' },
  { id: 'week',   label: 'This Week' },
  { id: '14d',    label: 'Last 14 Days' },
  { id: '30d',    label: 'Last 30 Days' },
  { id: 'all',    label: 'All Time' },
  { id: 'custom', label: 'Custom' },
]

function startOfWeek() {
  const d = new Date(); d.setHours(0,0,0,0)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d
}

function daysAgo(n) {
  const d = new Date(); d.setHours(0,0,0,0)
  d.setDate(d.getDate() - n)
  return d
}

function toInput(d) {
  return d.toISOString().slice(0,10)
}

function fmtDisplay(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function useDateRange() {
  const [preset, setPreset] = useState('week')
  const [customStart, setCustomStart] = useState(toInput(daysAgo(30)))
  const [customEnd, setCustomEnd] = useState(toInput(new Date()))

  const range = useMemo(() => {
    const now = new Date(); now.setHours(23,59,59,999)
    if (preset === 'today') {
      const s = new Date(); s.setHours(0,0,0,0)
      return { start: s, end: now, label: 'Today' }
    }
    if (preset === 'all') return { start: new Date(0), end: now, label: 'All Time' }
    if (preset === 'week') {
      const s = startOfWeek()
      return { start: s, end: now, label: `Week of ${fmtDisplay(s)}` }
    }
    if (preset === '14d') {
      const s = daysAgo(14)
      return { start: s, end: now, label: `Last 14 Days` }
    }
    if (preset === '30d') {
      const s = daysAgo(30)
      return { start: s, end: now, label: `Last 30 Days` }
    }
    if (preset === 'custom') {
      const s = new Date(customStart + 'T00:00:00')
      const e = new Date(customEnd + 'T23:59:59')
      return { start: s, end: e, label: `${fmtDisplay(s)} – ${fmtDisplay(e)}` }
    }
    return { start: new Date(0), end: now, label: 'All Time' }
  }, [preset, customStart, customEnd])

  return { preset, setPreset, customStart, setCustomStart, customEnd, setCustomEnd, range }
}

export default function DateRangeBar({ preset, setPreset, customStart, setCustomStart, customEnd, setCustomEnd, range, postCount }) {
  return (
    <div className="date-range-bar">
      <div className="date-range-inner">
        <div className="date-range-presets">
          {PRESETS.map(p => (
            <button key={p.id}
              className={`metric-btn${preset === p.id ? ' active' : ''}`}
              style={preset === p.id ? { color:'var(--cyan)', borderColor:'rgba(0,229,255,0.4)' } : {}}
              onClick={() => setPreset(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input type="date" className="date-input" value={customStart}
              onChange={e => setCustomStart(e.target.value)} />
            <span style={{ color:'var(--text3)', fontFamily:'DM Mono', fontSize:10 }}>→</span>
            <input type="date" className="date-input" value={customEnd}
              onChange={e => setCustomEnd(e.target.value)} />
          </div>
        )}
        <div style={{ marginLeft:'auto', fontFamily:'DM Mono', fontSize:9, color:'var(--text3)' }}>
          {range.label} · <span style={{ color:'var(--cyan)' }}>{postCount} posts</span>
        </div>
      </div>
    </div>
  )
}
