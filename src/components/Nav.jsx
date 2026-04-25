const TABS = [
  { id: 'leaderboard', label: 'TOP',       icon: '🏆' },
  { id: 'board',       label: 'BOARD',     icon: '▦' },
  { id: 'analytics',   label: 'ANALYTICS', icon: '▲' },
  { id: 'podcast',     label: 'PODCAST',   icon: '🎙' },
  { id: 'help',        label: 'HELP',      icon: '?' },
]

export default function Nav({ activeView, onChangeView }) {
  return (
    <nav className="main-nav">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`nav-tab${activeView === tab.id ? ' active' : ''}`}
          onClick={() => onChangeView(tab.id)}
        >
          <span className="nav-tab-icon">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
