import { useState, useEffect } from 'react'

const STORAGE_KEY = 'media_posts'

function loadPosts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

export function usePosts() {
  const [posts, setPosts] = useState(loadPosts)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
  }, [posts])

  function addPost({ url, title, show, platform, mediaType, episodeNumber, clipIndex }) {
    const post = {
      id: Date.now(),
      url, title, show,
      platform: platform || 'Other',
      mediaType: mediaType || 'Clip',
      episodeNumber: episodeNumber || '',
      clipIndex: clipIndex || '',   // e.g. 'Clip', 'Clip2', 'Clip3'
      stats: { views: '', engagement: '', impressions: '' },
      date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      ts: Date.now(),
    }
    setPosts(prev => [post, ...prev])
  }

  function deletePost(id) {
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  function updatePost(id, updates) {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  return { posts, addPost, deletePost, updatePost }
}
