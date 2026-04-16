import { useState } from 'react'
import { SHOWS } from '../constants'
import { importFromSprout } from '../hooks/useSprout'

export default function SproutImportModal({ isOpen, onClose, onDone }) {
  const [days, setDays] = useState(365)
  const [showName, setShowName] = useState('Standalones')
  const [status, setStatus] = useState(null) // null | 'loading' | 'done' | 'error'
  const [result, setResult] = useState(null)
  const [msg, setMsg] = useState('')

  async function handleImport() {
    setStatus('loading')
    setMsg('Connecting to Sprout…')
    try {
      const data = await importFromSprout(days, showName, m => setMsg(m))
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
                Pulls all posts from Sprout Social and creates cards for each one with stats pre-filled.
                Existing posts won't be duplicated.
              </p>
              <div className="field">
                <label>How far back</label>
                <select className="filter-select" style={{ width: '100%' }} value={days} onChange={e => setDays(Number(e.target.value))}>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={180}>Last 6 months</option>
                  <option value={365}>Last 1 year</option>
                  <option value={730}>Last 2 years</option>
                </select>
              </div>
              <div className="field">
                <label>Assign to show</label>
                <select className="filter-select" style={{ width: '100%' }} value={showName} onChange={e => setShowName(e.target.value)}>
                  {SHOWS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
                <div className="field-hint">You can move cards to the right show after import using the Edit button</div>
              </div>
            </>
          )}
          {status === 'loading' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--cyan)', marginBottom: 12 }}>{msg}</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>This may take a minute for large date ranges…</div>
            </div>
          )}
          {status === 'done' && result && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontFamily: 'VT323', fontSize: 48, color: 'var(--green)', textShadow: '0 0 12px var(--green)', marginBottom: 8 }}>
                {result.imported}
              </div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--green)', marginBottom: 12 }}>posts imported</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>
                {result.fetched} fetched from Sprout · {result.skipped} already existed
              </div>
            </div>
          )}
          {status === 'error' && (
            <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--pink)', padding: '16px 0' }}>{msg}</div>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            {status === 'done' ? 'Close' : 'Cancel'}
          </button>
          {status === null && (
            <button className="btn-primary" style={{ background: 'var(--green)', color: '#000', boxShadow: 'var(--win-out), 0 0 12px rgba(57,255,140,0.3)' }}
              onClick={handleImport}>
              IMPORT POSTS
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
