import { useState } from 'react'
import { SHOWS, PLATFORMS, UNASSIGNED } from '../constants'

// Platform logos as inline SVGs — keep colors monochrome and let the parent tint.
function PlatformLogo({ platform, size = 32, color = '#fff' }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: color }
  switch (platform) {
    case 'YouTube':
      return (
        <svg {...props}>
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2C2 8.78 2 12 2 12s0 3.22.4 4.8a2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77C22 15.22 22 12 22 12s0-3.22-.4-4.8zM10 15V9l5.2 3-5.2 3z" />
        </svg>
      )
    case 'X':
    case 'Twitter':
      return (
        <svg {...props}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
        </svg>
      )
    case 'LinkedIn':
      return (
        <svg {...props}>
          <path d="M19 0h-14C2.24 0 0 2.24 0 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5V5c0-2.76-2.24-5-5-5zM8 19H5V8h3v11zM6.5 6.73c-.97 0-1.75-.79-1.75-1.76s.78-1.76 1.75-1.76 1.75.79 1.75 1.76-.78 1.76-1.75 1.76zM20 19h-3v-5.6c0-3.37-4-3.11-4 0V19h-3V8h3v1.77c1.4-2.59 7-2.78 7 2.48V19z" />
        </svg>
      )
    case 'Instagram':
      return (
        <svg {...props}>
          <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.86 5.86 0 0 0-2.13 1.38A5.86 5.86 0 0 0 .63 4.14c-.3.76-.5 1.64-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.8.73 1.48 1.38 2.13a5.86 5.86 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.86 5.86 0 0 0 2.13-1.38 5.86 5.86 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.86 5.86 0 0 0-1.38-2.13A5.86 5.86 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" />
        </svg>
      )
    case 'TikTok':
      return (
        <svg {...props}>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.61a8.16 8.16 0 0 0 4.77 1.52V6.69h-1.84z" />
        </svg>
      )
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="2" />
          <path d="M2 12h20M12 2a14 14 0 0 1 0 20M12 2a14 14 0 0 0 0 20" fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
      )
  }
}

function fmt(n) {
  const v = Number(n) || 0
  if (v >= 1000000) return `${(v/1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v/1000).toFixed(1)}k`
  return String(v)
}
function fmtFull(n) {
  return (Number(n) || 0).toLocaleString()
}

function isXPost(p) {
  return p.platform === 'X' || p.platform === 'Twitter' ||
    (p.url||'').includes('twitter.com') || (p.url||'').includes('x.com')
}

function getMetrics(p) {
  const isX = isXPost(p)
  return {
    views: Math.max(isX ? Number(p.videoViews)||0 : 0, Number(p.stats?.views)||0),
    engagement: Number(p.stats?.engagement) || 0,
    impressions: Math.max(isX ? Number(p.xImpressions)||0 : 0, Number(p.stats?.impressions)||0),
  }
}

const METRICS = [
  { id: 'views',       label: 'Views',       color: '#00e5ff', icon: '👁' },
  { id: 'engagement',  label: 'Engagement',  color: '#ff2d78', icon: '💬' },
  { id: 'impressions', label: 'Impressions', color: '#b44eff', icon: '📢' },
]

// Horizontal bar chart — log scale toggle for when one metric dwarfs others
function MetricsChart({ metrics, useLog }) {
  const w = 560, barH = 38, gap = 16
  const padL = 130, padR = 80
  const labelW = padL - 12
  const cw = w - padL - padR
  const h = METRICS.length * (barH + gap) - gap + 12

  const values = METRICS.map(m => metrics[m.id])
  const maxRaw = Math.max(...values, 1)
  const scale = useLog
    ? v => Math.log10(Math.max(v, 1)) / Math.log10(maxRaw + 1)
    : v => v / maxRaw

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <defs>
        {METRICS.map(m => (
          <linearGradient key={m.id} id={`bar-grad-${m.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={m.color} stopOpacity="0.85" />
            <stop offset="100%" stopColor={m.color} stopOpacity="0.4" />
          </linearGradient>
        ))}
      </defs>
      {METRICS.map((m, i) => {
        const val = metrics[m.id]
        const ratio = val > 0 ? scale(val) : 0
        const bw = Math.max(ratio * cw, val > 0 ? 4 : 0)
        const y = i * (barH + gap) + 6
        return (
          <g key={m.id}>
            {/* Track */}
            <rect x={padL} y={y} width={cw} height={barH} rx={4}
              fill="rgba(180,78,255,0.05)" stroke="rgba(180,78,255,0.12)" strokeWidth={1} />
            {/* Label */}
            <text x={labelW} y={y + barH/2 + 5}
              textAnchor="end"
              fill={m.color}
              fontFamily="DM Mono"
              fontSize={12}
              fontWeight={500}>
              {m.icon} {m.label.toUpperCase()}
            </text>
            {/* Bar */}
            {val > 0 && (
              <rect x={padL} y={y} width={bw} height={barH} rx={4}
                fill={`url(#bar-grad-${m.id})`}
                stroke={m.color} strokeOpacity={0.6} strokeWidth={1}
                style={{ filter: `drop-shadow(0 0 6px ${m.color}66)` }} />
            )}
            {/* Value */}
            <text x={padL + bw + 8} y={y + barH/2 + 6}
              fill={val > 0 ? m.color : 'var(--text3)'}
              fontFamily="VT323"
              fontSize={20}
              style={{ filter: val > 0 ? `drop-shadow(0 0 4px ${m.color}88)` : 'none' }}>
              {val > 0 ? fmt(val) : '—'}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function relTime(ts) {
  if (!ts) return null
  const diff = Date.now() - ts
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days/7)}w ago`
  if (days < 365) return `${Math.floor(days/30)}mo ago`
  return `${Math.floor(days/365)}y ago`
}

export default function PostDetailModal({ post, isOpen, onClose, onEdit, onDelete }) {
  const [useLog, setUseLog] = useState(false)
  if (!isOpen || !post) return null

  const metrics = getMetrics(post)
  const total = metrics.views + metrics.engagement + metrics.impressions
  const hasStats = total > 0
  const platform = PLATFORMS[post.platform] || PLATFORMS.Other
  const show = SHOWS.find(s => s.name === post.show) || (post.show ? null : UNASSIGNED)
  const showColor = show?.hex || '#666'
  const isX = isXPost(post)

  // Engagement rate when impressions present
  const engRate = metrics.impressions > 0
    ? ((metrics.engagement / metrics.impressions) * 100).toFixed(2)
    : null

  // Auto-suggest log if max metric is 50× the smallest non-zero
  const nonZero = [metrics.views, metrics.engagement, metrics.impressions].filter(v => v > 0)
  const suggestLog = nonZero.length > 1 && (Math.max(...nonZero) / Math.min(...nonZero) > 50)

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal post-detail-modal" style={{ maxWidth: 720, width: '94vw' }}>
        <div className="modal-titlebar" style={{
          background: `linear-gradient(90deg, ${platform.color}30, ${platform.color}66)`,
          borderBottom: `1px solid ${platform.color}55`,
        }}>
          <span className="modal-titlebar-text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlatformLogo platform={post.platform} size={14} color="#fff" />
            POST DETAIL
          </span>
          <div className="modal-titlebar-controls">
            <button className="modal-ctrl">_</button>
            <button className="modal-ctrl">□</button>
            <button className="modal-ctrl" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body post-detail-body">
          {/* HERO — platform logo + title + meta */}
          <div className="post-detail-hero">
            <div className="post-detail-platform-badge"
              style={{
                background: `${platform.color}1a`,
                border: `1px solid ${platform.color}55`,
                boxShadow: `0 0 20px ${platform.color}33, inset 0 0 20px ${platform.color}10`,
              }}>
              <PlatformLogo platform={post.platform} size={48} color={platform.color} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="post-detail-pills">
                {show && (
                  <span className="post-detail-pill"
                    style={{ background: `${showColor}1f`, color: showColor, borderColor: `${showColor}55` }}>
                    {show.name}
                  </span>
                )}
                {post.episodeNumber && (
                  <span className="post-detail-pill"
                    style={{ background: 'rgba(240,224,64,0.12)', color: 'var(--yellow)', borderColor: 'rgba(240,224,64,0.4)' }}>
                    EP {post.episodeNumber}{post.clipIndex && post.clipIndex !== 'Clip' ? ` · ${post.clipIndex}` : ''}
                  </span>
                )}
                {post.mediaType && (
                  <span className="post-detail-pill"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text2)', borderColor: 'var(--border2)' }}>
                    {post.mediaType}
                  </span>
                )}
                <span className="post-detail-pill"
                  style={{ background: platform.bg, color: platform.color, borderColor: `${platform.color}55` }}>
                  {post.platform}
                </span>
              </div>

              <h2 className="post-detail-title">{post.title || '(no title)'}</h2>

              <div className="post-detail-meta">
                <span>📅 {post.date}</span>
                {post.ts && <span style={{ color: 'var(--text3)' }}>· {relTime(post.ts)}</span>}
                {post.stats?.lastSynced && (
                  <span className="post-detail-sync">
                    <span className="post-detail-sync-dot" /> synced {relTime(post.stats.lastSynced)}
                  </span>
                )}
              </div>

              <div className="post-detail-actions-inline">
                <a href={post.url} target="_blank" rel="noreferrer" className="post-detail-btn post-detail-btn--primary">
                  ↗ Open Post
                </a>
                {onEdit && (
                  <button onClick={() => { onEdit(post); onClose() }} className="post-detail-btn">
                    ✎ Edit
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* METRICS SECTION */}
          {hasStats ? (
            <div className="post-detail-section">
              <div className="post-detail-section-header">
                <span>📊 PERFORMANCE BREAKDOWN</span>
                {suggestLog && (
                  <button className="post-detail-log-toggle"
                    onClick={() => setUseLog(v => !v)}
                    title="Toggle logarithmic scale (helps when one metric dwarfs others)">
                    {useLog ? 'LINEAR' : 'LOG'}
                  </button>
                )}
              </div>

              {/* Big tiles */}
              <div className="post-detail-tiles">
                {METRICS.map(m => {
                  const val = metrics[m.id]
                  return (
                    <div key={m.id} className="post-detail-tile"
                      style={{
                        borderColor: val > 0 ? `${m.color}55` : 'var(--border)',
                        background: val > 0 ? `${m.color}08` : 'transparent',
                      }}>
                      <div className="post-detail-tile-label" style={{ color: m.color }}>
                        {m.icon} {m.label.toUpperCase()}
                      </div>
                      <div className="post-detail-tile-value"
                        style={{
                          color: val > 0 ? m.color : 'var(--text3)',
                          textShadow: val > 0 ? `0 0 10px ${m.color}66` : 'none',
                        }}>
                        {val > 0 ? fmt(val) : '—'}
                      </div>
                      {val > 0 && (
                        <div className="post-detail-tile-full">{fmtFull(val)}</div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Bar chart */}
              <div className="post-detail-chart">
                <MetricsChart metrics={metrics} useLog={useLog} />
              </div>

              {/* Engagement rate, if applicable */}
              {engRate !== null && (
                <div className="post-detail-rate">
                  <span className="post-detail-rate-label">ENGAGEMENT RATE</span>
                  <span className="post-detail-rate-value">{engRate}%</span>
                  <span className="post-detail-rate-note">
                    {fmt(metrics.engagement)} engagements over {fmt(metrics.impressions)} impressions
                  </span>
                </div>
              )}

              {isX && (post.videoViews || post.xImpressions) && (
                <div className="post-detail-source-note">
                  <span style={{ color: 'var(--cyan)' }}>● </span>
                  Stats sourced from X API{post.stats?.lastSynced ? ' + Sprout Social' : ''}
                </div>
              )}
            </div>
          ) : (
            <div className="post-detail-section">
              <div className="post-detail-empty">
                <div className="post-detail-empty-icon">📊</div>
                <div className="post-detail-empty-text">No stats yet</div>
                <div className="post-detail-empty-sub">
                  Sync from Sprout or add metrics manually in the Analytics view.
                </div>
              </div>
            </div>
          )}

          {/* URL strip */}
          <div className="post-detail-url">
            <span className="post-detail-url-label">URL</span>
            <a href={post.url} target="_blank" rel="noreferrer" className="post-detail-url-link">
              {post.url}
            </a>
          </div>
        </div>

        <div className="modal-actions">
          {onDelete && (
            <button className="btn-ghost post-detail-btn--danger"
              onClick={() => { if (confirm('Remove this post?')) { onDelete(post.id); onClose() } }}>
              ✕ Remove
            </button>
          )}
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
