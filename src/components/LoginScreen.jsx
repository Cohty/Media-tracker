import { useState } from 'react'

export default function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAdmin() {
    if (!password.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim(), mode: 'admin' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Invalid password'); setLoading(false); return }
      localStorage.setItem('mt_token', data.token)
      onLogin()
    } catch { setError('Connection error'); setLoading(false) }
  }

  async function handleGuest() {
    setLoading(true)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'guest' }),
      })
      const data = await res.json()
      localStorage.setItem('mt_token', data.token)
      onLogin()
    } catch { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ width: 340 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontFamily:'Press Start 2P', fontSize:13, color:'var(--purple)',
            textShadow:'0 0 20px rgba(180,78,255,0.8)', letterSpacing:'2px', lineHeight:1.6 }}>
            MEDIA<span style={{ color:'var(--pink)' }}>.</span>TRACKER
          </div>
          <div style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--text3)', marginTop:8 }}>
            The Block Media Team
          </div>
        </div>

        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="win95-title">🔐 Access</span>
          </div>
          <div style={{ padding:'20px 20px 16px', display:'flex', flexDirection:'column', gap:12 }}>

            <button className="btn-primary"
              style={{ background:'rgba(0,229,255,0.1)', color:'var(--cyan)',
                border:'1px solid rgba(0,229,255,0.4)', boxShadow:'none', width:'100%', padding:'11px 0', fontSize:11 }}
              onClick={handleGuest} disabled={loading}>
              👤 Continue as Guest
            </button>

            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
              <span style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--text3)' }}>admin only</span>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
            </div>

            <div className="field" style={{ marginBottom:0 }}>
              <label>Password</label>
              <input type="password" placeholder="Enter admin password"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdmin()} autoComplete="current-password" />
            </div>

            {error && (
              <div style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--pink)',
                padding:'5px 10px', background:'rgba(255,45,120,0.08)',
                border:'1px solid rgba(255,45,120,0.3)', borderRadius:'var(--radius)' }}>
                ✕ {error}
              </div>
            )}

            <button className="btn-primary" disabled={loading || !password.trim()}
              onClick={handleAdmin} style={{ width:'100%' }}>
              {loading ? 'Signing in…' : '🔑 Sign in as Admin'}
            </button>
          </div>
        </div>

        <div style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--text3)', textAlign:'center', marginTop:16 }}>
          Guests can submit posts for admin review
        </div>
      </div>
    </div>
  )
}
