import { useState, useEffect } from 'react'
import { getAuthHeaders } from '../hooks/useUser'
import { SHOWS } from '../constants'

const SHOW_COLORS = Object.fromEntries(SHOWS.map(s => [s.name, s.hex]))

export default function ImportSummaryModal({ logId, isOpen, onClose }) {
  const [log, setLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!isOpen || !logId) return
    setLoading(true)
    fetch(`/api/import-log/${logId}`)
      .then(r => r.json())
      .then(data => { setLog(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [isOpen, logId])

  if (!isOpen) return null

  const posts = log?.posts || []
  const filtered = filter === 'all' ? posts : posts.filter(p => p.show_name === filter)
  const shows = [...new Set(posts.map(p => p.show_name))]

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-titlebar" style={{ background: 'linear-gradient(90deg, #001a40, #003080)' }}>
          <span className="modal-titlebar-text">📋 Import Summary</span>
          <div className="modal-titlebar-controls">
            <button className="modal-ctrl" onClick={onClose}>×</button>
          </div>
        </div>
        <div style={{ maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text3)' }}>
              Loading summary…
            </div>
          ) : !log ? (
            <div style={{ padding: 32, textAlign: 'center', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--pink)' }}>
              Summary not found
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                {[
                  { label: 'Imported', val: log.imported, color: 'var(--green)' },
                  { label: 'Tag-matched', val: log.tagged, color: 'var(--cyan)' },
                  { label: 'Unassigned', val: log.unassigned, color: 'var(--yellow)' },
                  { label: 'Skipped', val: log.skipped, color: 'var(--text3)' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'VT323', fontSize: 32, color, lineHeight: 1 }}>{val}</div>
                    <div style={{ fontFamily: 'DM Mono', fontSize: 8, color: 'var(--text3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* By show breakdown */}
              {log.by_show && Object.keys(log.by_show).length > 0 && (
                <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setFilter('all')}
                    className="metric-btn"
                    style={filter === 'all' ? { color: 'var(--purple)', borderColor: 'rgba(180,78,255,0.4)' } : {}}
                  >All ({posts.length})</button>
                  {Object.entries(log.by_show).sort((a,b) => b[1]-a[1]).map(([show, count]) => (
                    <button key={show} onClick={() => setFilter(show)}
                      className="metric-btn"
                      style={filter === show ? { color: SHOW_COLORS[show] || 'var(--purple)', borderColor: (SHOW_COLORS[show] || '#b44eff') + '55' } : {}}>
                      {show} ({count})
                    </button>
                  ))}
                </div>
              )}

              {/* Post list */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text3)' }}>No posts</div>
                ) : filtered.map(post => (
                  <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: SHOW_COLORS[post.show_name] || 'var(--text3)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {post.title}
                      </div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 8, color: 'var(--text3)', marginTop: 2 }}>
                        {post.show_name} · {post.platform} · {post.media_type}
                        {post.episode_number ? ` · EP ${post.episode_number}` : ''}
                      </div>
                    </div>
                    <a href={post.url} target="_blank" rel="noreferrer"
                      style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--cyan)', textDecoration: 'none', flexShrink: 0 }}>↗</a>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
