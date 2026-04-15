import { useState, useEffect, useCallback } from 'react'
import { SHOWS, PLATFORMS } from '../constants'

const ACTION_LABELS = { add: 'New Post', edit: 'Edit', delete: 'Delete' }
const ACTION_COLORS = {
  add:    { color: '#39ff8c', bg: 'rgba(57,255,140,0.1)',  border: 'rgba(57,255,140,0.3)' },
  edit:   { color: '#00e5ff', bg: 'rgba(0,229,255,0.1)',   border: 'rgba(0,229,255,0.3)' },
  delete: { color: '#ff2d78', bg: 'rgba(255,45,120,0.1)',  border: 'rgba(255,45,120,0.3)' },
}

export default function ReviewPanel({ onClose, onApproved }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(null) // { id, decision }
  const [note, setNote] = useState('')

  const fetchPending = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pending')
      if (res.ok) setItems(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPending() }, [fetchPending])

  async function handleReview(id, decision) {
    await fetch(`/api/pending/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, note }),
    })
    setReviewing(null)
    setNote('')
    setItems(prev => prev.filter(p => p.id !== id))
    if (decision === 'approve') onApproved()
  }

  const showColors = Object.fromEntries(SHOWS.map(s => [s.name, s.hex]))

  return (
    <div className={`overlay open`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-titlebar" style={{ background: 'linear-gradient(90deg, #400000, #900020)' }}>
          <span className="modal-titlebar-text">🔍 REVIEW QUEUE — pending approvals</span>
          <div className="modal-titlebar-controls">
            <button className="modal-ctrl" onClick={onClose}>×</button>
          </div>
        </div>

        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: 32, textAlign: 'center', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text3)' }}>
              Loading pending submissions…
            </div>
          )}

          {!loading && items.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>✓</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text3)' }}>All clear — no pending submissions</div>
            </div>
          )}

          {!loading && items.map(item => {
            const ac = ACTION_COLORS[item.action] || ACTION_COLORS.add
            const p = item.payload
            const orig = item.originalPost
            const isReviewing = reviewing?.id === item.id

            return (
              <div key={item.id} className="review-item">
                <div className="review-item-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="p-pill" style={{ background: ac.bg, color: ac.color, borderColor: ac.border }}>
                      {ACTION_LABELS[item.action]}
                    </span>
                    <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>
                      by {item.submittedBy} · {new Date(item.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="review-item-body">
                  {item.action === 'add' && (
                    <>
                      <div style={{ fontFamily: 'Syne', fontSize: 12, color: 'var(--text)', marginBottom: 4 }}>{p.title}</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 5 }}>
                        {p.show && <span className="p-pill" style={{ background: (showColors[p.show] || '#b44eff') + '22', color: showColors[p.show] || '#b44eff' }}>{p.show}</span>}
                        {p.platform && (() => { const pm = PLATFORMS[p.platform] || PLATFORMS.Other; return <span className="p-pill" style={{ background: pm.bg, color: pm.color }}>{p.platform}</span> })()}
                        {p.mediaType && <span className="p-pill" style={{ background: 'rgba(180,78,255,0.08)', color: 'var(--purple)' }}>{p.mediaType}</span>}
                        {p.episodeNumber && <span className="p-pill ep-pill">{p.episodeNumber}</span>}
                      </div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--cyan)' }}>
                        <a href={p.url} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>{p.url?.slice(0, 60)}{p.url?.length > 60 ? '…' : ''} ↗</a>
                      </div>
                    </>
                  )}

                  {item.action === 'edit' && orig && (
                    <div style={{ fontFamily: 'DM Mono', fontSize: 9 }}>
                      <div style={{ color: 'var(--text2)', marginBottom: 4 }}>Editing: <span style={{ color: 'var(--text)' }}>{orig.title}</span></div>
                      {Object.entries(p).filter(([k]) => k !== 'stats').map(([k, v]) => (
                        <div key={k} style={{ color: 'var(--text3)', marginBottom: 2 }}>
                          <span style={{ color: 'var(--cyan)' }}>{k}</span> → <span style={{ color: 'var(--yellow)' }}>{String(v)}</span>
                        </div>
                      ))}
                      {p.stats && Object.entries(p.stats).map(([k, v]) => (
                        <div key={k} style={{ color: 'var(--text3)', marginBottom: 2 }}>
                          <span style={{ color: 'var(--cyan)' }}>stats.{k}</span> → <span style={{ color: 'var(--yellow)' }}>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.action === 'delete' && orig && (
                    <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--pink)' }}>
                      Requesting deletion of: <span style={{ color: 'var(--text)' }}>{orig.title}</span>
                    </div>
                  )}
                </div>

                {isReviewing ? (
                  <div className="review-actions-confirm">
                    <input
                      className="review-note-input"
                      placeholder="Optional note to submitter…"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button className="del-no" style={{ flex: 1 }} onClick={() => setReviewing(null)}>Cancel</button>
                      {reviewing.decision === 'approve'
                        ? <button className="del-yes" style={{ flex: 1, background: 'none', borderColor: 'var(--green)', color: 'var(--green)' }}
                            onClick={() => handleReview(item.id, 'approve')}>
                            Confirm Approve
                          </button>
                        : <button className="del-yes" style={{ flex: 1 }}
                            onClick={() => handleReview(item.id, 'reject')}>
                            Confirm Reject
                          </button>
                      }
                    </div>
                  </div>
                ) : (
                  <div className="review-item-footer">
                    <button className="review-reject-btn" onClick={() => { setNote(''); setReviewing({ id: item.id, decision: 'reject' }) }}>
                      ✕ Reject
                    </button>
                    <button className="review-approve-btn" onClick={() => { setNote(''); setReviewing({ id: item.id, decision: 'approve' }) }}>
                      ✓ Approve
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
