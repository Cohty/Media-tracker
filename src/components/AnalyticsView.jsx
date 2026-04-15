import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { SHOWS, MEDIA_TYPES } from '../constants'

const METRICS = [
  { id: 'views',       label: 'Views',       color: '#00e5ff' },
  { id: 'engagement',  label: 'Engagement',  color: '#ff2d78' },
  { id: 'impressions', label: 'Impressions', color: '#b44eff' },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0f0c1e', border: '1px solid rgba(180,78,255,0.4)', borderRadius: 4, padding: '8px 12px', fontFamily: 'DM Mono', fontSize: 10 }}>
      <div style={{ color: '#e2d9ff', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toLocaleString()}
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsView({ posts, onUpdatePost }) {
  const [filterShow, setFilterShow] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [activeMetrics, setActiveMetrics] = useState(['views', 'engagement', 'impressions'])

  function toggleMetric(id) {
    setActiveMetrics(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const filteredPosts = useMemo(() =>
    posts.filter(p =>
      (filterShow === 'all' || p.show === filterShow) &&
      (filterType === 'all' || p.mediaType === filterType)
    ), [posts, filterShow, filterType]
  )

  const chartData = useMemo(() =>
    filteredPosts
      .filter(p => p.stats && (p.stats.views || p.stats.engagement || p.stats.impressions))
      .slice(0, 15)
      .map(p => ({
        name: p.title.length > 16 ? p.title.slice(0, 16) + '…' : p.title,
        views: Number(p.stats?.views) || 0,
        engagement: Number(p.stats?.engagement) || 0,
        impressions: Number(p.stats?.impressions) || 0,
      })),
    [filteredPosts]
  )

  function handleStatChange(postId, field, value) {
    const post = posts.find(p => p.id === postId)
    if (!post) return
    onUpdatePost(postId, {
      stats: { ...(post.stats || {}), [field]: value }
    })
  }

  const hasChartData = chartData.length > 0

  return (
    <div className="analytics-wrapper">
      <div className="win95-window">
        <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #001840, #003080)' }}>
          <span className="win95-title">🔬 FILTERS</span>
        </div>
        <div className="analytics-controls">
          <div className="filter-group">
            <span className="filter-label">SHOW</span>
            <select className="filter-select" value={filterShow} onChange={e => setFilterShow(e.target.value)}>
              <option value="all">All Shows</option>
              {SHOWS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">TYPE</span>
            <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              {MEDIA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">METRICS</span>
            <div style={{ display: 'flex', gap: 5 }}>
              {METRICS.map(m => (
                <button
                  key={m.id}
                  className={`metric-btn${activeMetrics.includes(m.id) ? ' active' : ''}`}
                  style={activeMetrics.includes(m.id) ? { color: m.color, borderColor: m.color + '66' } : {}}
                  onClick={() => toggleMetric(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-meta">
            <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text3)' }}>
              {filteredPosts.length} posts · {chartData.length} with stats
            </span>
          </div>
        </div>
      </div>

      <div className="win95-window">
        <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #1a0040, #4a0090)' }}>
          <span className="win95-title">📈 PERFORMANCE CHART</span>
        </div>
        <div className="analytics-chart-body">
          {!hasChartData ? (
            <div className="empty-analytics">
              <div style={{ fontSize: 28, marginBottom: 10 }}>📊</div>
              <div>No stats yet — add views, engagement & impressions</div>
              <div style={{ marginTop: 6, color: 'var(--text3)', fontSize: 9 }}>in the table below</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,78,255,0.08)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#4a4168', fontSize: 9, fontFamily: 'DM Mono' }}
                  angle={-40} textAnchor="end" interval={0}
                  axisLine={{ stroke: 'rgba(180,78,255,0.15)' }} tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#4a4168', fontSize: 9, fontFamily: 'DM Mono' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(180,78,255,0.05)' }} />
                <Legend
                  wrapperStyle={{ fontFamily: 'DM Mono', fontSize: 10, color: '#8b7eb8', paddingTop: 8 }}
                />
                {activeMetrics.includes('views') && <Bar dataKey="views" name="Views" fill="#00e5ff" radius={[2,2,0,0]} maxBarSize={32} />}
                {activeMetrics.includes('engagement') && <Bar dataKey="engagement" name="Engagement" fill="#ff2d78" radius={[2,2,0,0]} maxBarSize={32} />}
                {activeMetrics.includes('impressions') && <Bar dataKey="impressions" name="Impressions" fill="#b44eff" radius={[2,2,0,0]} maxBarSize={32} />}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="win95-window">
        <div className="win95-titlebar" style={{ background: 'linear-gradient(90deg, #001a20, #003040)' }}>
          <span className="win95-title">📋 POST STATS — click cells to edit</span>
        </div>
        <div className="analytics-table-wrap">
          <div className="analytics-table-header">
            <div>TITLE</div>
            <div>SHOW</div>
            <div>TYPE</div>
            <div>VIEWS</div>
            <div>ENGAGEMENT</div>
            <div>IMPRESSIONS</div>
          </div>
          {filteredPosts.length === 0 ? (
            <div className="empty-analytics" style={{ padding: 24 }}>No posts match the current filters</div>
          ) : (
            filteredPosts.map(post => (
              <div key={post.id} className="analytics-row">
                <div className="analytics-cell">
                  <div className="analytics-cell-text">{post.title}</div>
                  <div className="analytics-cell-sub">{post.date} · {post.platform}</div>
                </div>
                <div className="analytics-cell">
                  <div className="analytics-cell-text" style={{ fontSize: 9 }}>{post.show}</div>
                </div>
                <div className="analytics-cell">
                  <div className="analytics-cell-text">{post.mediaType || '—'}</div>
                  {post.episodeNumber && <div className="analytics-cell-sub">{post.episodeNumber}</div>}
                </div>
                {['views', 'engagement', 'impressions'].map(field => (
                  <div key={field} className="analytics-cell">
                    <input
                      type="number"
                      className="stat-input"
                      value={post.stats?.[field] ?? ''}
                      placeholder="—"
                      onChange={e => handleStatChange(post.id, field, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
