import { useState, useEffect, useCallback } from 'react'

export function usePosts() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/posts')
      if (res.ok) setPosts(await res.json())
    } catch (e) {
      console.error('Failed to fetch posts', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function addPost(data) {
    const post = {
      id: String(Date.now()),
      ...data,
      platform: data.platform || 'Other',
      date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      ts: Date.now(),
    }
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    })
    const result = await res.json()
    if (result.status === 'published') {
      setPosts(prev => [post, ...prev])
    }
    return result.status // 'published' | 'pending_review'
  }

  async function deletePost(id) {
    const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
    const result = await res.json()
    if (result.status === 'deleted') {
      setPosts(prev => prev.filter(p => p.id !== id))
    }
    return result.status
  }

  async function updatePost(id, updates) {
    const res = await fetch(`/api/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const result = await res.json()
    if (result.status === 'updated') {
      setPosts(prev => prev.map(p => {
        if (p.id !== id) return p
        const newStats = { ...p.stats }
        if (updates.stats) {
          // Only overwrite stat fields that have actual values
          Object.entries(updates.stats).forEach(([k, v]) => {
            if (v !== '' && v !== '0' && v !== null && v !== undefined) newStats[k] = v
          })
        }
        return { ...p, ...updates, stats: newStats }
      }))
    }
    return result.status
  }

  return { posts, loading, addPost, deletePost, updatePost, refetch: fetchPosts }
}
