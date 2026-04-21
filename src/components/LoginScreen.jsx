import { useState } from 'react'

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e?.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); setLoading(false); return }
      onLogin()
    } catch {
      setError('Connection error'); setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg)' }}>
      <div style={{ width: 360 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontFamily:'Press Start 2P', fontSize:13, color:'var(--purple)',
            textShadow:'0 0 20px rgba(180,78,255,0.8)', letterSpacing:'2px', lineHeight:1.6 }}>
            MEDIA<span style={{ color:'var(--pink)' }}>.</span>TRACKER
          </div>
          <div style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--text3)', marginTop:8 }}>
            The Block Media Team
          </div>
        </div>

        {/* Login box */}
        <div className="win95-window">
          <div className="win95-titlebar">
            <span className="win95-title">🔐 Sign In</span>
          </div>
          <div style={{ padding:'20px 20px 16px' }}>
            <div className="field" style={{ marginBottom:12 }}>
              <label>Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoFocus
                style={{ width:'100%' }}
              />
            </div>
            <div className="field" style={{ marginBottom:16 }}>
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter site password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ width:'100%' }}
              />
            </div>

            {error && (
              <div style={{ fontFamily:'DM Mono', fontSize:9, color:'var(--pink)',
                marginBottom:12, padding:'6px 10px', background:'rgba(255,45,120,0.08)',
                border:'1px solid rgba(255,45,120,0.3)', borderRadius:'var(--radius)' }}>
                ✕ {error}
              </div>
            )}

            <button
              className="btn-primary"
              disabled={loading || !email.trim() || !password.trim()}
              onClick={handleSubmit}
              style={{ width:'100%' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
        </div>

        <div style={{ fontFamily:'DM Mono', fontSize:8, color:'var(--text3)',
          textAlign:'center', marginTop:16 }}>
          Access restricted to authorized team members
        </div>
      </div>
    </div>
  )
}
