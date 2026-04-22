import { useMemo } from 'react'

export default function StatsBar({ posts, allPosts, rangeLabel }) {
  const displayPosts = posts // filtered by date range

  const stats = useMemo(() => {
    const platformCount = {}
    let totalViews = 0, totalEngagement = 0, totalImpressions = 0

    displayPosts.forEach(p => {
      platformCount[p.platform] = (platformCount[p.platform] || 0) + 1
      const isX = p.platform === 'X' || p.platform === 'Twitter' ||
        (p.url||'').includes('twitter.com') || (p.url||'').includes('x.com')
      // Views: higher of X API vs Sprout
      const xV = isX ? Number(p.videoViews) || 0 : 0
      const sV = Number(p.stats?.views) || 0
      totalViews += Math.max(xV, sV)
      totalEngagement += Number(p.stats?.engagement) || 0
      // Impressions: higher of X API vs Sprout
      const xI = isX ? Number(p.xImpressions) || 0 : 0
      const sI = Number(p.stats?.impressions) || 0
      totalImpressions += Math.max(xI, sI)
    })

    const topPlatform = Object.entries(platformCount).sort((a,b) => b[1]-a[1])[0]
    const activeShows = new Set(displayPosts.map(p => p.show).filter(Boolean)).size

    function fmt(n) {
      if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`
      if (n >= 1000) return `${(n/1000).toFixed(1)}k`
      return n > 0 ? String(n) : '—'
    }

    return {
      topPlatform, activeShows, platformCount,
      totalViews: fmt(totalViews), totalViewsRaw: totalViews,
      totalEngagement: fmt(totalEngagement), totalEngagementRaw: totalEngagement,
      totalImpressions: fmt(totalImpressions), totalImpressionsRaw: totalImpressions,
    }
  }, [displayPosts])

  const cards = [
    { label: 'TOTAL POSTS', value: displayPosts.length, sub: rangeLabel || 'all time', color: 'var(--purple)', tooltip: null },
    { label: 'SHOWS ACTIVE', value: `${stats.activeShows}`, sub: 'with content', color: 'var(--cyan)', tooltip: null },
    { label: 'TOP PLATFORM', value: stats.topPlatform?.[0] || '—', sub: stats.topPlatform ? `${stats.topPlatform[1]} posts` : 'none yet', color: '#f0a020', tooltip: null },
    { label: 'TOTAL VIEWS', value: stats.totalViews, sub: 'video views', color: '#00e5ff', tooltip: stats.totalViewsRaw > 0 ? stats.totalViewsRaw.toLocaleString() : null },
    { label: 'TOTAL ENGAGEMENT', value: stats.totalEngagement, sub: 'likes · comments · shares', color: '#ff2d78', tooltip: stats.totalEngagementRaw > 0 ? stats.totalEngagementRaw.toLocaleString() : null },
    { label: 'TOTAL IMPRESSIONS', value: stats.totalImpressions, sub: 'all platforms', color: '#b44eff', tooltip: stats.totalImpressionsRaw > 0 ? stats.totalImpressionsRaw.toLocaleString() : null },
  ]

  return (
    <div className="statsbar">
      {cards.map(({ label, value, sub, color, tooltip }) => (
        <div key={label} className="stat-card stat-card--hoverable"
          title={tooltip || undefined}
          style={{ cursor: tooltip ? 'help' : 'default', position: 'relative' }}>
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ color, textShadow: `0 0 10px ${color}` }}>{value}</div>
          <div className="stat-sub">{sub}</div>
          {tooltip && (
            <div className="stat-card-tooltip">{tooltip}</div>
          )}
        </div>
      ))}
    </div>
  )
}
