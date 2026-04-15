import { useState } from 'react'
import { SHOWS } from './constants'
import { usePosts } from './hooks/usePosts'
import Topbar from './components/Topbar'
import StatsBar from './components/StatsBar'
import Nav from './components/Nav'
import Board from './components/Board'
import CalendarView from './components/CalendarView'
import AnalyticsView from './components/AnalyticsView'
import LogModal from './components/LogModal'

export default function App() {
  const { posts, addPost, deletePost, updatePost } = usePosts()
  const [modalOpen, setModalOpen] = useState(false)
  const [activeView, setActiveView] = useState('board')
  const activeShowCount = SHOWS.filter(s => posts.some(p => p.show === s.name)).length

  return (
    <>
      <Topbar postCount={posts.length} showCount={activeShowCount} onLogClick={() => setModalOpen(true)} />
      <StatsBar posts={posts} />
      <Nav activeView={activeView} onChangeView={setActiveView} />
      {activeView === 'board'     && <Board posts={posts} onDelete={deletePost} />}
      {activeView === 'calendar'  && <CalendarView posts={posts} />}
      {activeView === 'analytics' && <AnalyticsView posts={posts} onUpdatePost={updatePost} />}
      <LogModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSubmit={addPost} />
    </>
  )
}
