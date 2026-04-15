const TABS = [
  { id: 'board',     label: 'BOARD',     icon: '▦' },
  { id: 'calendar',  label: 'CALENDAR',  icon: '◫' },
  { id: 'analytics', label: 'ANALYTICS', icon: '▲' },
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
