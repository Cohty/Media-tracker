import { useMemo } from 'react'
import { PLATFORMS } from '../constants'

function fmtN(n) {
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n/1000).toFixed(1)}k`
  return n > 0 ? String(n) : '—'
}

function isXPost(p) {
  return p.platform === 'X' || p.platform === 'Twitter' ||
    (p.url||'').includes('twitter.com') || (p.url||'').includes('x.com')
}

function PlatformBreakdownTooltip({ breakdown, totalRaw, accentColor }) {
  const sorted = Object.entries(breakdown)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])

  if (sorted.length === 0 || totalRaw === 0) return null

  return (
    <div className="stat-card-tooltip stat-card-tooltip--breakdown">
      <div className="tooltip-total" style={{ color: accentColor, textShadow: `0 0 8px ${accentColor}88` }}>
        {totalRaw.toLocaleString()}
      </div>
      <div className="tooltip-divider" />
      {sorted.map(([platform, val]) => {
        const meta = PLATFORMS[platform] || PLATFORMS.Other
        const pct = ((val / totalRaw) * 100).toFixed(0)
        return (
          <div key={platform} className="tooltip-row">
            <span className="tooltip-platform">
              <span className="tooltip-dot" style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
              <span style={{ color: meta.color }}>{platform}</span>
            </span>
            <span className="tooltip-value">{fmtN(val)}</span>
            <span className="tooltip-pct">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

export default function StatsBar({ posts, allPosts, rangeLabel }) {
  const displayPosts = posts // filtered by date range

  const stats = useMemo(() => {
    const platformCount = {}
    const viewsByPlat = {}, engByPlat = {}, impByPlat = {}
    let totalViews = 0, totalEngagement = 0, totalImpressions = 0

    displayPosts.forEach(p => {
      const platform = p.platform || 'Other'
      platformCount[platform] = (platformCount[platform] || 0) + 1
      const isX = isXPost(p)
      const xV = isX ? Number(p.videoViews) || 0 : 0
      const sV = Number(p.stats?.views) || 0
      const v = Math.max(xV, sV)
      totalViews += v
      viewsByPlat[platform] = (viewsByPlat[platform] || 0) + v

      const eng = Number(p.stats?.engagement) || 0
      totalEngagement += eng
      engByPlat[platform] = (engByPlat[platform] || 0) + eng

      const xI = isX ? Number(p.xImpressions) || 0 : 0
      const sI = Number(p.stats?.impressions) || 0
      const imp = Math.max(xI, sI)
      totalImpressions += imp
      impByPlat[platform] = (impByPlat[platform] || 0) + imp
    })

    const topPlatform = Object.entries(platformCount).sort((a, b) => b[1] - a[1])[0]
    const activeShows = new Set(displayPosts.map(p => p.show).filter(Boolean)).size

    return {
      topPlatform, activeShows, platformCount,
      totalViews: fmtN(totalViews), totalViewsRaw: totalViews,
      totalEngagement: fmtN(totalEngagement), totalEngagementRaw: totalEngagement,
      totalImpressions: fmtN(totalImpressions), totalImpressionsRaw: totalImpressions,
      viewsByPlat, engByPlat, impByPlat,
    }
  }, [displayPosts])

  const cards = [
    {
      key: 'posts',
      label: 'TOTAL POSTS', value: displayPosts.length, sub: rangeLabel || 'all time',
      color: 'var(--purple)',
    },
    {
      key: 'shows',
      label: 'SHOWS ACTIVE', value: `${stats.activeShows}`, sub: 'with content',
      color: 'var(--cyan)',
    },
    {
      key: 'platform',
      label: 'TOP PLATFORM', value: stats.topPlatform?.[0] || '—',
      sub: stats.topPlatform ? `${stats.topPlatform[1]} posts` : 'none yet',
      color: '#f0a020',
      breakdown: stats.platformCount, totalRaw: displayPosts.length,
    },
    {
      key: 'views',
      label: 'TOTAL VIEWS', value: stats.totalViews, sub: 'video views',
      color: '#00e5ff',
      breakdown: stats.viewsByPlat, totalRaw: stats.totalViewsRaw,
    },
    {
      key: 'engagement',
      label: 'TOTAL ENGAGEMENT', value: stats.totalEngagement, sub: 'likes · comments · shares',
      color: '#ff2d78',
      breakdown: stats.engByPlat, totalRaw: stats.totalEngagementRaw,
    },
    {
      key: 'impressions',
      label: 'TOTAL IMPRESSIONS', value: stats.totalImpressions, sub: 'all platforms',
      color: '#b44eff',
      breakdown: stats.impByPlat, totalRaw: stats.totalImpressionsRaw,
    },
  ]

  return (
    <div className="statsbar">
      {cards.map(card => {
        const hasBreakdown = card.breakdown && card.totalRaw > 0
        return (
          <div key={card.key}
            className={`stat-card${hasBreakdown ? ' stat-card--hoverable' : ''}`}
            style={{ cursor: hasBreakdown ? 'help' : 'default', position: 'relative' }}>
            <div className="stat-label">{card.label}</div>
            <div className="stat-value" style={{ color: card.color, textShadow: `0 0 10px ${card.color}` }}>{card.value}</div>
            <div className="stat-sub">{card.sub}</div>
            {hasBreakdown && (
              <PlatformBreakdownTooltip
                breakdown={card.breakdown}
                totalRaw={card.totalRaw}
                accentColor={card.color}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
