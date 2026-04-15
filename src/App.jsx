import { useState, useCallback } from 'react'
import { SHOWS } from './constants'
import { usePosts } from './hooks/usePosts'
import { useUser } from './hooks/useUser'
import Topbar from './components/Topbar'
import StatsBar from './components/StatsBar'
import Nav from './components/Nav'
import Board from './components/Board'
import CalendarView from './components/CalendarView'
import AnalyticsView from './components/AnalyticsView'
import PodcastView from './components/PodcastView'
import LogModal from './components/LogModal'
import MovePostModal from './components/MovePostModal'
import ReviewPanel from './components/ReviewPanel'

export default function App() {
  const { user, loading: userLoading } = useUser()
  const { posts, loading: postsLoading, addPost, deletePost, updatePost, refetch } = usePosts()
  const [modalOpen, setModalOpen] = useState(false)
  const [movingPost, setMovingPost] = useState(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [activeView, setActiveView] = useState('board')
  const [highlightedPostId, setHighlightedPostId] = useState(null)
  const [toast, setToast] = useState(null)

  const activeShowCount = SHOWS.filter(s => posts.some(p => p.show === s.name)).length

  // Poll pending count for admin
  useState(() => {
    if (!user?.isAdmin) return
    const fetchCount = () =>
      fetch('/api/pending').then(r => r.json()).then(d => setPendingCount(Array.isArray(d) ? d.length : 0)).catch(() => {})
    fetchCount()
    const iv = setInterval(fetchCount, 30000)
    return () => clearInterval(iv)
  })

  function showToast(msg, type = 'info') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleAddPost(data) {
    const status = await addPost(data)
    if (status === 'pending_review') {
      showToast('Post submitted for admin review', 'pending')
    } else {
      showToast('Post logged successfully', 'success')
    }
  }

  async function handleDeletePost(id) {
    const status = await deletePost(id)
    if (status === 'pending_review') {
      showToast('Deletion submitted for admin review', 'pending')
    }
  }

  async function handleUpdatePost(id, updates) {
    const status = await updatePost(id, updates)
    if (status === 'pending_review') {
      showToast('Edit submitted for admin review', 'pending')
    }
  }

  const handleNavigateToPost = useCallback((postId) => {
    setActiveView('board')
    setHighlightedPostId(postId)
    setTimeout(() => setHighlightedPostId(null), 3000)
  }, [])

  if (userLoading || postsLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontFamily: 'Press Start 2P', fontSize: 10, color: 'var(--purple)', textShadow: '0 0 14px rgba(180,78,255,0.7)' }}>
          MEDIA<span style={{ color: 'var(--pink)' }}>.</span>TRACKER
        </div>
        <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text3)' }}>LOADING…</div>
      </div>
    )
  }

  return (
    <>
      <Topbar
        postCount={posts.length}
        showCount={activeShowCount}
        onLogClick={() => setModalOpen(true)}
        user={user}
        pendingCount={pendingCount}
        onReviewClick={() => setReviewOpen(true)}
      />
      <StatsBar posts={posts} />
      <Nav activeView={activeView} onChangeView={setActiveView} />

      {activeView === 'board'     && <Board posts={posts} onDelete={handleDeletePost} onMove={setMovingPost} highlightedPostId={highlightedPostId} />}
      {activeView === 'calendar'  && <CalendarView posts={posts} />}
      {activeView === 'analytics' && <AnalyticsView posts={posts} onUpdatePost={handleUpdatePost} />}
      {activeView === 'podcast'   && <PodcastView />}

      {toast && (
        <div className={`toast toast--${toast.type}`}>
          {toast.type === 'pending' && '⏳ '}
          {toast.type === 'success' && '✓ '}
          {toast.msg}
        </div>
      )}

      <LogModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddPost}
        onNavigateToPost={handleNavigateToPost}
        posts={posts}
        isContributor={!user?.isAdmin}
      />
      <MovePostModal
        post={movingPost}
        isOpen={!!movingPost}
        onClose={() => setMovingPost(null)}
        onSave={handleUpdatePost}
        posts={posts}
      />
      {reviewOpen && user?.isAdmin && (
        <ReviewPanel
          onClose={() => setReviewOpen(false)}
          onApproved={() => { refetch(); setPendingCount(c => Math.max(0, c - 1)) }}
        />
      )}
    </>
  )
}
