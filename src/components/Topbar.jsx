export default function Topbar({ postCount, showCount, onLogClick }) {
  const postLabel = `${postCount} ${postCount === 1 ? 'post' : 'posts'} logged across ${showCount} ${showCount === 1 ? 'show' : 'shows'}`

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">Media overview</div>
        <div className="topbar-meta">{postLabel}</div>
      </div>
      <button className="log-btn" onClick={onLogClick}>+ Log post</button>
    </header>
  )
}
