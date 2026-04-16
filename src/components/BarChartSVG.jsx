// Pure SVG bar chart — no recharts, no resize observers, no crashes

const COLORS = {
  views:       '#00e5ff',
  engagement:  '#ff2d78',
  impressions: '#b44eff',
}

export default function BarChartSVG({ data, activeMetrics, width = 900, height = 220 }) {
  if (!data || data.length === 0) return null

  const padL = 52, padR = 16, padT = 12, padB = 72
  const chartW = width - padL - padR
  const chartH = height - padT - padB

  const activeKeys = ['views', 'engagement', 'impressions'].filter(k => activeMetrics.includes(k))
  const maxVal = Math.max(...data.flatMap(d => activeKeys.map(k => Number(d[k]) || 0)), 1)

  const groupW = chartW / data.length
  const barW = Math.min(Math.floor(groupW / (activeKeys.length + 1)), 36)
  const groupPad = (groupW - barW * activeKeys.length) / 2

  function fmtVal(v) {
    if (v >= 1000000) return `${(v/1000000).toFixed(1)}M`
    if (v >= 1000) return `${(v/1000).toFixed(1)}k`
    return String(v)
  }

  // Y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    val: Math.round(maxVal * t),
    y: padT + chartH * (1 - t),
  }))

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', display: 'block' }}>
      {/* Grid lines */}
      {ticks.map(t => (
        <g key={t.val}>
          <line x1={padL} y1={t.y} x2={padL + chartW} y2={t.y}
            stroke="rgba(180,78,255,0.08)" strokeWidth={1} />
          <text x={padL - 6} y={t.y + 3} textAnchor="end"
            fill="#4a4168" fontSize={9} fontFamily="DM Mono">
            {fmtVal(t.val)}
          </text>
        </g>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const gx = padL + i * groupW
        return (
          <g key={i}>
            {activeKeys.map((key, ki) => {
              const val = Number(d[key]) || 0
              const bh = (val / maxVal) * chartH
              const bx = gx + groupPad + ki * barW
              const by = padT + chartH - bh
              return (
                <g key={key}>
                  <rect x={bx} y={by} width={barW - 2} height={Math.max(bh, 0)}
                    fill={COLORS[key]} opacity={0.85} rx={2} />
                  {val > 0 && bh > 14 && (
                    <text x={bx + (barW-2)/2} y={by + 10} textAnchor="middle"
                      fill="#fff" fontSize={7} fontFamily="DM Mono" opacity={0.7}>
                      {fmtVal(val)}
                    </text>
                  )}
                </g>
              )
            })}
            {/* X label */}
            <text
              x={gx + groupW / 2} y={padT + chartH + 14}
              textAnchor="end"
              transform={`rotate(-38, ${gx + groupW/2}, ${padT + chartH + 14})`}
              fill="#4a4168" fontSize={9} fontFamily="DM Mono">
              {d.name}
            </text>
          </g>
        )
      })}

      {/* X axis line */}
      <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH}
        stroke="rgba(180,78,255,0.15)" strokeWidth={1} />

      {/* Legend */}
      {activeKeys.map((key, i) => (
        <g key={key} transform={`translate(${padL + i * 110}, ${height - 16})`}>
          <rect width={10} height={10} fill={COLORS[key]} rx={1} />
          <text x={14} y={9} fill="#8b7eb8" fontSize={10} fontFamily="DM Mono">
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </text>
        </g>
      ))}
    </svg>
  )
}
