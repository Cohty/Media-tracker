import { useState, useEffect } from 'react'
import { SHOWS } from '../constants'

const OUR_SHOWS = SHOWS.map(s => s.name)

export default function SproutImportModal({ isOpen, onClose, onDone }) {
  const [step, setStep] = useState('config') // config | mapping | loading | done | error
  const [days, setDays] = useState(365)
  const [videoOnly, setVideoOnly] = useState(true)
  const [sproutTags, setSproutTags] = useState([])
  const [tagsLoading, setTagsLoading] = useState(false)
  const [tagMappings, setTagMappings] = useState({}) // tagId → showName
  const [useTagMapping, setUseTagMapping] = useState(false)
  const [defaultShow, setDefaultShow] = useState('Standalones')
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

        // Auto-match tags to shows by fuzzy name comparison
        const auto = {}
        tags.forEach(tag => {
          const tagLower = tag.text.toLowerCase()
          const match = OUR_SHOWS.find(show => {
            const showLower = show.toLowerCase()
            return showLower.includes(tagLower) || tagLower.includes(showLower) ||
              // Match key words
              showLower.split(' ').some(w => w.length > 3 && tagLower.includes(w)) ||
              tagLower.split(' ').some(w => w.length > 3 && showLower.includes(w))
          })
          if (match) auto[tag.tag_id] = match
        })
        setTagMappings(auto)
        if (tags.length > 0) setUseTagMapping(true)
      }
    } catch {}
    setTagsLoading(false)
  }

  async function handleImport() {
    setStep('loading')
    setMsg('Connecting to Sprout…')

    try {
      const mappedTags = useTagMapping
        ? Object.entries(tagMappings)
            .filter(([, show]) => show && show !== 'skip')
            .map(([tagId, show]) => ({ tagId: Number(tagId), showName: show }))
        : []

      const res = await fetch('/api/sprout-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days,
          defaultShow,
          videoOnly,
          tagMappings: mappedTags,
          useTagMapping,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setResult(data)
      setStep('done')
      onDone()
    } catch (err) {
      setMsg(err.message)
      setStep('error')
    }
  }

  function setMapping(tagId, showName) {
    setTagMappings(prev => ({ ...prev, [tagId]: showName }))
  }

  if (!isOpen) return null

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-titlebar" style={{ background: 'linear-gradient(90deg, #003020, #006040)' }}>
          <span className="modal-titlebar-text">📥 Import from Sprout Social</span>
          <div className="modal-titlebar-controls">
            <button className="modal-ctrl" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body">

          {(step === 'config' || step === 'mapping') && (
            <>
              {/* Content type */}
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

              {/* Date range */}
              <div className="field">
                <label>How far back</label>
                <select style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px', fontFamily: 'DM Mono', fontSize: 12, color: 'var(--text)', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                  value={days} onChange={e => setDays(Number(e.target.value))}>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={180}>Last 6 months</option>
                  <option value={365}>Last 1 year</option>
                  <option value={730}>Last 2 years</option>
                </select>
              </div>

              {/* Tag mapping section */}
              <div className="field">
                <label>
                  Tag → Show mapping
                  {tagsLoading && <span style={{ color: 'var(--text3)', marginLeft: 8 }}>loading tags…</span>}
                  {!tagsLoading && sproutTags.length > 0 && (
                    <span style={{ color: 'var(--green)', marginLeft: 8 }}>{sproutTags.length} tags found</span>
                  )}
                </label>

                {!tagsLoading && sproutTags.length > 0 && (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <button className={`metric-btn${useTagMapping ? ' active' : ''}`}
                        style={useTagMapping ? { color: 'var(--green)', borderColor: 'rgba(57,255,140,0.4)' } : {}}
                        onClick={() => setUseTagMapping(true)}>Use tag mapping</button>
                      <button className={`metric-btn${!useTagMapping ? ' active' : ''}`}
                        style={!useTagMapping ? { color: 'var(--yellow)', borderColor: 'rgba(240,224,64,0.4)' } : {}}
                        onClick={() => setUseTagMapping(false)}>Ignore tags</button>
                    </div>

                    {useTagMapping && (
                      <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {sproutTags.map(tag => (
                          <div key={tag.tag_id} style={{ display: 'flex', alignItems: 'center', gap: 8,
                            background: 'var(--surface2)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)', padding: '6px 10px', boxShadow: 'var(--win-in)' }}>
                            <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {tag.text}
                            </span>
                            <span style={{ color: 'var(--text3)', fontSize: 10 }}>→</span>
                            <select
                              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 2, padding: '3px 6px', fontFamily: 'DM Mono', fontSize: 9, color: tagMappings[tag.tag_id] && tagMappings[tag.tag_id] !== 'skip' ? 'var(--green)' : 'var(--text3)', outline: 'none', cursor: 'pointer' }}
                              value={tagMappings[tag.tag_id] || 'skip'}
                              onChange={e => setMapping(tag.tag_id, e.target.value)}
                            >
                              <option value="skip">— skip —</option>
                              {OUR_SHOWS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="field-hint" style={{ marginTop: 6 }}>
                      {useTagMapping
                        ? `Posts with mapped tags → assigned show. Posts without tags → default show below.`
                        : 'All posts will go to the default show below.'}
                    </div>
                  </>
                )}

                {!tagsLoading && sproutTags.length === 0 && (
                  <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)', padding: '8px 0' }}>
                    No tags found in Sprout — all posts will go to the default show.
                  </div>
                )}
              </div>

              {/* Default show */}
              <div className="field">
                <label>Default show <span style={{ color: 'var(--text3)' }}>(for untagged posts)</span></label>
                <select style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px', fontFamily: 'DM Mono', fontSize: 12, color: 'var(--text)', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                  value={defaultShow} onChange={e => setDefaultShow(e.target.value)}>
                  {OUR_SHOWS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </>
          )}

          {step === 'loading' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--cyan)', marginBottom: 10 }}>{msg}</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>This may take a minute…</div>
            </div>
          )}

          {step === 'done' && result && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontFamily: 'VT323', fontSize: 52, color: 'var(--green)', textShadow: '0 0 12px var(--green)', marginBottom: 6 }}>{result.imported}</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--green)', marginBottom: 12 }}>posts imported</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>
                {result.fetched} fetched · {result.skipped} skipped · {result.tagged || 0} tag-matched
              </div>
            </div>
          )}

          {step === 'error' && (
            <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--pink)', padding: '16px 0', lineHeight: 1.6 }}>{msg}</div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>{step === 'done' ? 'Close' : 'Cancel'}</button>
          {(step === 'config' || step === 'mapping') && (
            <button className="btn-primary"
              style={{ background: 'var(--green)', color: '#000', boxShadow: 'var(--win-out), 0 0 12px rgba(57,255,140,0.3)' }}
              onClick={handleImport}>
              IMPORT POSTS
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
