import { useRef, useMemo } from 'react'
import { postDayKey, dateToKey } from './AnalyticsCalendar'

const METRICS = [
  { id: 'views',       label: 'Views',       color: '#00e5ff' },
  { id: 'engagement',  label: 'Engagement',  color: '#ff2d78' },
  { id: 'impressions', label: 'Impressions', color: '#b44eff' },
]

function fmt(n) {
  const v = Number(n)
  if (!v || isNaN(v)) return '0'
  if (v >= 1000000) return `${(v/1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v/1000).toFixed(1)}k`
  return String(v)
}

function fmtDate(key) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m-1, d)
  return `${date.toLocaleString('en-US', { month: 'short' })} ${d}, ${y}`
}

// Monotone-ish smoothing: each segment gets cubic Bezier control points
// that follow the tangent direction without overshooting. Keeps curves clean.
function smoothPath(points) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M${points[0].x},${points[0].y}`
  let d = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i+1]
    const dx = p1.x - p0.x
    const cp1x = p0.x + dx * 0.5
    const cp1y = p0.y
    const cp2x = p1.x - dx * 0.5
    const cp2y = p1.y
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`
  }
  return d
}

export default function AnalyticsAreaChart({
  posts,
  activeMetrics,
  selectedRange,
  hoveredKey,
  onHoverDay,
}) {
  const svgRef = useRef(null)

  // Aggregate daily totals for all posts, then build a continuous date series
  const series = useMemo(() => {
    if (posts.length === 0) return []

    const byDay = {}
    for (const p of posts) {
      const key = postDayKey(p)
      if (!key) continue
      if (!byDay[key]) byDay[key] = { views: 0, engagement: 0, impressions: 0, posts: [] }
      const isX = p.platform === 'X' || p.platform === 'Twitter' ||
        (p.url||'').includes('twitter.com') || (p.url||'').includes('x.com')
      byDay[key].views += Math.max(isX ? Number(p.videoViews)||0 : 0, Number(p.stats?.views)||0)
      byDay[key].engagement += Number(p.stats?.engagement) || 0
      byDay[key].impressions += Math.max(isX ? Number(p.xImpressions)||0 : 0, Number(p.stats?.impressions)||0)
      byDay[key].posts.push(p)
    }

    // Date span: selectedRange if present, else min/max of data
    let startKey, endKey
    if (selectedRange) {
      startKey = selectedRange.start
      endKey = selectedRange.end
    } else {
      const keys = Object.keys(byDay).sort()
      if (keys.length === 0) return []
      startKey = keys[0]
      endKey = keys[keys.length-1]
    }

    // Fill every day in range (0s for missing)
    const out = []
    const [sy, sm, sd] = startKey.split('-').map(Number)
    const [ey, em, ed] = endKey.split('-').map(Number)
    const cursor = new Date(sy, sm-1, sd)
    const endDate = new Date(ey, em-1, ed)
    while (cursor <= endDate) {
      const k = dateToKey(cursor)
      const entry = byDay[k] || { views: 0, engagement: 0, impressions: 0, posts: [] }
      out.push({ key: k, ...entry })
      cursor.setDate(cursor.getDate()+1)
    }
    return out
  }, [posts, selectedRange])

  // Chart geometry
  const w = 720, h = 300
  const padL = 48, padR = 14, padT = 18, padB = 38
  const cw = w - padL - padR, ch = h - padT - padB

  const hasData = series.length > 0
  const activeCols = METRICS.filter(m => activeMetrics.includes(m.id))

  const maxVal = useMemo(() => {
    if (!hasData) return 1
    let max = 1
    for (const d of series) {
      for (const m of activeCols) {
        if (d[m.id] > max) max = d[m.id]
      }
    }
    return max
  }, [series, activeCols, hasData])

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    val: Math.round(maxVal * t),
    y: padT + ch * (1 - t),
  }))

  // Compute x for a given index
  function xFor(i) {
    if (series.length <= 1) return padL + cw / 2
    return padL + (cw * i) / (series.length - 1)
  }
  function yFor(val) {
    return padT + ch * (1 - val / maxVal)
  }

  // X-axis date ticks: show a handful evenly distributed
  const xTicks = useMemo(() => {
    if (series.length === 0) return []
    const count = Math.min(6, series.length)
    const out = []
    for (let i = 0; i < count; i++) {
      const idx = Math.round((series.length - 1) * i / (count - 1 || 1))
      out.push({ idx, key: series[idx].key })
    }
    return out
  }, [series])

  // Find the index of the hovered key if external hover
  const hoveredIdx = useMemo(() => {
    if (hoveredKey == null || series.length === 0) return null
    const i = series.findIndex(d => d.key === hoveredKey)
    return i === -1 ? null : i
  }, [hoveredKey, series])

  // Use external hover if present, else internal cursor
  function idxFromPixel(px) {
    if (series.length === 0) return null
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return null
    const svgX = (px - rect.left) / rect.width * w
    if (svgX < padL || svgX > padL + cw) return null
    const ratio = (svgX - padL) / cw
    return Math.max(0, Math.min(series.length - 1, Math.round(ratio * (series.length - 1))))
  }

  function handleMove(e) {
    const idx = idxFromPixel(e.clientX)
    if (idx == null) return
    onHoverDay?.(series[idx].key)
  }
  function handleLeave() {
    onHoverDay?.(null)
  }

  const activeIdx = hoveredIdx

  // Tooltip position: center on the bar group, use svg-rect-based pixel conversion
  function svgXToPixel(svgX) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return (svgX / w) * rect.width
  }

  const tooltipPx = activeIdx != null ? svgXToPixel(xFor(activeIdx)) : null
  const hoveredData = activeIdx != null ? series[activeIdx] : null

  // Build area and line paths per metric
  const paths = useMemo(() => {
    if (!hasData) return []
    const baselineY = padT + ch
    return activeCols.map(m => {
      const pts = series.map((d, i) => ({
        x: xFor(i),
        y: yFor(d[m.id]),
      }))
      const line = smoothPath(pts)
      const area = pts.length > 0
        ? `${line} L${pts[pts.length-1].x.toFixed(2)},${baselineY.toFixed(2)} L${pts[0].x.toFixed(2)},${baselineY.toFixed(2)} Z`
        : ''
      return { metric: m, line, area, pts }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, activeCols, maxVal, hasData])

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Tooltip (pill) */}
      {hoveredData && tooltipPx != null && (
        <div style={{
          position: 'absolute', zIndex: 10, pointerEvents: 'none',
          left: tooltipPx, top: 0, transform: 'translateX(-50%)',
          background: 'rgba(15,12,30,0.95)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(180,78,255,0.45)',
          borderRadius: 6, padding: '8px 11px',
          fontFamily: 'DM Mono', fontSize: 10,
          boxShadow: '0 6px 20px rgba(0,0,0,0.55), 0 0 14px rgba(180,78,255,0.15)',
          minWidth: 150, whiteSpace: 'nowrap',
        }}>
          <div style={{
            color: '#e2d9ff', marginBottom: 5, fontSize: 9, letterSpacing: '0.4px',
            textTransform: 'uppercase',
          }}>
            {fmtDate(hoveredData.key)}
          </div>
          {activeCols.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2,
              color: m.color,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: m.color,
                boxShadow: `0 0 6px ${m.color}`, display: 'inline-block',
              }} />
              <span style={{ flex: 1 }}>{m.label}</span>
              <span style={{ fontWeight: 600 }}>{fmt(hoveredData[m.id])}</span>
            </div>
          ))}
          {hoveredData.posts.length > 0 && (
            <div style={{
              marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(180,78,255,0.2)',
              color: 'var(--text3)', fontSize: 9,
            }}>
              {hoveredData.posts.length} post{hoveredData.posts.length===1?'':'s'}
              {hoveredData.posts.length === 1 && hoveredData.posts[0].title && (
                <div style={{
                  color: 'var(--text2)', marginTop: 2, maxWidth: 220,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {hoveredData.posts[0].title.slice(0, 40)}{hoveredData.posts[0].title.length > 40 ? '…' : ''}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: 'block', overflow: 'visible' }}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <defs>
          {METRICS.map(m => (
            <linearGradient key={m.id} id={`grad-${m.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={m.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={m.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Y grid */}
        {hasData && ticks.map(t => (
          <g key={t.val}>
            <line x1={padL} y1={t.y} x2={padL+cw} y2={t.y}
              stroke="rgba(180,78,255,0.08)" strokeWidth={1}
              strokeDasharray={t.val === 0 ? '0' : '2 3'} />
            <text x={padL-6} y={t.y+3} textAnchor="end"
              fill="#4a4168" fontSize={9} fontFamily="DM Mono">
              {fmt(t.val)}
            </text>
          </g>
        ))}

        {/* Areas — biggest peak drawn first so smaller peaks stay visible on top */}
        {hasData && [...paths].sort((a, b) => {
          // Higher peak → smaller min(y) → sorts to the back
          const minYA = Math.min(...a.pts.map(p => p.y))
          const minYB = Math.min(...b.pts.map(p => p.y))
          return minYA - minYB
        }).map(({ metric, line, area }) => (
          <g key={metric.id}>
            <path d={area} fill={`url(#grad-${metric.id})`} />
            <path d={line} fill="none"
              stroke={metric.color} strokeWidth={1.8}
              style={{ filter: `drop-shadow(0 0 4px ${metric.color}88)` }} />
          </g>
        ))}

        {/* Crosshair */}
        {hasData && activeIdx != null && (
          <g>
            <line
              x1={xFor(activeIdx)} y1={padT}
              x2={xFor(activeIdx)} y2={padT+ch}
              stroke="rgba(226,217,255,0.35)" strokeWidth={1}
              strokeDasharray="3 3"
            />
            {activeCols.map(m => (
              <circle key={m.id}
                cx={xFor(activeIdx)} cy={yFor(series[activeIdx][m.id])}
                r={3.5} fill={m.color}
                stroke="#0f0c1e" strokeWidth={1.5}
                style={{ filter: `drop-shadow(0 0 6px ${m.color})` }}
              />
            ))}
          </g>
        )}

        {/* X axis line */}
        {hasData && (
          <line x1={padL} y1={padT+ch} x2={padL+cw} y2={padT+ch}
            stroke="rgba(180,78,255,0.15)" strokeWidth={1} />
        )}

        {/* X ticks */}
        {xTicks.map(t => (
          <text key={t.idx}
            x={xFor(t.idx)} y={padT+ch+16}
            textAnchor="middle"
            fill="#4a4168" fontSize={9} fontFamily="DM Mono">
            {(() => {
              const [y, m, d] = t.key.split('-').map(Number)
              const date = new Date(y, m-1, d)
              return `${date.toLocaleString('en-US',{month:'short'})} ${d}`
            })()}
          </text>
        ))}

        {/* Empty state */}
        {!hasData && (
          <text x={w/2} y={h/2} textAnchor="middle"
            fill="#4a4168" fontSize={11} fontFamily="DM Mono">
            No data in selected range
          </text>
        )}
      </svg>
    </div>
  )
}
