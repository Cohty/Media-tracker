async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.reload()
}

export default function Topbar({ postCount, showCount, onLogClick, user, pendingCount, onReviewClick }) {
  return (
    <header className="topbar">
      <div>
        <div className="topbar-logo">MEDIA<span>.</span>TRACKER</div>
        <div className="topbar-meta">
          {postCount} {postCount === 1 ? 'post' : 'posts'} logged &mdash; {showCount}/5 shows active
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user?.isAdmin && pendingCount > 0 && (
          <button className="review-alert-btn" onClick={onReviewClick}>
            <span className="review-alert-dot" />
            {pendingCount} pending
          </button>
        )}
        {user?.isAdmin && pendingCount === 0 && (
          <button className="review-quiet-btn" onClick={onReviewClick}>Review queue</button>
        )}
        {user?.email && (
          <div className="topbar-user">
            <span className="topbar-user-email">{user.email}</span>
            <span className={`topbar-user-role ${user.isAdmin ? 'admin' : 'contributor'}`}>
              {user.isAdmin ? 'admin' : 'contributor'}
            </span>
          </div>
        )}
        {user?.isAdmin
          ? <button className="log-btn" onClick={onLogClick}>+ LOG POST</button>
          : <button className="log-btn" style={{ background: 'var(--cyan)', boxShadow: 'var(--win-out), 0 0 10px rgba(0,229,255,0.3)' }} onClick={onLogClick}>
              + SUBMIT POST
            </button>
        }
        <button className="logout-btn" onClick={logout} title="Sign out">⏏</button>
      </div>
    </header>
  )
}
