import { useState, useEffect, useCallback } from 'react'
import { SHOWS, PLATFORMS, MEDIA_TYPES } from '../constants'

const ACTION_LABELS = { add: 'New Post', edit: 'Edit', delete: 'Delete' }
const ACTION_COLORS = {
  add:    { color: '#39ff8c', bg: 'rgba(57,255,140,0.1)',  border: 'rgba(57,255,140,0.3)' },
  edit:   { color: '#00e5ff', bg: 'rgba(0,229,255,0.1)',   border: 'rgba(0,229,255,0.3)' },
  delete: { color: '#ff2d78', bg: 'rgba(255,45,120,0.1)',  border: 'rgba(255,45,120,0.3)' },
}
const ALL_SHOWS = [...SHOWS.map(s => s.name), 'Newsroom', 'Editorials', 'Unassigned']
const showColors = Object.fromEntries(SHOWS.map(s => [s.name, s.hex]))

export default function ReviewPanel({ onClose, onApproved }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [editingId, setEditingId] = useState(null)
  const [editPayload, setEditPayload] = useState({})
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(null) // { ids, decision }

  const fetchPending = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pending')
      if (res.ok) setItems(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPending() }, [fetchPending])

  async function handleReview(ids, decision, payload) {
    for (const id of ids) {
      await fetch(`/api/pending/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note, overridePayload: payload }),
      })
    }
    setItems(prev => prev.filter(p => !ids.includes(p.id)))
    setSelected(new Set())
    setConfirming(null)
    setEditingId(null)
    setNote('')
    if (decision === 'approve') onApproved()
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function selectAll() {
    setSelected(new Set(items.map(i => i.id)))
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEditPayload({ ...item.payload })
  }

  function saveEdit(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, payload: editPayload } : i))
    setEditingId(null)
  }

  const allSelected = items.length > 0 && selected.size === items.length

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 620, width: '95vw' }}>
        <div className="modal-titlebar" style={{ background: 'linear-gradient(90deg, #400000, #900020)' }}>
          <span className="modal-titlebar-text">🔍 REVIEW QUEUE — pending approvals</span>
          <div className="modal-titlebar-controls">
            <button className="modal-ctrl" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Batch action bar */}
        {items.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px',
            borderBottom:'1px solid var(--border)', background:'var(--surface2)' }}>
            <input type="checkbox" checked={allSelected}
              onChange={() => allSelected ? setSelected(new Set()) : selectAll()}
              style={{ cursor:'pointer' }} />
            <span style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--text3)' }}>
              {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
            </span>
            {selected.size > 0 && (
              <>
                <div style={{ flex:1 }} />
                <button className="metric-btn"
                  style={{ color:'var(--green)', borderColor:'rgba(57,255,140,0.4)' }}
                  onClick={() => setConfirming({ ids: [...selected], decision: 'approve' })}>
                  ✓ Approve {selected.size}
                </button>
                <button className="metric-btn"
                  style={{ color:'var(--pink)', borderColor:'rgba(255,45,120,0.4)' }}
                  onClick={() => setConfirming({ ids: [...selected], decision: 'reject' })}>
                  ✕ Reject {selected.size}
                </button>
              </>
            )}
          </div>
        )}

        {/* Confirm dialog for batch */}
        {confirming && (
          <div style={{ padding:'12px 16px', background:'rgba(255,45,120,0.05)',
            borderBottom:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ fontFamily:'DM Mono', fontSize:10, color:'var(--text)' }}>
              {confirming.decision === 'approve'
                ? `✓ Approve ${confirming.ids.length} submission${confirming.ids.length > 1 ? 's' : ''}?`
                : `✕ Reject ${confirming.ids.length} submission${confirming.ids.length > 1 ? 's' : ''}?`}
            </div>
            <input placeholder="Optional note to submitter…" value={note}
              onChange={e => setNote(e.target.value)}
              style={{ fontFamily:'DM Mono', fontSize:9, padding:'5px 10px',
                background:'var(--surface2)', border:'1px solid var(--border)',
                borderRadius:'var(--radius)', color:'var(--text)', outline:'none' }} />
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-ghost" onClick={() => setConfirming(null)}>Cancel</button>
              <button className="btn-primary"
                style={confirming.decision === 'approve'
                  ? { background:'none', borderColor:'var(--green)', color:'var(--green)', boxShadow:'none' }
                  : {}}
                onClick={() => handleReview(confirming.ids, confirming.decision)}>
                Confirm
              </button>
            </div>
          </div>
        )}

        <div style={{ maxHeight:'65vh', overflowY:'auto' }}>
          {loading && (
            <div style={{ padding:32, textAlign:'center', fontFamily:'DM Mono', fontSize:10, color:'var(--text3)' }}>
              Loading pending submissions…
            </div>
          )}
          {!loading && items.length === 0 && (
            <div style={{ padding:32, textAlign:'center' }}>
              <div style={{ fontSize:24, marginBottom:10 }}>✓</div>
              <div style={{ fontFamily:'DM Mono', fontSize:10, color:'var(--text3)' }}>All clear — no pending submissions</div>
            </div>
          )}

          {!loading && items.map(item => {
            const ac = ACTION_COLORS[item.action] || ACTION_COLORS.add
            const p = item.payload
            const orig = item.originalPost
            const isEditing = editingId === item.id
            const isSelected = selected.has(item.id)

            return (
              <div key={item.id} className="review-item"
                style={{ background: isSelected ? 'rgba(0,229,255,0.04)' : undefined,
                  borderLeft: isSelected ? '2px solid rgba(0,229,255,0.4)' : '2px solid transparent' }}>

                <div className="review-item-header" style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)}
                    onClick={e => e.stopPropagation()} style={{ cursor:'pointer', flexShrink:0 }} />
                  <span className="p-pill" style={{ background:ac.bg, color:ac.color, borderColor:ac.border }}>
                    {ACTION_LABELS[item.action]}
                  </span>
                  <span style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--text3)' }}>
                    by {item.submittedBy} · {new Date(item.submittedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </span>
                </div>

                <div className="review-item-body">
                  {/* EDIT MODE */}
                  {isEditing ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'8px 0' }}>
                      <div style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--cyan)', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.8px' }}>
                        Editing submission before approval
                      </div>
                      {item.action === 'add' && (
                        <>
                          <div className="field">
                            <label>Title</label>
                            <input value={editPayload.title || ''} onChange={e => setEditPayload(p => ({...p, title: e.target.value}))} />
                          </div>
                          <div className="field">
                            <label>URL</label>
                            <input value={editPayload.url || ''} onChange={e => setEditPayload(p => ({...p, url: e.target.value}))} />
                          </div>
                        </>
                      )}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                        <div className="field">
                          <label>Show</label>
                          <select value={editPayload.show || ''} onChange={e => setEditPayload(p => ({...p, show: e.target.value}))}>
                            {ALL_SHOWS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="field">
                          <label>Media Type</label>
                          <select value={editPayload.mediaType || ''} onChange={e => setEditPayload(p => ({...p, mediaType: e.target.value}))}>
                            {MEDIA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="field">
                        <label>Episode / Label</label>
                        <input value={editPayload.episodeNumber || ''} onChange={e => setEditPayload(p => ({...p, episodeNumber: e.target.value}))} />
                      </div>
                      <div style={{ display:'flex', gap:8, marginTop:4 }}>
                        <button className="btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                        <button className="btn-primary" style={{ background:'none', borderColor:'var(--cyan)', color:'var(--cyan)', boxShadow:'none' }}
                          onClick={() => saveEdit(item.id)}>Save Changes</button>
                        <button className="btn-primary" style={{ background:'none', borderColor:'var(--green)', color:'var(--green)', boxShadow:'none', marginLeft:'auto' }}
                          onClick={() => { saveEdit(item.id); setTimeout(() => handleReview([item.id], 'approve', editPayload), 50) }}>
                          Save & Approve
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* VIEW MODE */
                    <>
                      {item.action === 'add' && (
                        <>
                          <div style={{ fontFamily:'Syne', fontSize:12, color:'var(--text)', marginBottom:4 }}>{p.title}</div>
                          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:5 }}>
                            {p.show && <span className="p-pill" style={{ background:(showColors[p.show]||'#b44eff')+'22', color:showColors[p.show]||'#b44eff' }}>{p.show}</span>}
                            {p.platform && (() => { const pm = PLATFORMS[p.platform]||PLATFORMS.Other; return <span className="p-pill" style={{ background:pm.bg, color:pm.color }}>{p.platform}</span> })()}
                            {p.mediaType && <span className="p-pill" style={{ background:'rgba(180,78,255,0.08)', color:'var(--purple)' }}>{p.mediaType}</span>}
                            {p.episodeNumber && <span className="p-pill ep-pill">{p.episodeNumber}</span>}
                          </div>
                          <a href={p.url} target="_blank" rel="noreferrer" style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--cyan)', textDecoration:'none' }}>
                            {p.url?.slice(0,60)}{p.url?.length > 60 ? '…' : ''} ↗
                          </a>
                        </>
                      )}
                      {item.action === 'edit' && orig && (
                        <div style={{ fontFamily:'DM Mono', fontSize:9 }}>
                          <div style={{ color:'var(--text2)', marginBottom:4 }}>Editing: <span style={{ color:'var(--text)' }}>{orig.title}</span></div>
                          {Object.entries(p).filter(([k]) => k !== 'stats').map(([k,v]) => (
                            <div key={k} style={{ color:'var(--text3)', marginBottom:2 }}>
                              <span style={{ color:'var(--cyan)' }}>{k}</span> → <span style={{ color:'var(--yellow)' }}>{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {item.action === 'delete' && orig && (
                        <div style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--pink)' }}>
                          Requesting deletion of: <span style={{ color:'var(--text)' }}>{orig.title}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!isEditing && (
                  <div className="review-item-footer" style={{ display:'flex', gap:6 }}>
                    {item.action !== 'delete' && (
                      <button className="review-reject-btn" style={{ color:'var(--cyan)', borderColor:'rgba(0,229,255,0.3)' }}
                        onClick={() => startEdit(item)}>
                        ✎ Edit
                      </button>
                    )}
                    <button className="review-reject-btn"
                      onClick={() => setConfirming({ ids: [item.id], decision: 'reject' })}>
                      ✕ Reject
                    </button>
                    <button className="review-approve-btn"
                      onClick={() => setConfirming({ ids: [item.id], decision: 'approve' })}>
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
