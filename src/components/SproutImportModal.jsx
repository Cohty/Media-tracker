import { useState, useEffect } from 'react'
import { SHOWS, matchTagToShow } from '../constants'

const OUR_SHOWS = SHOWS.map(s => s.name)

export default function SproutImportModal({ isOpen, onClose, onDone }) {
  const [days, setDays] = useState(365)
  const [videoOnly, setVideoOnly] = useState(true)
  const [sproutTags, setSproutTags] = useState([])
  const [tagMappings, setTagMappings] = useState({})
  const [tagsLoading, setTagsLoading] = useState(false)
  const [step, setStep] = useState('config')
  const [msg, setMsg] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (isOpen && sproutTags.length === 0) loadTags()
  }, [isOpen])

  async function loadTags() {
    setTagsLoading(true)
    try {
      const res = await fetch('/api/sprout-tags')
      if (res.ok) {
        const data = await res.json()
        const tags = (data?.data || []).filter(t => t.active)
        setSproutTags(tags)
        // Auto-match by keyword
        const auto = {}
        tags.forEach(tag => {
          const match = matchTagToShow(tag.text)
          auto[tag.tag_id] = match || 'Unassigned'
        })
        setTagMappings(auto)
      }
    } catch {}
    setTagsLoading(false)
  }

  async function handleImport() {
    setStep('loading'); setMsg('Connecting to Sprout…')
    try {
      const mappedTags = Object.entries(tagMappings)
        .filter(([, show]) => show && show !== 'Unassigned')
        .map(([tagId, showName]) => ({ tagId: Number(tagId), showName }))

      const res = await fetch('/api/sprout-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, videoOnly, tagMappings: mappedTags, useTagMapping: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setResult(data); setStep('done'); onDone()
    } catch (err) { setMsg(err.message); setStep('error') }
  }

  if (!isOpen) return null

  const autoMatched = sproutTags.filter(t => matchTagToShow(t.text))
  const unmatched = sproutTags.filter(t => !matchTagToShow(t.text))

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-titlebar" style={{ background: 'linear-gradient(90deg, #003020, #006040)' }}>
          <span className="modal-titlebar-text">📥 Import from Sprout Social</span>
          <div className="modal-titlebar-controls">
            <button className="modal-ctrl" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body">
          {step === 'config' && (
            <>
              <div className="field">
                <label>Content type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className={`metric-btn${videoOnly ? ' active' : ''}`}
                    style={videoOnly ? { color: 'var(--cyan)', borderColor: 'rgba(0,229,255,0.4)' } : {}}
                    onClick={() => setVideoOnly(true)}>🎬 Video only</button>
                  <button className={`metric-btn${!videoOnly ? ' active' : ''}`}
                    style={!videoOnly ? { color: 'var(--purple)', borderColor: 'rgba(180,78,255,0.4)' } : {}}
                    onClick={() => setVideoOnly(false)}>All posts</button>
                </div>
              </div>

              <div className="field">
                <label>How far back</label>
                <select style={{ width:'100%', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'8px 10px', fontFamily:'DM Mono', fontSize:12, color:'var(--text)', outline:'none', appearance:'none', cursor:'pointer' }}
                  value={days} onChange={e => setDays(Number(e.target.value))}>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={180}>Last 6 months</option>
                  <option value={365}>Last 1 year</option>
                  <option value={730}>Last 2 years</option>
                </select>
              </div>

              {/* Tag matching status */}
              <div className="field">
                <label>
                  Show matching
                  {tagsLoading && <span style={{ color:'var(--text3)', marginLeft:8 }}>loading tags…</span>}
                </label>

                {!tagsLoading && sproutTags.length > 0 && (
                  <>
                    {/* Auto-matched */}
                    {autoMatched.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--green)', marginBottom:5 }}>
                          ✓ AUTO-MATCHED ({autoMatched.length})
                        </div>
                        {autoMatched.map(tag => (
                          <div key={tag.tag_id} className="tag-mapping-row">
                            <span className="tag-mapping-name">{tag.text}</span>
                            <span style={{ color:'var(--text3)', fontSize:9 }}>→</span>
                            <select className="tag-mapping-select"
                              value={tagMappings[tag.tag_id] || 'Unassigned'}
                              onChange={e => setTagMappings(p => ({ ...p, [tag.tag_id]: e.target.value }))}>
                              <option value="Unassigned">— Unassigned —</option>
                              {OUR_SHOWS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Unmatched tags */}
                    {unmatched.length > 0 && (
                      <div>
                        <div style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--yellow)', marginBottom:5 }}>
                          ⚠ NEEDS MAPPING ({unmatched.length})
                        </div>
                        {unmatched.map(tag => (
                          <div key={tag.tag_id} className="tag-mapping-row">
                            <span className="tag-mapping-name">{tag.text}</span>
                            <span style={{ color:'var(--text3)', fontSize:9 }}>→</span>
                            <select className="tag-mapping-select"
                              value={tagMappings[tag.tag_id] || 'Unassigned'}
                              onChange={e => setTagMappings(p => ({ ...p, [tag.tag_id]: e.target.value }))}>
                              <option value="Unassigned">— Unassigned —</option>
                              {OUR_SHOWS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="field-hint" style={{ marginTop:8 }}>
                      Posts without a matched tag → Unassigned column (use Edit to reassign)
                    </div>
                  </>
                )}

                {!tagsLoading && sproutTags.length === 0 && (
                  <div style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--text3)', padding:'6px 0' }}>
                    No Sprout tags found — all posts will go to Unassigned column.
                  </div>
                )}
              </div>
            </>
          )}

          {step === 'loading' && (
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              <div style={{ fontFamily:'DM Mono', fontSize:10, color:'var(--cyan)', marginBottom:10 }}>{msg}</div>
              <div style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--text3)' }}>This may take a minute for large date ranges…</div>
            </div>
          )}

          {step === 'done' && result && (
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              <div style={{ fontFamily:'VT323', fontSize:52, color:'var(--green)', textShadow:'0 0 12px var(--green)', marginBottom:6 }}>{result.imported}</div>
              <div style={{ fontFamily:'DM Mono', fontSize:10, color:'var(--green)', marginBottom:14 }}>posts imported</div>
              <div style={{ display:'flex', gap:16, justifyContent:'center' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'VT323', fontSize:28, color:'var(--cyan)' }}>{result.tagged}</div>
                  <div style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--text3)' }}>tag-matched</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'VT323', fontSize:28, color:'var(--yellow)' }}>{result.unassigned}</div>
                  <div style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--text3)' }}>unassigned</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'VT323', fontSize:28, color:'var(--text3)' }}>{result.skipped}</div>
                  <div style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--text3)' }}>skipped</div>
                </div>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div style={{ fontFamily:'DM Mono', fontSize:10, color:'var(--pink)', padding:'16px 0', lineHeight:1.6 }}>{msg}</div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>{step === 'done' ? 'Close' : 'Cancel'}</button>
          {step === 'config' && (
            <button className="btn-primary"
              style={{ background:'var(--green)', color:'#000', boxShadow:'var(--win-out), 0 0 12px rgba(57,255,140,0.3)' }}
              onClick={handleImport}>IMPORT POSTS</button>
          )}
        </div>
      </div>
    </div>
  )
}
