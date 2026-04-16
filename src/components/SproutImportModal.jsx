import { useState } from 'react'
import { SHOWS } from '../constants'
import { importFromSprout } from '../hooks/useSprout'

export default function SproutImportModal({ isOpen, onClose, onDone }) {
  const [days, setDays] = useState(365)
  const [showName, setShowName] = useState('Standalones')
  const [videoOnly, setVideoOnly] = useState(true)
  const [status, setStatus] = useState(null)
  const [result, setResult] = useState(null)
  const [msg, setMsg] = useState('')

  async function handleImport() {
    setStatus('loading')
    setMsg('Connecting to Sprout…')
    try {
      const data = await importFromSprout(days, showName, videoOnly, m => setMsg(m))
      setResult(data)
      setStatus('done')
      onDone()
    } catch (err) {
      setMsg(err.message)
      setStatus('error')
    }
  }

  if (!isOpen) return null

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-titlebar" style={{ background: 'linear-gradient(90deg, #003020, #006040)' }}>
          <span className="modal-titlebar-text">📥 Import from Sprout Social</span>
          <div className="modal-titlebar-controls">
            <button className="modal-ctrl" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body">
          {status === null && (
            <>
              <p style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.8 }}>
                Pulls posts from Sprout and creates cards with stats pre-filled. Existing posts won't be duplicated.
              </p>

              <div className="field">
                <label>Content type</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                  <button
                    className={`metric-btn${videoOnly ? ' active' : ''}`}
                    style={videoOnly ? { color: 'var(--cyan)', borderColor: 'rgba(0,229,255,0.4)' } : {}}
                    onClick={() => setVideoOnly(true)}
                  >
                    🎬 Video only (YouTube, TikTok)
                  </button>
                  <button
                    className={`metric-btn${!videoOnly ? ' active' : ''}`}
                    style={!videoOnly ? { color: 'var(--purple)', borderColor: 'rgba(180,78,255,0.4)' } : {}}
                    onClick={() => setVideoOnly(false)}
                  >
                    All posts
                  </button>
                </div>
              </div>

              <div className="field">
                <label>How far back</label>
                <select style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px', fontFamily: 'DM Mono', fontSize: 12, color: 'var(--text)', outline: 'none', boxShadow: 'var(--win-in)', appearance: 'none', cursor: 'pointer' }}
                  value={days} onChange={e => setDays(Number(e.target.value))}>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={180}>Last 6 months</option>
                  <option value={365}>Last 1 year</option>
                  <option value={730}>Last 2 years</option>
                </select>
              </div>

              <div className="field">
                <label>Assign to show</label>
                <select style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px', fontFamily: 'DM Mono', fontSize: 12, color: 'var(--text)', outline: 'none', boxShadow: 'var(--win-in)', appearance: 'none', cursor: 'pointer' }}
                  value={showName} onChange={e => setShowName(e.target.value)}>
                  {SHOWS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
                <div className="field-hint">Use Edit on any card to reassign shows after import</div>
              </div>
            </>
          )}

          {status === 'loading' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--cyan)', marginBottom: 10 }}>{msg}</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>This may take a minute for large date ranges…</div>
            </div>
          )}

          {status === 'done' && result && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontFamily: 'VT323', fontSize: 52, color: 'var(--green)', textShadow: '0 0 12px var(--green)', marginBottom: 6 }}>
                {result.imported}
              </div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--green)', marginBottom: 12 }}>posts imported</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>
                {result.fetched} fetched · {result.skipped} already existed or skipped
              </div>
            </div>
          )}

          {status === 'error' && (
            <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--pink)', padding: '16px 0', lineHeight: 1.6 }}>{msg}</div>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>{status === 'done' ? 'Close' : 'Cancel'}</button>
          {status === null && (
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
