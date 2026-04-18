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
          {/* Inbox button */}
          <button
            className={`sprout-import-btn${activeView === 'inbox' ? ' active' : ''}`}
            onClick={() => onChangeView('inbox')}
            title="Open Inbox"
            style={activeView === 'inbox' ? { color: 'var(--purple)', borderColor: 'rgba(180,78,255,0.5)', background: 'rgba(180,78,255,0.1)' } : {}}>
            📬 INBOX
          </button>

          {/* Sprout buttons */}
          <button
            className="sprout-import-btn"
            onClick={() => setImportOpen(true)}
            title="Import new posts from Sprout Social">
            📥 IMPORT
          </button>
          <button
            className={`sprout-sync-btn${syncStatus === 'syncing' ? ' syncing' : ''}${!sproutReady ? ' disabled' : ''}`}
            onClick={handleSync}
            title="Sync stats from Sprout Social"
            style={{ minWidth: 100 }}>
            <span className="sprout-icon">⟳</span>
            {syncStatus === 'syncing' ? setSyncMsg || 'SYNCING…'
              : syncStatus === 'done' ? `✓ ${syncMsg}`
              : syncStatus === 'error' ? '✕ FAILED'
              : 'SYNC'}
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
