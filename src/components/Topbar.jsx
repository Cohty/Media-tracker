import { useState } from 'react'
import { useSprout } from '../hooks/useSprout'
import SproutImportModal from './SproutImportModal'
import ImportSummaryModal from './ImportSummaryModal'

export default function Topbar({ postCount, showCount, onLogClick, user, pendingCount, onReviewClick, onPostsUpdated, onChangeView, activeView }) {
  const { status: sproutStatus, syncPostStats } = useSprout()
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncMsg, setSyncMsg] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [summaryLogId, setSummaryLogId] = useState(null)

  const sproutReady = sproutStatus === 'ready'

  async function handleSync() {
    if (!sproutReady || syncStatus === 'syncing') return
    setSyncStatus('syncing'); setSyncMsg('Syncing…')
    try {
      const res = await fetch('/api/posts')
      const posts = await res.json()
      const results = await syncPostStats(posts, msg => setSyncMsg(msg))
      for (const { id, stats } of results) {
        await fetch(`/api/posts/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stats }),
        })
      }
      setSyncStatus('done'); setSyncMsg(`${results.length} synced`)
      onPostsUpdated?.()
      setTimeout(() => setSyncStatus(null), 4000)
    } catch {
      setSyncStatus('error'); setSyncMsg('Failed')
      setTimeout(() => setSyncStatus(null), 5000)
    }
  }

  return (
    <>
      <header className="topbar">
        {/* Left: logo + meta */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexShrink: 0 }}>
          <div className="topbar-logo">MEDIA<span>.</span>TRACKER</div>
          <div className="topbar-meta">{postCount} posts logged — {showCount}/5 shows active</div>
        </div>

        {/* Right: all buttons in one row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'nowrap' }}>

          {/* Log Post — first, styled like the others but pink */}
          <button className="topbar-action-btn topbar-action-btn--log" onClick={onLogClick}>
            ✚ Log Post
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--border2)', margin: '0 2px' }} />

          {/* Inbox */}
          <button
            className={`topbar-action-btn${activeView === 'inbox' ? ' topbar-action-btn--active' : ''}`}
            onClick={() => onChangeView('inbox')}>
            📬 Inbox
          </button>

          {/* Import */}
          <button className="topbar-action-btn" onClick={() => setImportOpen(true)}>
            📥 Import
          </button>

          {/* Sync */}
          <button
            className={`topbar-action-btn topbar-action-btn--sync${!sproutReady ? ' topbar-action-btn--disabled' : ''}`}
            onClick={handleSync}
            disabled={!sproutReady || syncStatus === 'syncing'}>
            <span style={{ display: 'inline-block', animation: syncStatus === 'syncing' ? 'topbar-spin 1s linear infinite' : 'none' }}>⟳</span>
            {syncStatus === 'syncing' ? ' Syncing…' : syncStatus === 'done' ? ` ✓ ${syncMsg}` : syncStatus === 'error' ? ' ✕ Failed' : ' Sync'}
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--border2)', margin: '0 2px' }} />

          {/* Review queue */}
          {user?.isAdmin && pendingCount > 0 && (
            <button className="review-queue-btn" onClick={onReviewClick}>
              Review queue <span className="pending-badge">{pendingCount}</span>
            </button>
          )}

          {/* User pill — show role only, no duplicate */}
          {user && (
            <div className="user-pill">
              <span className="user-role">{user.isAdmin ? 'admin' : 'contributor'}</span>
            </div>
          )}
        </div>
      </header>

      <SproutImportModal isOpen={importOpen} onClose={() => setImportOpen(false)}
        onDone={() => { setImportOpen(false); onPostsUpdated?.() }}
        onShowSummary={logId => setSummaryLogId(logId)} />
      <ImportSummaryModal logId={summaryLogId} isOpen={!!summaryLogId} onClose={() => setSummaryLogId(null)} />
    </>
  )
}
