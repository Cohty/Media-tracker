import { useState } from 'react'
import { useSprout, importFromSprout } from '../hooks/useSprout'
import SproutImportModal from './SproutImportModal'
import ImportSummaryModal from './ImportSummaryModal'

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
}

export default function Topbar({ postCount, showCount, onLogClick, user, pendingCount, onReviewClick, onPostsUpdated, onChangeView, activeView }) {
  const { status: sproutStatus, syncPostStats } = useSprout()
  const [syncStatus, setSyncStatus] = useState(null) // null | 'syncing' | 'done' | 'error'
  const [syncMsg, setSyncMsg] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [summaryLogId, setSummaryLogId] = useState(null)

  const sproutReady = sproutStatus === 'ready'

  async function handleSync() {
    if (!sproutReady || syncStatus === 'syncing') return
    setSyncStatus('syncing')
    setSyncMsg('Syncing…')
    try {
      // Fetch all posts for syncing
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
      setSyncStatus('done')
      setSyncMsg(`${results.length} synced`)
      onPostsUpdated?.()
      setTimeout(() => setSyncStatus(null), 4000)
    } catch (err) {
      setSyncStatus('error')
      setSyncMsg('Sync failed')
      setTimeout(() => setSyncStatus(null), 5000)
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="logo">MEDIA<span className="logo-dot">.</span>TRACKER</div>
          <div className="topbar-meta">{postCount} posts logged — {showCount}/5 shows active</div>
        </div>
        <div className="topbar-right">
          {/* Inbox */}
          <button
            className={`topbar-action-btn${activeView === 'inbox' ? ' topbar-action-btn--active' : ''}`}
            onClick={() => onChangeView('inbox')}>
            <span>📬</span><span>Inbox</span>
          </button>

          {/* Import */}
          <button className="topbar-action-btn" onClick={() => setImportOpen(true)}>
            <span>📥</span><span>Import</span>
          </button>

          {/* Sync */}
          <button
            className={`topbar-action-btn topbar-action-btn--sync${syncStatus === 'syncing' ? ' syncing' : ''}${!sproutReady ? ' topbar-action-btn--disabled' : ''}`}
            onClick={handleSync}
            disabled={!sproutReady || syncStatus === 'syncing'}>
            <span style={{ display: 'inline-block', transition: 'transform .3s', transform: syncStatus === 'syncing' ? 'rotate(180deg)' : 'none' }}>⟳</span>
            <span>
              {syncStatus === 'syncing' ? 'Syncing…'
                : syncStatus === 'done' ? `✓ ${syncMsg}`
                : syncStatus === 'error' ? '✕ Failed'
                : 'Sync'}
            </span>
          </button>

          {user?.isAdmin && pendingCount > 0 && (
            <button className="review-queue-btn" onClick={onReviewClick}>
              Review queue {pendingCount > 0 && <span className="pending-badge">{pendingCount}</span>}
            </button>
          )}
          {user && (
            <div className="user-pill">
              <span className="user-role">{user.isAdmin ? 'admin' : 'contributor'}</span>
              <span className="user-email">{user.isAdmin ? 'admin' : user.email?.split('@')[0]}</span>
            </div>
          )}
          <button className="btn-log" onClick={onLogClick}>+ LOG POST</button>
        </div>
      </header>

      <SproutImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => { setImportOpen(false); onPostsUpdated?.() }}
        onShowSummary={logId => setSummaryLogId(logId)}
      />
      <ImportSummaryModal
        logId={summaryLogId}
        isOpen={!!summaryLogId}
        onClose={() => setSummaryLogId(null)}
      />
    </>
  )
}
