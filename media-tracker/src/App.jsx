import { useState } from 'react'
import { SHOWS } from './constants'
import { usePosts } from './hooks/usePosts'
import Topbar from './components/Topbar'
import Board from './components/Board'
import LogModal from './components/LogModal'

export default function App() {
  const { posts, addPost, deletePost } = usePosts()
  const [modalOpen, setModalOpen] = useState(false)

  const activeShowCount = SHOWS.filter(s => posts.some(p => p.show === s.name)).length

  return (
    <>
      <Topbar
        postCount={posts.length}
        showCount={activeShowCount}
        onLogClick={() => setModalOpen(true)}
      />
      <Board posts={posts} onDelete={deletePost} />
      <LogModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={addPost}
      />
    </>
  )
}
