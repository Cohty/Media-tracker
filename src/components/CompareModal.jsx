import { SHOWS, PLATFORMS } from '../constants'

function getMetrics(p) {
  const isX = p.platform === 'X' || p.platform === 'Twitter' ||
    (p.url||'').includes('twitter.com') || (p.url||'').includes('x.com')
  return {
    views: Math.max(isX ? Number(p.videoViews)||0 : 0, Number(p.stats?.views)||0),
    engagement: Number(p.stats?.engagement) || 0,
    impressions: Math.max(isX ? Number(p.xImpressions)||0 : 0, Number(p.stats?.impressions)||0),
  }
}

function fmt(n) {
  const v = Number(n)
  if (!v || isNaN(v)) return '0'
  if (v >= 1000000) return `${(v/1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v/1000).toFixed(1)}k`
  return String(v)
}

function pctDelta(a, b) {
  if (!a && !b) return null
  if (!a) return { sign: '+', pct: '∞', winner: 'B' }
  if (!b) return { sign: '+', pct: '∞', winner: 'A' }
  const pct = Math.abs((a - b) / Math.min(a, b)) * 100
  const winner = a > b ? 'A' : a < b ? 'B' : null
  return { pct: pct >= 1000 ? `${(pct/100).toFixed(1)}×` : `${pct.toFixed(0)}%`, winner }
}

const COLOR_A = '#00e5ff'
const COLOR_B = '#ff2d78'
const METRICS = [
  { id: 'views',       label: 'Views',       icon: '👁' },
  { id: 'engagement',  label: 'Engagement',  icon: '💬' },
  { id: 'impressions', label: 'Impressions', icon: '📢' },
]

function PostHeader({ post, label, color }) {
  const show = SHOWS.find(s => s.name === post.show)
  const showColor = show?.hex || '#666'
  const platform = PLATFORMS[post.platform] || PLATFORMS.Other
  return (
    <div style={{
      flex: 1, minWidth: 0,
      border: `1px solid ${color}44`,
      background: `${color}08`,
      borderRadius: 'var(--radius)',
      padding: '10px 12px',
    }}>
      <div style={{
        fontFamily: 'Press Start 2P', fontSize: 8, color,
        textShadow: `0 0 8px ${color}88`, marginBottom: 8, letterSpacing: '1px',
      }}>
        POST {label}
      </div>
      <div style={{
        color: 'var(--text)', fontSize: 12, fontWeight: 500, lineHeight: 1.35,
        marginBottom: 8, overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {post.title || '(no title)'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {post.show && (
          <span style={{
            fontFamily: 'DM Mono', fontSize: 8, padding: '2px 6px',
            background: showColor + '22', color: showColor,
            border: `1px solid ${showColor}55`, borderRadius: 3,
          }}>
            {post.show}
          </span>
        )}
        {post.episodeNumber && (
          <span style={{
            fontFamily: 'DM Mono', fontSize: 8, padding: '2px 6px',
            background: 'rgba(240,224,64,0.12)', color: 'var(--yellow)',
            border: '1px solid rgba(240,224,64,0.35)', borderRadius: 3,
          }}>
            EP {post.episodeNumber}{post.clipIndex ? ` · ${post.clipIndex}` : ''}
          </span>
        )}
        {post.mediaType && (
          <span style={{
            fontFamily: 'DM Mono', fontSize: 8, padding: '2px 6px',
            color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 3,
          }}>
            {post.mediaType}
          </span>
        )}
        <span style={{
          fontFamily: 'DM Mono', fontSize: 8, padding: '2px 6px',
          background: platform.bg, color: platform.color, borderRadius: 3,
        }}>
          {post.platform}
        </span>
        <span style={{ fontFamily: 'DM Mono', fontSize: 8, color: 'var(--text3)', marginLeft: 'auto' }}>
          {post.date}
        </span>
      </div>
    </div>
  )
}

function CompareChart({ metricsA, metricsB }) {
  const w = 640, h = 220
  const padL = 60, padR = 20, padT = 22, padB = 40
  const cw = w - padL - padR, ch = h - padT - padB

  const maxVal = Math.max(
    ...METRICS.flatMap(m => [metricsA[m.id], metricsB[m.id]]), 1
  )
  const groupW = cw / METRICS.length
  const barW = Math.min(40, (groupW - 20) / 2)
  const barGap = 4

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    val: Math.round(maxVal * t),
    y: padT + ch * (1 - t),
  }))

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      {/* Grid */}
      {ticks.map(t => (
        <g key={t.val}>
          <line x1={padL} y1={t.y} x2={padL + cw} y2={t.y} stroke="rgba(180,78,255,0.08)" strokeWidth={1} />
          <text x={padL - 5} y={t.y + 3} textAnchor="end" fill="#4a4168" fontSize={9} fontFamily="DM Mono">
            {fmt(t.val)}
          </text>
        </g>
      ))}
      <line x1={padL} y1={padT + ch} x2={padL + cw} y2={padT + ch} stroke="rgba(180,78,255,0.15)" strokeWidth={1} />

      {METRICS.map((m, i) => {
        const gx = padL + i * groupW
        const groupCenter = gx + groupW / 2
        const vA = metricsA[m.id]
        const vB = metricsB[m.id]
        const hA = (vA / maxVal) * ch
        const hB = (vB / maxVal) * ch
        const bxA = groupCenter - barW - barGap / 2
        const bxB = groupCenter + barGap / 2
        return (
          <g key={m.id}>
            {/* Bar A */}
            <rect x={bxA} y={padT + ch - hA} width={barW} height={Math.max(hA, 0)}
              fill={COLOR_A} opacity={0.9} rx={2} />
            {vA > 0 && (
              <text x={bxA + barW / 2} y={padT + ch - hA - 4} textAnchor="middle"
                fill={COLOR_A} fontSize={9} fontFamily="DM Mono">
                {fmt(vA)}
              </text>
            )}
            {/* Bar B */}
            <rect x={bxB} y={padT + ch - hB} width={barW} height={Math.max(hB, 0)}
              fill={COLOR_B} opacity={0.9} rx={2} />
            {vB > 0 && (
              <text x={bxB + barW / 2} y={padT + ch - hB - 4} textAnchor="middle"
                fill={COLOR_B} fontSize={9} fontFamily="DM Mono">
                {fmt(vB)}
              </text>
            )}
            {/* Metric label */}
            <text x={groupCenter} y={padT + ch + 18} textAnchor="middle"
              fill="#8b7eb8" fontSize={10} fontFamily="DM Mono">
              {m.icon} {m.label}
            </text>
          </g>
        )
      })}

      {/* Legend */}
      <g transform={`translate(${padL}, ${h - 8})`}>
        <rect width={10} height={10} fill={COLOR_A} rx={1} />
        <text x={14} y={9} fill={COLOR_A} fontSize={10} fontFamily="DM Mono">Post A</text>
      </g>
      <g transform={`translate(${padL + 100}, ${h - 8})`}>
        <rect width={10} height={10} fill={COLOR_B} rx={1} />
        <text x={14} y={9} fill={COLOR_B} fontSize={10} fontFamily="DM Mono">Post B</text>
      </g>
    </svg>
  )
}

export default function CompareModal({ isOpen, postA, postB, onClose }) {
  if (!isOpen || !postA || !postB) return null

  const metricsA = getMetrics(postA)
  const metricsB = getMetrics(postB)

  const totalA = metricsA.views + metricsA.engagement + metricsA.impressions
  const totalB = metricsB.views + metricsB.engagement + metricsB.impressions
  const hasAnyStats = totalA > 0 || totalB > 0

  // Count wins per side
  const wins = METRICS.reduce((acc, m) => {
    if (metricsA[m.id] > metricsB[m.id]) acc.A++
    else if (metricsB[m.id] > metricsA[m.id]) acc.B++
    return acc
  }, { A: 0, B: 0 })

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 780, width: '94vw' }}>
        <div className="modal-titlebar" style={{ background: 'linear-gradient(90deg, #001a40, #002860)' }}>
          <span className="modal-titlebar-text">⚔ COMPARE POSTS</span>
          <div className="modal-titlebar-controls">
            <button className="modal-ctrl">_</button>
            <button className="modal-ctrl">□</button>
            <button className="modal-ctrl" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: '82vh', overflowY: 'auto' }}>
          {/* Two posts side by side */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <PostHeader post={postA} label="A" color={COLOR_A} />
            <PostHeader post={postB} label="B" color={COLOR_B} />
          </div>

          {/* Chart */}
          {!hasAnyStats ? (
            <div style={{
              padding: '40px 20px', textAlign: 'center', border: '1px dashed var(--border2)',
              borderRadius: 'var(--radius)', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text3)',
            }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>📊</div>
              Neither post has stats yet. Sync from Sprout or add them manually.
            </div>
          ) : (
            <>
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 12,
              }}>
                <CompareChart metricsA={metricsA} metricsB={metricsB} />
              </div>

              {/* Per-metric breakdown */}
              <div style={{
                border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden',
              }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.9fr 1fr', gap: 1,
                  background: 'var(--border)',
                  fontFamily: 'DM Mono', fontSize: 8, letterSpacing: '0.8px',
                  textTransform: 'uppercase', color: 'var(--text3)',
                }}>
                  <div style={{ padding: '8px 12px', background: 'var(--surface)' }}>Metric</div>
                  <div style={{ padding: '8px 12px', background: 'var(--surface)', textAlign: 'right', color: COLOR_A }}>Post A</div>
                  <div style={{ padding: '8px 12px', background: 'var(--surface)', textAlign: 'center' }}>Δ</div>
                  <div style={{ padding: '8px 12px', background: 'var(--surface)', textAlign: 'right', color: COLOR_B }}>Post B</div>
                </div>
                {METRICS.map(m => {
                  const vA = metricsA[m.id]
                  const vB = metricsB[m.id]
                  const delta = pctDelta(vA, vB)
                  return (
                    <div key={m.id} style={{
                      display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.9fr 1fr', gap: 1,
                      background: 'var(--border)',
                    }}>
                      <div style={{
                        padding: '10px 12px', background: 'var(--surface)',
                        fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text)',
                      }}>
                        {m.icon} {m.label}
                      </div>
                      <div style={{
                        padding: '10px 12px', background: 'var(--surface)', textAlign: 'right',
                        fontFamily: 'VT323', fontSize: 18,
                        color: delta?.winner === 'A' ? COLOR_A : 'var(--text2)',
                        textShadow: delta?.winner === 'A' ? `0 0 8px ${COLOR_A}66` : 'none',
                      }}>
                        {delta?.winner === 'A' && <span style={{ fontSize: 10, marginRight: 4 }}>▲</span>}
                        {fmt(vA)}
                      </div>
                      <div style={{
                        padding: '10px 12px', background: 'var(--surface)', textAlign: 'center',
                        fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text3)',
                      }}>
                        {delta ? delta.pct : '—'}
                      </div>
                      <div style={{
                        padding: '10px 12px', background: 'var(--surface)', textAlign: 'right',
                        fontFamily: 'VT323', fontSize: 18,
                        color: delta?.winner === 'B' ? COLOR_B : 'var(--text2)',
                        textShadow: delta?.winner === 'B' ? `0 0 8px ${COLOR_B}66` : 'none',
                      }}>
                        {delta?.winner === 'B' && <span style={{ fontSize: 10, marginRight: 4 }}>▲</span>}
                        {fmt(vB)}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Win summary */}
              {(wins.A > 0 || wins.B > 0) && (
                <div style={{
                  marginTop: 12, padding: '10px 14px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', textAlign: 'center',
                  fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text2)',
                }}>
                  {wins.A > wins.B && <span style={{ color: COLOR_A }}>POST A WINS {wins.A} OF 3 METRICS</span>}
                  {wins.B > wins.A && <span style={{ color: COLOR_B }}>POST B WINS {wins.B} OF 3 METRICS</span>}
                  {wins.A === wins.B && wins.A > 0 && <span>TIED · {wins.A}–{wins.B}</span>}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
