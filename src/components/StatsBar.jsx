import { useMemo } from 'react'

export default function StatsBar({ posts, allPosts, rangeLabel }) {
  const displayPosts = posts // filtered by date range

  const stats = useMemo(() => {
    const platformCount = {}
    let totalViews = 0, totalEngagement = 0, totalImpressions = 0

    displayPosts.forEach(p => {
      platformCount[p.platform] = (platformCount[p.platform] || 0) + 1
      totalViews       += Number(p.stats?.views)       || 0
      totalEngagement  += Number(p.stats?.engagement)  || 0
      totalImpressions += Number(p.stats?.impressions) || 0
    })

    const topPlatform = Object.entries(platformCount).sort((a,b) => b[1]-a[1])[0]
    const activeShows = new Set(displayPosts.map(p => p.show).filter(Boolean)).size

    function fmt(n) {
      if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`
      if (n >= 1000) return `${(n/1000).toFixed(1)}k`
      return n > 0 ? String(n) : '—'
    }

    return { topPlatform, activeShows, totalViews: fmt(totalViews), totalEngagement: fmt(totalEngagement), totalImpressions: fmt(totalImpressions), platformCount }
  }, [displayPosts])

  const cards = [
    { label: 'TOTAL POSTS', value: displayPosts.length, sub: rangeLabel || 'all time', color: 'var(--purple)' },
    { label: 'SHOWS ACTIVE', value: `${stats.activeShows}`, sub: 'with content', color: 'var(--cyan)' },
    { label: 'TOP PLATFORM', value: stats.topPlatform?.[0] || '—', sub: stats.topPlatform ? `${stats.topPlatform[1]} posts` : 'none yet', color: '#f0a020' },
    { label: 'TOTAL VIEWS', value: stats.totalViews, sub: 'video views', color: '#00e5ff' },
    { label: 'TOTAL ENGAGEMENT', value: stats.totalEngagement, sub: 'likes · comments · shares', color: '#ff2d78' },
    { label: 'TOTAL IMPRESSIONS', value: stats.totalImpressions, sub: 'all platforms', color: '#b44eff' },
  ]

  return (
    <div className="statsbar">
      {cards.map(({ label, value, sub, color }) => (
        <div key={label} className="stat-card">
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ color, textShadow: `0 0 10px ${color}` }}>{value}</div>
          <div className="stat-sub">{sub}</div>
        </div>
      ))}
    </div>
  )
}
