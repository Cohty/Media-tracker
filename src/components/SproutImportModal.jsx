import { useState, useEffect } from 'react'
import { getAuthHeaders } from '../hooks/useUser'
import { SHOWS, TAG_PREFIXES, COLLECTION_TO_SHOW } from '../constants'

const OUR_SHOWS = SHOWS.map(s => s.name)

const PLATFORM_OPTIONS = [
  { id: 'YouTube',   label: 'YouTube',   color: '#ff4444' },
  { id: 'X',         label: 'X / Twitter', color: '#c8c4e0' },
  { id: 'LinkedIn',  label: 'LinkedIn',  color: '#00a8ff' },
  { id: 'Instagram', label: 'Instagram', color: '#ff2d78' },
  { id: 'TikTok',    label: 'TikTok',    color: '#00e5ff' },
]

export default function SproutImportModal({ isOpen, onClose, onDone, onShowSummary }) {
  const [days, setDays] = useState(1)
  const [platforms, setPlatforms] = useState(['YouTube', 'X', 'LinkedIn', 'Instagram', 'TikTok'])
  const [step, setStep] = useState('config')
  const [msg, setMsg] = useState('')
  const [result, setResult] = useState(null)

  // Reset to config state every time modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('config')
      setMsg('')
      setResult(null)
    }
  }, [isOpen])

  function togglePlatform(id) {
    setPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  async function handleImport() {
    setStep('loading'); setMsg('Connecting to Sprout Social…')
    try {
      const res = await fetch('/api/sprout-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          days,
          videoOnly: false,
          filterPlatforms: platforms,
        }),
      })
      setMsg('Processing posts…')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setResult(data); setStep('done'); onDone()
    } catch (err) { setMsg(err.message); setStep('error') }
  }

  if (!isOpen) return null

  return (
    <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-titlebar" style={{ background: 'linear-gradient(90deg, #003020, #006040)' }}>
          <span className="modal-titlebar-text">📥 Import from Sprout Social</span>
          <div className="modal-titlebar-controls">
            <button className="modal-ctrl" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body">

          {step === 'done' && result?.logId && (
            <button className="btn-ghost" style={{ color: 'var(--cyan)' }}
              onClick={() => onShowSummary(result.logId)}>
              View Details
            </button>
          )}
          {step === 'config' && (
            <>
              {/* How it works */}
              <div style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: 'var(--radius)', padding: '10px 12px', marginBottom: 14 }}>
                <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--cyan)', marginBottom: 6, letterSpacing: '0.5px' }}>HOW MATCHING WORKS</div>
                <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)', lineHeight: 1.8 }}>
                  Posts are auto-sorted using Sprout tags:<br />
                  <span style={{ color: 'var(--yellow)' }}>TCB 73</span> → The Crypto Beat · EP 73<br />
                  <span style={{ color: 'var(--yellow)' }}>L1 01</span> → Layer One · EP 1<br />
                  <span style={{ color: 'var(--yellow)' }}>BBP 05</span> → Big Brain Podcast · EP 5<br />
                  <span style={{ color: 'var(--yellow)' }}>Editorials</span> → Editorials board<br />
                  Untagged posts → Unassigned column
                </div>
              </div>

              {/* Platforms */}
              <div className="field">
                <label>Platforms to import</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {PLATFORM_OPTIONS.map(p => (
                    <button key={p.id}
                      className={`metric-btn${platforms.includes(p.id) ? ' active' : ''}`}
                      style={platforms.includes(p.id) ? { color: p.color, borderColor: p.color + '55' } : {}}
                      onClick={() => togglePlatform(p.id)}>
                      {p.label}
                    </button>
                  ))}
                  <button
                    className="metric-btn"
                    style={{ marginLeft: 4, color: 'var(--green)', borderColor: 'rgba(57,255,140,0.4)', background: 'rgba(57,255,140,0.06)' }}
                    onClick={() => setPlatforms(platforms.length === PLATFORM_OPTIONS.length ? [] : PLATFORM_OPTIONS.map(p => p.id))}>
                    {platforms.length === PLATFORM_OPTIONS.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="field-hint">All platforms selected by default</div>
              </div>

              {/* Date range */}
              <div className="field">
                <label>How far back</label>
                <select style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px', fontFamily: 'DM Mono', fontSize: 12, color: 'var(--text)', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                  value={days} onChange={e => setDays(Number(e.target.value))}>
                  <option value={1}>Last 24 hours</option>
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 2 weeks</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={180}>Last 6 months</option>
                  <option value={365}>Last 1 year</option>
                  <option value={730}>Last 2 years</option>
                </select>
              </div>

              {platforms.length === 0 && (
                <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--pink)', marginTop: 4 }}>
                  Select at least one platform
                </div>
              )}
            </>
          )}

          {step === 'loading' && (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ fontFamily: 'Press Start 2P', fontSize: 8, color: 'var(--green)', textShadow: '0 0 10px var(--green)', marginBottom: 16, lineHeight: 2 }}>
                IMPORTING…
              </div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--cyan)', marginBottom: 8 }}>{msg}</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>This may take a minute for large date ranges</div>
            </div>
          )}

          {step === 'done' && result && (
            <div style={{ padding: '8px 0' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontFamily: 'VT323', fontSize: 56, color: 'var(--green)', textShadow: '0 0 14px var(--green)', lineHeight: 1 }}>{result.imported}</div>
                <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--green)', marginBottom: 4 }}>posts imported</div>
                <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)' }}>
                  {result.tagged} tag-matched · {result.unassigned} unassigned · {result.skipped} skipped
                </div>
              </div>

              {/* Breakdown by show */}
              {result.byShow && Object.keys(result.byShow).length > 0 && (
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 12px', boxShadow: 'var(--win-in)' }}>
                  <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>By Show</div>
                  {Object.entries(result.byShow).sort((a,b) => b[1]-a[1]).map(([show, count]) => (
                    <div key={show} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text2)', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>{show}</span>
                      <span style={{ fontFamily: 'VT323', fontSize: 18, color: 'var(--purple)', lineHeight: 1 }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'error' && (
            <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--pink)', padding: '16px 0', lineHeight: 1.7 }}>{msg}</div>
          )}
        </div>

        <div className="modal-actions">
          {step === 'done' && (
            <button className="btn-ghost" onClick={() => { setStep('config'); setResult(null); setMsg('') }}>
              ← Import Again
            </button>
          )}
          <button className="btn-ghost" onClick={onClose}>{step === 'done' ? 'Close' : 'Cancel'}</button>
          {step === 'done' && result?.logId && (
            <button className="btn-ghost" style={{ color: 'var(--cyan)' }}
              onClick={() => onShowSummary(result.logId)}>
              View Details
            </button>
          )}
          {step === 'config' && (
            <button className="btn-primary"
              disabled={platforms.length === 0}
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
