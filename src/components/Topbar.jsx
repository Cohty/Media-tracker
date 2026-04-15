export default function Topbar({ postCount, showCount, onLogClick }) {
  return (
    <header className="topbar">
      <div>
        <div className="topbar-logo">
          MEDIA<span>.</span>TRACKER
        </div>
        <div className="topbar-meta">
          {postCount} {postCount === 1 ? 'post' : 'posts'} logged &mdash; {showCount}/5 shows active
        </div>
      </div>
      <button className="log-btn" onClick={onLogClick}>+ LOG POST</button>
    </header>
  )
}
