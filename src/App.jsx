import { useState, useCallback, useMemo } from 'react'
import { SHOWS } from './constants'
import { usePosts } from './hooks/usePosts'
import { useUser } from './hooks/useUser'
import Topbar from './components/Topbar'
import StatsBar from './components/StatsBar'
import DateRangeBar, { useDateRange } from './components/DateRangeBar'
import Nav from './components/Nav'
import Board from './components/Board'
import CalendarView from './components/CalendarView'
import AnalyticsView from './components/AnalyticsView'
import PodcastView from './components/PodcastView'
import LogModal from './components/LogModal'
import MovePostModal from './components/MovePostModal'
import ReviewPanel from './components/ReviewPanel'
import BatchBar from './components/BatchBar'
import ImportSummaryModal from './components/ImportSummaryModal'
import InboxView from './components/InboxView'

export default function App() {
  const { user } = useUser()
  const { posts, loading, addPost, deletePost, updatePost, refetch } = usePosts()
  const [modalOpen, setModalOpen] = useState(false)
  const [movingPost, setMovingPost] = useState(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [activeView, setActiveView] = useState('board')
  const [highlightedPostId, setHighlightedPostId] = useState(null)
  const [toast, setToast] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [summaryLogId, setSummaryLogId] = useState(null)

  const { preset, setPreset, customStart, setCustomStart, customEnd, setCustomEnd, range } = useDateRange()

  // Filter posts by date range for board + statsbar
  const rangeFilteredPosts = useMemo(() => {
    if (preset === 'all') return posts
    return posts.filter(p => {
      const ts = p.ts || 0
      return ts >= range.start.getTime() && ts <= range.end.getTime()
    })
  }, [posts, preset, range])

  function showToast(msg, type = 'info') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleBatchDelete(ids) {
    await fetch('/api/posts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
    await refetch()
    showToast(`${ids.length} posts deleted`, 'success')
  }

  async function handleBatchRetag(ids, updates) {
    await fetch('/api/posts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, updates }) })
    await refetch()
    showToast(`${ids.length} posts updated`, 'success')
  }

  async function handleAddPost(data) {
    const status = await addPost(data)
    showToast(status === 'pending_review' ? 'Post submitted for review' : 'Post logged', status === 'pending_review' ? 'pending' : 'success')
  }

  async function handleDeletePost(id) {
    const status = await deletePost(id)
    if (status === 'pending_review') showToast('Deletion submitted for review', 'pending')
  }

  async function handleUpdatePost(id, updates) {
    const status = await updatePost(id, updates)
    if (status === 'pending_review') showToast('Edit submitted for review', 'pending')
  }

  const handleNavigateToPost = useCallback((postId) => {
    setActiveView('board')
    setHighlightedPostId(postId)
    setTimeout(() => setHighlightedPostId(null), 3000)
  }, [])

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16 }}>
        <div style={{ fontFamily:'Press Start 2P', fontSize:10, color:'var(--purple)', textShadow:'0 0 14px rgba(180,78,255,0.7)' }}>
          MEDIA<span style={{ color:'var(--pink)' }}>.</span>TRACKER
        </div>
        <div style={{ fontFamily:'DM Mono', fontSize:10, color:'var(--text3)' }}>LOADING…</div>
      </div>
    )
  }

  return (
    <>
      <Topbar postCount={posts.length} showCount={SHOWS.filter(s => posts.some(p => p.show === s.name)).length}
        onLogClick={() => setModalOpen(true)} user={user} pendingCount={pendingCount}
        onReviewClick={() => setReviewOpen(true)} />

      <StatsBar posts={rangeFilteredPosts} allPosts={posts} rangeLabel={preset !== 'all' ? range.label : null} />

      <Nav activeView={activeView} onChangeView={setActiveView} />

      {/* Date range bar — only on board view */}
      {activeView === 'board' && (
        <DateRangeBar
          preset={preset} setPreset={setPreset}
          customStart={customStart} setCustomStart={setCustomStart}
          customEnd={customEnd} setCustomEnd={setCustomEnd}
          range={range} postCount={rangeFilteredPosts.length}
        />
      )}

      {selectedIds.size > 0 && (
        <BatchBar selectedIds={selectedIds} posts={posts}
          onDelete={handleBatchDelete} onRetag={handleBatchRetag}
          onClear={() => setSelectedIds(new Set())} />
      )}

      {activeView === 'board' && (
        <Board posts={rangeFilteredPosts} onDelete={handleDeletePost} onMove={setMovingPost}
          highlightedPostId={highlightedPostId} selectedIds={selectedIds} onToggleSelect={toggleSelect} />
      )}
      {activeView === 'calendar'  && <CalendarView posts={posts} />}
      {activeView === 'analytics' && <AnalyticsView posts={posts} onUpdatePost={handleUpdatePost}
        onImportDone={logId => setSummaryLogId(logId)} />}
      {activeView === 'podcast'   && <PodcastView />}
      {activeView === 'inbox'     && <InboxView posts={posts} onUpdatePost={handleUpdatePost} onDeletePost={handleDeletePost} />}

      {toast && <div className={`toast toast--${toast.type}`}>{toast.type==='pending'?'⏳ ':'✓ '}{toast.msg}</div>}

      <LogModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleAddPost}
        onNavigateToPost={handleNavigateToPost} posts={posts} isContributor={!user?.isAdmin} />
      <MovePostModal post={movingPost} isOpen={!!movingPost} onClose={() => setMovingPost(null)}
        onSave={handleUpdatePost} posts={posts} />
      {reviewOpen && user?.isAdmin && (
        <ReviewPanel onClose={() => setReviewOpen(false)}
          onApproved={() => { refetch(); setPendingCount(c => Math.max(0, c-1)) }} />
      )}
      <ImportSummaryModal logId={summaryLogId} isOpen={!!summaryLogId} onClose={() => setSummaryLogId(null)} />
    </>
  )
}
