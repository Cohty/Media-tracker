import { useState, useCallback } from 'react'
import { SHOWS } from './constants'
import { usePosts } from './hooks/usePosts'
import Topbar from './components/Topbar'
import StatsBar from './components/StatsBar'
import Nav from './components/Nav'
import Board from './components/Board'
import CalendarView from './components/CalendarView'
import AnalyticsView from './components/AnalyticsView'
import PodcastView from './components/PodcastView'
import LogModal from './components/LogModal'
import MovePostModal from './components/MovePostModal'

export default function App() {
  const { posts, addPost, deletePost, updatePost } = usePosts()
  const [modalOpen, setModalOpen] = useState(false)
  const [movingPost, setMovingPost] = useState(null)
  const [activeView, setActiveView] = useState('board')
  const [highlightedPostId, setHighlightedPostId] = useState(null)
  const activeShowCount = SHOWS.filter(s => posts.some(p => p.show === s.name)).length

  const handleNavigateToPost = useCallback((postId) => {
    setActiveView('board')
    setHighlightedPostId(postId)
    // Clear highlight after animation completes
    setTimeout(() => setHighlightedPostId(null), 3000)
  }, [])

  return (
    <>
      <Topbar postCount={posts.length} showCount={activeShowCount} onLogClick={() => setModalOpen(true)} />
      <StatsBar posts={posts} />
      <Nav activeView={activeView} onChangeView={setActiveView} />
      {activeView === 'board'     && <Board posts={posts} onDelete={deletePost} onMove={setMovingPost} highlightedPostId={highlightedPostId} />}
      {activeView === 'calendar'  && <CalendarView posts={posts} />}
      {activeView === 'analytics' && <AnalyticsView posts={posts} onUpdatePost={updatePost} />}
      {activeView === 'podcast'   && <PodcastView />}
      <LogModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={addPost}
        onNavigateToPost={handleNavigateToPost}
        posts={posts}
      />
      <MovePostModal
        post={movingPost}
        isOpen={!!movingPost}
        onClose={() => setMovingPost(null)}
        onSave={updatePost}
        posts={posts}
      />
    </>
  )
}
