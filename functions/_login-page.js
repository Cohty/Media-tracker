export function getLoginPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Media Tracker — Login</title>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #080612; --surface: #0f0c1e; --surface2: #171430;
      --border: rgba(180,78,255,0.15); --border2: rgba(180,78,255,0.4);
      --purple: #b44eff; --pink: #ff2d78; --cyan: #00e5ff;
      --text: #e2d9ff; --text2: #8b7eb8; --text3: #4a4168;
      --win-out: inset -1px -1px rgba(0,0,0,0.9), inset 1px 1px rgba(255,255,255,0.18), inset -2px -2px rgba(0,0,0,0.6), inset 2px 2px rgba(255,255,255,0.07);
      --win-in: inset -1px -1px rgba(255,255,255,0.07), inset 1px 1px rgba(0,0,0,0.9);
    }
    body {
      min-height: 100vh; background-color: var(--bg);
      background-image: linear-gradient(rgba(180,78,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(180,78,255,0.035) 1px, transparent 1px);
      background-size: 28px 28px;
      display: flex; align-items: center; justify-content: center;
      font-family: 'DM Mono', monospace; color: var(--text);
    }
    .login-box {
      background: var(--surface); border: 1px solid rgba(255,255,255,0.07);
      border-radius: 4px; box-shadow: var(--win-out), 0 0 60px rgba(180,78,255,0.15);
      width: 100%; max-width: 360px; overflow: hidden;
    }
    .titlebar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 5px 8px;
      background: linear-gradient(90deg, #2a0060, #6a00b8);
      border-bottom: 1px solid rgba(0,0,0,0.5);
    }
    .titlebar-text { font-size: 10px; color: #fff; letter-spacing: 0.3px; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
    .titlebar-dots { display: flex; gap: 3px; }
    .dot { width: 12px; height: 12px; background: rgba(255,255,255,0.15); border-radius: 1px; box-shadow: var(--win-out); }
    .body { padding: 32px 28px 28px; }
    .logo {
      font-family: 'Press Start 2P', monospace; font-size: 9px;
      color: var(--purple); text-shadow: 0 0 14px rgba(180,78,255,0.7);
      text-align: center; margin-bottom: 8px; line-height: 2;
    }
    .logo span { color: var(--pink); text-shadow: 0 0 14px rgba(255,45,120,0.7); }
    .subtitle { font-size: 9px; color: var(--text3); text-align: center; margin-bottom: 28px; letter-spacing: 0.5px; }
    .field { margin-bottom: 12px; }
    .field label { display: block; font-size: 9px; color: var(--text3); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
    .field input {
      width: 100%; background: var(--surface2); border: 1px solid var(--border);
      border-radius: 4px; padding: 9px 12px; font-family: 'DM Mono', monospace;
      font-size: 13px; color: var(--text); outline: none; box-shadow: var(--win-in);
      transition: border-color .15s;
    }
    .field input:focus { border-color: var(--purple); box-shadow: var(--win-in), 0 0 6px rgba(180,78,255,0.2); }
    .field input::placeholder { color: var(--text3); }
    .error {
      background: rgba(255,45,120,0.08); border: 1px solid rgba(255,45,120,0.25);
      border-radius: 4px; padding: 8px 12px; margin-bottom: 14px;
      font-size: 10px; color: var(--pink); display: none;
    }
    .error.show { display: block; }
    .btn {
      width: 100%; background: var(--purple); color: #fff; border: none;
      padding: 10px; font-family: 'DM Mono', monospace; font-size: 11px;
      letter-spacing: 0.5px; border-radius: 4px; cursor: pointer;
      box-shadow: var(--win-out), 0 0 12px rgba(180,78,255,0.3);
      transition: box-shadow .15s;
    }
    .btn:hover { box-shadow: var(--win-out), 0 0 20px rgba(180,78,255,0.5); }
    .btn:active { box-shadow: var(--win-in); }
    .btn:disabled { opacity: .4; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="login-box">
    <div class="titlebar">
      <span class="titlebar-text">🔒 MEDIA.TRACKER — Authentication Required</span>
      <div class="titlebar-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
    </div>
    <div class="body">
      <div class="logo">MEDIA<span>.</span>TRACKER</div>
      <div class="subtitle">Enter your credentials to continue</div>
      <div class="error" id="error">Incorrect email or password. Try again.</div>
      <form id="form">
        <div class="field">
          <label>Email</label>
          <input type="email" id="email" placeholder="your@email.com" autocomplete="email" required />
        </div>
        <div class="field">
          <label>Password</label>
          <input type="password" id="password" placeholder="••••••••" autocomplete="current-password" required />
        </div>
        <button type="submit" class="btn" id="btn">LOGIN</button>
      </form>
    </div>
  </div>
  <script>
    document.getElementById('form').addEventListener('submit', async e => {
      e.preventDefault()
      const btn = document.getElementById('btn')
      const err = document.getElementById('error')
      btn.disabled = true
      btn.textContent = 'LOGGING IN…'
      err.classList.remove('show')
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: document.getElementById('email').value,
          password: document.getElementById('password').value
        })
      })
      if (res.ok) {
        window.location.reload()
      } else {
        err.classList.add('show')
        btn.disabled = false
        btn.textContent = 'LOGIN'
      }
    })
  </script>
</body>
</html>`
}
