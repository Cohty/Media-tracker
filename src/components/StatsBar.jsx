import { PLATFORMS } from '../constants'

export default function StatsBar({ posts }) {
  const total = posts.length

  const activeShows = new Set(posts.map(p => p.show)).size

  const platformCounts = posts.reduce((acc, p) => {
    acc[p.platform] = (acc[p.platform] || 0) + 1
    return acc
  }, {})
  const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const thisWeek = posts.filter(p => p.ts >= weekAgo).length

  const pm = topPlatform ? (PLATFORMS[topPlatform[0]] || PLATFORMS.Other) : null

  return (
    <div className="stats-bar">
      <div className="stat-card" style={{ '--accent': '#b44eff' }}>
        <div className="stat-label">Total Posts</div>
        <div className="stat-value">{total}</div>
        <div className="stat-sub">all time</div>
      </div>

      <div className="stat-card" style={{ '--accent': '#00e5ff' }}>
        <div className="stat-label">Shows Active</div>
        <div className="stat-value">{activeShows}<span style={{ fontSize: 20, opacity: 0.4 }}>/5</span></div>
        <div className="stat-sub">with content</div>
      </div>

      <div className="stat-card" style={{ '--accent': pm?.color || '#4a4168' }}>
        <div className="stat-label">Top Platform</div>
        <div className="stat-value" style={{ fontSize: 28 }}>
          {topPlatform ? topPlatform[0] : '—'}
        </div>
        <div className="stat-sub">{topPlatform ? `${topPlatform[1]} post${topPlatform[1] !== 1 ? 's' : ''}` : 'none yet'}</div>
      </div>

      <div className="stat-card" style={{ '--accent': '#f0e040' }}>
        <div className="stat-label">This Week</div>
        <div className="stat-value">{thisWeek}</div>
        <div className="stat-sub">last 7 days</div>
      </div>
    </div>
  )
}
