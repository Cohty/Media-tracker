import { useState } from 'react'
import { getAuthHeaders } from '../hooks/useUser'
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
      const res = await fetch('/api/posts', { headers: getAuthHeaders() })
      const posts = await res.json()

      // Build pre-sync snapshot of stats
      const before = {}
      posts.forEach(p => { before[p.id] = { views: Number(p.stats?.views) || 0, engagement: Number(p.stats?.engagement) || 0, impressions: Number(p.stats?.impressions) || 0 } })

      const results = await syncPostStats(posts, msg => setSyncMsg(msg))
      for (const { id, stats, videoViews, xImpressions } of results) {
        const body = {}
        if (stats) body.stats = stats
        if (videoViews) body.videoViews = videoViews
        if (xImpressions) body.xImpressions = xImpressions
        if (Object.keys(body).length > 0) {
          await fetch(`/api/posts/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(body),
          })
        }
      }

      // Detect significant changes (post that gained 1k+ views or 50+ engagement)
      const highlights = []
      for (const { id, stats, post } of results) {
        const prev = before[id] || {}
        const viewGain = (Number(stats.views) || 0) - (prev.views || 0)
        const engGain = (Number(stats.engagement) || 0) - (prev.engagement || 0)
        if (viewGain >= 1000 || engGain >= 50) {
          highlights.push({ title: post?.title || 'Post', viewGain, engGain })
        }
      }

      setSyncStatus('done')
      if (highlights.length > 0) {
        const top = highlights.sort((a, b) => b.viewGain - a.viewGain)[0]
        const fmt = n => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n)
        setSyncMsg(`${results.length} synced · 🔥 "${top.title.slice(0,30)}…" +${fmt(top.viewGain)} views`)
      } else {
        setSyncMsg(`${results.length} synced`)
      }
      onPostsUpdated?.()
      setTimeout(() => setSyncStatus(null), highlights.length > 0 ? 8000 : 4000)
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
        onDone={(logId) => { setImportOpen(false); onPostsUpdated?.(); if (logId) setSummaryLogId(logId) }}
        onShowSummary={logId => { setImportOpen(false); setSummaryLogId(logId) }} />
      <ImportSummaryModal logId={summaryLogId} isOpen={!!summaryLogId} onClose={() => setSummaryLogId(null)} />
    </>
  )
}
