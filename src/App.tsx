import React, { useState, useEffect, useCallback, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { v4 as uuidv4 } from 'uuid'
import { supabase, type CodePost, type ReactionType, type Reactions, type Comment } from './lib/supabase'

const reactionEmojis: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  wow: '😮',
  sad: '😢',
  angry: '😠',
}

// Separate CommentInput component to prevent re-renders
const CommentInput = React.memo(({ 
  postId, 
  userProfile, 
  theme, 
  onSubmit 
}: { 
  postId: string
  userProfile: { name: string; avatar: string } | null
  theme: 'light' | 'dark'
  onSubmit: (postId: string, content: string) => void
}) => {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(postId, value.trim())
      setValue('')
    }
  }

  return (
    <div className="mb-4">
      <div className="flex items-start space-x-3">
        {userProfile?.avatar ? (
          <img 
            src={userProfile.avatar} 
            alt={userProfile.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-sm">
            {userProfile?.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Write a comment..."
            className={`w-full px-3 py-2 rounded-lg border resize-none ${
              theme === 'dark'
                ? 'bg-[#0d1117] border-[#30363d] text-white placeholder-gray-500 focus:border-blue-500'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'
            } focus:ring-2 focus:ring-blue-500/20 transition-all outline-none`}
            rows={2}
          />
          <div className="flex items-center justify-end mt-2">
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

interface DeleteModalProps {
  show: boolean
  onConfirm: () => void
  onCancel: () => void
  theme: 'light' | 'dark'
}

function DeleteModal({ show, onConfirm, onCancel, theme }: DeleteModalProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className={`${
        theme === 'dark' ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-gray-200'
      } rounded-2xl border shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Delete Post
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              This action cannot be undone
            </p>
          </div>
        </div>
        
        <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Are you sure you want to delete this post? This will permanently remove it from the feed.
        </p>
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
              theme === 'dark'
                ? 'bg-[#21262d] hover:bg-[#30363d] text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [posts, setPosts] = useState<CodePost[]>([])
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme')
    return (savedTheme as 'light' | 'dark') || 'dark'
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [onboardingData, setOnboardingData] = useState({
    name: '',
    avatar: ''
  })
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string; isDev: boolean } | null>(null)
  const [newPost, setNewPost] = useState({
    code: '',
    title: '',
    author: ''
  })
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [deleteModalPost, setDeleteModalPost] = useState<string | null>(null)
  const [copiedPost, setCopiedPost] = useState<string | null>(null)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [showReactionTooltip, setShowReactionTooltip] = useState<{ postId: string; reactionType: ReactionType } | null>(null)
  const [showComments, setShowComments] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const commentPostMapRef = useRef<Record<string, string>>({}) // Use ref instead of state
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settingsData, setSettingsData] = useState({
    name: '',
    avatar: ''
  })
  const [userId] = useState(() => {
    let id = localStorage.getItem('userId')
    if (!id) {
      id = uuidv4()
      localStorage.setItem('userId', id)
    }
    return id
  })
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set())
  const [userAvatars, setUserAvatars] = useState<Record<string, { name: string; avatar: string }>>({})

  useEffect(() => {
    // Check if user has profile
    const savedProfile = localStorage.getItem('userProfile')
    if (savedProfile) {
      const profile = JSON.parse(savedProfile)
      setUserProfile(profile)
      
      // Sync to database if not exists
      syncUserToDatabase(profile)
    } else {
      setShowOnboarding(true)
    }
  }, [])

  // Sync user profile to database
  const syncUserToDatabase = async (profile: { name: string; avatar: string; isDev: boolean }) => {
    try {
      // Check if user exists in database
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single()

      // If user doesn't exist, create it
      if (!existingUser) {
        const { error } = await supabase
          .from('users')
          .insert({
            id: userId,
            name: profile.name,
            avatar: profile.avatar,
            is_dev: profile.isDev
          })

        if (error) throw error
      }
    } catch (error) {
      console.error('Error syncing user to database:', error)
    }
  }

  // Load user avatars from database
  const loadUserAvatars = async (authorIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, avatar')
        .in('id', authorIds)

      if (error) throw error

      if (data) {
        const avatarMap: Record<string, { name: string; avatar: string }> = {}
        data.forEach(user => {
          avatarMap[user.id] = { name: user.name, avatar: user.avatar || '' }
        })
        setUserAvatars(prev => ({ ...prev, ...avatarMap }))
      }
    } catch (error) {
      console.error('Error loading user avatars:', error)
    }
  }

  useEffect(() => {
    // Save theme to localStorage whenever it changes
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    // Close reaction picker on scroll or click outside
    const handleScrollOrClick = (e: Event) => {
      if (showReactionPicker) {
        // Check if click is inside picker or reaction button
        const target = e.target as HTMLElement
        const isInsidePicker = target.closest('[data-reaction-picker]')
        const isReactionButton = target.closest('[data-reaction-button]')
        
        if (!isInsidePicker && !isReactionButton) {
          setShowReactionPicker(null)
        }
      }
    }

    const handleScroll = (e: Event) => {
      if (showReactionPicker) {
        // Check if scroll is inside picker
        const target = e.target as HTMLElement
        const isInsidePicker = target.closest('[data-reaction-picker]')
        
        // Only close if scroll is outside picker
        if (!isInsidePicker) {
          setShowReactionPicker(null)
        }
      }
    }

    if (showReactionPicker) {
      window.addEventListener('scroll', handleScroll, true)
      window.addEventListener('click', handleScrollOrClick, true)
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('click', handleScrollOrClick, true)
      }
    }
  }, [showReactionPicker])

  useEffect(() => {
    if (userProfile) {
      loadPosts()
      
      // Fallback polling every 5 seconds (reduced from 1 second)
      const pollingInterval = setInterval(() => {
        loadPosts()
      }, 5000)
      
      // Subscribe to realtime changes
      const channel = supabase
        .channel('code_posts_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'code_posts' 
          },
          () => {
            loadPosts()
          }
        )
        .subscribe()
      
      return () => {
        clearInterval(pollingInterval)
        supabase.removeChannel(channel)
      }
    }
  }, [userProfile])

  const loadPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('code_posts')
        .select('*')
        .order('timestamp', { ascending: false })

      if (error) throw error

      if (data) {
        // Load avatars for all post authors
        const authorIds = [...new Set(data.map(post => post.author_id))]
        loadUserAvatars(authorIds)

        setPosts(prev => {
          // Check if data actually changed to prevent unnecessary re-renders
          const hasChanges = JSON.stringify(prev.map(p => ({ id: p.id, timestamp: p.timestamp }))) !== 
                            JSON.stringify(data.map(p => ({ id: p.id, timestamp: p.timestamp })))
          
          if (!hasChanges && prev.length === data.length) {
            return prev // No changes, return same reference
          }

          // Don't overwrite posts that have pending updates
          return data.map(newPost => {
            if (pendingUpdates.has(newPost.id)) {
              // Keep the optimistic version
              const existingPost = prev.find(p => p.id === newPost.id)
              return existingPost || newPost
            }
            return newPost
          })
        })
      }
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }, [pendingUpdates])

  const completeOnboarding = async () => {
    if (!onboardingData.name.trim()) {
      alert('Please enter your name')
      return
    }

    // Check if name is "Dev"
    if (onboardingData.name.trim().toLowerCase() === 'dev') {
      setShowPinModal(true)
      return
    }

    const profile = {
      name: onboardingData.name.trim(),
      avatar: onboardingData.avatar,
      isDev: false
    }

    try {
      // Save to database
      const { error } = await supabase
        .from('users')
        .upsert({
          id: userId,
          name: profile.name,
          avatar: profile.avatar,
          is_dev: profile.isDev
        })

      if (error) throw error

      localStorage.setItem('userProfile', JSON.stringify(profile))
      setUserProfile(profile)
      setShowOnboarding(false)
    } catch (error) {
      console.error('Error saving user profile:', error)
      alert('Failed to save profile. Please try again.')
    }
  }

  const verifyPin = async () => {
    const correctPin = '2548' // เปลี่ยน PIN ตรงนี้
    
    if (pinInput === correctPin) {
      const profile = {
        name: 'Dev',
        avatar: onboardingData.avatar,
        isDev: true
      }

      try {
        // Save to database
        const { error } = await supabase
          .from('users')
          .upsert({
            id: userId,
            name: profile.name,
            avatar: profile.avatar,
            is_dev: profile.isDev
          })

        if (error) throw error

        localStorage.setItem('userProfile', JSON.stringify(profile))
        setUserProfile(profile)
        setShowOnboarding(false)
        setShowPinModal(false)
        setPinInput('')
      } catch (error) {
        console.error('Error saving user profile:', error)
        alert('Failed to save profile. Please try again.')
      }
    } else {
      alert('Incorrect PIN')
      setPinInput('')
    }
  }

  const openSettings = () => {
    if (userProfile) {
      setSettingsData({
        name: userProfile.name,
        avatar: userProfile.avatar
      })
      setShowSettingsModal(true)
    }
  }

  const saveSettings = async () => {
    if (!settingsData.name.trim()) {
      alert('Please enter your name')
      return
    }

    const updatedProfile = {
      ...userProfile!,
      name: settingsData.name.trim(),
      avatar: settingsData.avatar
    }

    try {
      // Update in database
      const { error } = await supabase
        .from('users')
        .update({
          name: updatedProfile.name,
          avatar: updatedProfile.avatar,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      localStorage.setItem('userProfile', JSON.stringify(updatedProfile))
      setUserProfile(updatedProfile)
      setShowSettingsModal(false)
    } catch (error) {
      console.error('Error updating user profile:', error)
      alert('Failed to update profile. Please try again.')
    }
  }

  const handleSettingsAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image must be less than 2MB')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setSettingsData({ ...settingsData, avatar: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image must be less than 2MB')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setOnboardingData({ ...onboardingData, avatar: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const createPost = async () => {
    if (!newPost.code.trim()) {
      return
    }

    setUploading(true)

    const post: Omit<CodePost, 'created_at'> = {
      id: uuidv4(),
      code: newPost.code,
      language: 'plaintext',
      title: newPost.title.trim() || 'Untitled',
      author: userProfile?.name || 'Anonymous',
      author_id: userId,
      timestamp: Date.now(),
      likes: 0,
      liked_by: [],
      copies: 0,
      copied_by: [],
      downloads: 0,
      downloaded_by: [],
      reactions: {}
    }

    try {
      const { error } = await supabase
        .from('code_posts')
        .insert([post])

      if (error) throw error

      // Immediately add to local state for instant feedback
      setPosts(prev => [post, ...prev])

      setNewPost({
        code: '',
        title: '',
        author: ''
      })
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const toggleReaction = async (postId: string, reactionType: ReactionType) => {
    const post = posts.find(p => p.id === postId)
    if (!post || !userProfile) return

    // Initialize reactions as dynamic object
    const reactions: Reactions = post.reactions ? { ...post.reactions } : {}

    // Ensure the reaction type exists
    if (!reactions[reactionType]) {
      reactions[reactionType] = { count: 0, users: [] }
    }

    // Deep clone all reactions
    const updatedReactions: Reactions = {}
    Object.keys(reactions).forEach((key) => {
      updatedReactions[key] = {
        count: reactions[key].count,
        users: [...reactions[key].users]
      }
    })

    // Check if user already reacted with this type
    const hasReacted = updatedReactions[reactionType]?.users.some(u => u.id === userId) || false
    
    // Remove user from all reaction types first
    Object.keys(updatedReactions).forEach((key) => {
      updatedReactions[key].users = updatedReactions[key].users.filter(u => u.id !== userId)
      updatedReactions[key].count = updatedReactions[key].users.length
      
      // Remove reaction type if count is 0
      if (updatedReactions[key].count === 0) {
        delete updatedReactions[key]
      }
    })

    // If not the same reaction, add the new one
    if (!hasReacted) {
      if (!updatedReactions[reactionType]) {
        updatedReactions[reactionType] = { count: 0, users: [] }
      }
      updatedReactions[reactionType].users = [
        ...updatedReactions[reactionType].users, 
        { id: userId, name: userProfile.name }
      ]
      updatedReactions[reactionType].count = updatedReactions[reactionType].users.length
    }

    // Mark as pending
    setPendingUpdates(prev => new Set(prev).add(postId))

    // Optimistic update with new object reference
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, reactions: updatedReactions }
        : p
    ))

    // Close picker
    setShowReactionPicker(null)

    try {
      const { error } = await supabase
        .from('code_posts')
        .update({ reactions: updatedReactions })
        .eq('id', postId)

      if (error) throw error
      
      // Remove from pending after successful update
      setTimeout(() => {
        setPendingUpdates(prev => {
          const newSet = new Set(prev)
          newSet.delete(postId)
          return newSet
        })
      }, 2000)
    } catch (error) {
      console.error('Error toggling reaction:', error)
      setPendingUpdates(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
      // Revert on error
      loadPosts()
    }
  }

  const getActiveReactions = (post: CodePost): ReactionType[] => {
    if (!post.reactions) return []
    
    return (Object.keys(post.reactions) as ReactionType[])
      .filter((key) => post.reactions![key]?.count > 0)
  }

  const confirmDelete = async () => {
    if (!deleteModalPost) return

    // Optimistic update
    setPosts(prev => prev.filter(p => p.id !== deleteModalPost))
    setDeleteModalPost(null)

    try {
      const { error } = await supabase
        .from('code_posts')
        .delete()
        .eq('id', deleteModalPost)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post. Please try again.')
      // Reload on error
      loadPosts()
    }
  }

  const copyCode = async (code: string, postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post) return

    const copiedBy = post.copied_by || []
    const hasCopied = copiedBy.includes(userId)

    // Copy to clipboard
    navigator.clipboard.writeText(code)
    setCopiedPost(postId)
    setTimeout(() => setCopiedPost(null), 2000)

    // Only increment if user hasn't copied before
    if (!hasCopied) {
      const updatedCopiedBy = [...copiedBy, userId]
      const updatedCopies = post.copies + 1

      // Mark as pending
      setPendingUpdates(prev => new Set(prev).add(postId))

      // Optimistic update
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, copies: updatedCopies, copied_by: updatedCopiedBy }
          : p
      ))

      try {
        const { error } = await supabase
          .from('code_posts')
          .update({ 
            copies: updatedCopies,
            copied_by: updatedCopiedBy
          })
          .eq('id', postId)

        if (error) throw error
        
        // Remove from pending after successful update
        setTimeout(() => {
          setPendingUpdates(prev => {
            const newSet = new Set(prev)
            newSet.delete(postId)
            return newSet
          })
        }, 2000)
      } catch (error) {
        console.error('Error updating copy count:', error)
        setPendingUpdates(prev => {
          const newSet = new Set(prev)
          newSet.delete(postId)
          return newSet
        })
        loadPosts()
      }
    }
  }

  const downloadCode = async (code: string, title: string, language: string, postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post) return

    const downloadedBy = post.downloaded_by || []
    const hasDownloaded = downloadedBy.includes(userId)

    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      csharp: 'cs',
      go: 'go',
      rust: 'rs',
      php: 'php',
      ruby: 'rb',
      swift: 'swift',
      kotlin: 'kt',
      html: 'html',
      css: 'css',
      sql: 'sql',
      json: 'json',
      markdown: 'md',
      plaintext: 'txt'
    }

    const extension = extensions[language] || 'txt'
    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}`
    
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // Only increment if user hasn't downloaded before
    if (!hasDownloaded) {
      const updatedDownloadedBy = [...downloadedBy, userId]
      const updatedDownloads = post.downloads + 1

      // Mark as pending
      setPendingUpdates(prev => new Set(prev).add(postId))

      // Optimistic update
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, downloads: updatedDownloads, downloaded_by: updatedDownloadedBy }
          : p
      ))

      try {
        const { error } = await supabase
          .from('code_posts')
          .update({ 
            downloads: updatedDownloads,
            downloaded_by: updatedDownloadedBy
          })
          .eq('id', postId)

        if (error) throw error
        
        // Remove from pending after successful update
        setTimeout(() => {
          setPendingUpdates(prev => {
            const newSet = new Set(prev)
            newSet.delete(postId)
            return newSet
          })
        }, 2000)
      } catch (error) {
        console.error('Error updating download count:', error)
        setPendingUpdates(prev => {
          const newSet = new Set(prev)
          newSet.delete(postId)
          return newSet
        })
        loadPosts()
      }
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  // Load comments for a post
  const loadComments = useCallback(async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw error

      if (data) {
        setComments(prev => ({ ...prev, [postId]: data }))
        
        // Update comment-to-post mapping using ref
        data.forEach(comment => {
          commentPostMapRef.current[comment.id] = postId
        })
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }, [])

  // Add a comment (callback for CommentInput)
  const handleAddComment = useCallback(async (postId: string, content: string) => {
    if (!userProfile) return

    const commentId = uuidv4()
    const comment: Omit<Comment, 'created_at' | 'updated_at'> = {
      id: commentId,
      post_id: postId,
      user_id: userId,
      user_name: userProfile.name,
      user_avatar: userProfile.avatar || null,
      content
    }

    try {
      const { error } = await supabase
        .from('comments')
        .insert([comment])

      if (error) throw error

      // Update comment-to-post mapping using ref
      commentPostMapRef.current[commentId] = postId

      // Reload comments
      loadComments(postId)

      // Update post comment count optimistically
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, comment_count: (p.comment_count || 0) + 1 }
          : p
      ))
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Failed to add comment. Please try again.')
    }
  }, [userProfile, userId, loadComments])

  // Delete a comment
  // Delete a comment
  const deleteComment = async (commentId: string, postId: string) => {
    try {
      // Optimistically remove from UI first
      setComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
      }))

      // Update post comment count optimistically
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, comment_count: Math.max((p.comment_count || 0) - 1, 0) }
          : p
      ))

      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      // Reload to sync with database
      loadComments(postId)
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment. Please try again.')
      // Reload on error to revert optimistic update
      loadComments(postId)
    }
  }

  // Toggle comments section
  const toggleComments = (postId: string) => {
    if (showComments === postId) {
      setShowComments(null)
    } else {
      setShowComments(postId)
      if (!comments[postId]) {
        loadComments(postId)
      }
    }
  }

  // Subscribe to realtime comments updates for ALL posts (only once)
  useEffect(() => {
    // Subscribe to ALL comment changes (not filtered by post)
    const channel = supabase
      .channel('all_comments', {
        config: {
          broadcast: { self: true }
        }
      })
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments'
        },
        (payload) => {
          let postId: string | null = null
          let commentId: string | null = null
          
          // Get post_id and comment_id
          if (payload.new && 'post_id' in payload.new) {
            postId = (payload.new as any).post_id
            commentId = (payload.new as any).id
            
            // Update mapping for new comments using ref
            if (commentId && postId) {
              commentPostMapRef.current[commentId] = postId
            }
          } else if (payload.old && 'id' in payload.old) {
            // For DELETE, get post_id from our mapping
            commentId = (payload.old as any).id
            if (commentId) {
              postId = commentPostMapRef.current[commentId] || null
            }
          }
          
          if (!postId) return
          
          // Reload comments for this post
          loadComments(postId)
          
          // Update comment count
          if (payload.eventType === 'INSERT') {
            setPosts(prev => prev.map(p =>
              p.id === postId
                ? { ...p, comment_count: (p.comment_count || 0) + 1 }
                : p
            ))
          } else if (payload.eventType === 'DELETE') {
            setPosts(prev => prev.map(p =>
              p.id === postId
                ? { ...p, comment_count: Math.max((p.comment_count || 0) - 1, 0) }
                : p
            ))
            
            // Clean up mapping using ref
            if (commentId) {
              delete commentPostMapRef.current[commentId]
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadComments]) // Only depends on loadComments (stable) // Now depends on stable loadComments

  // Load comments when opening comment section
  useEffect(() => {
    if (showComments) {
      loadComments(showComments)
    }
  }, [showComments, loadComments])

  return (
    <>
      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className={`${
            theme === 'dark' ? 'bg-[#161b22]' : 'bg-white'
          } rounded-3xl shadow-2xl max-w-md w-full p-8`}>
            <div className="text-center mb-8">
              <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Welcome to CodeShare
              </h2>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Let's set up your profile
              </p>
            </div>

            <div className="space-y-6">
              {/* Avatar Upload - Centered */}
              <div className="flex flex-col items-center">
                <label className={`block text-sm font-semibold mb-4 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                  Profile Picture <span className={`text-sm font-normal ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>(optional)</span>
                </label>
                
                <label className="cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  {onboardingData.avatar ? (
                    <div className="relative">
                      <img 
                        src={onboardingData.avatar} 
                        alt="Avatar" 
                        className="w-32 h-32 rounded-full object-cover border-4 border-blue-500 group-hover:border-blue-600 transition-all shadow-xl"
                      />
                      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 group-hover:from-gray-500 group-hover:to-gray-700 flex items-center justify-center text-white text-4xl font-bold transition-all shadow-xl border-4 ${
                      theme === 'dark' ? 'border-[#30363d] group-hover:border-blue-500' : 'border-gray-300 group-hover:border-blue-500'
                    }`}>
                      {onboardingData.name.charAt(0).toUpperCase() || (
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </div>
                  )}
                </label>
                <p className={`mt-3 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                  Click to upload • Max 2MB
                </p>
              </div>

              {/* Name Input */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={onboardingData.name}
                  onChange={(e) => setOnboardingData({ ...onboardingData, name: e.target.value })}
                  placeholder="Enter your name"
                  className={`w-full px-5 py-3.5 rounded-xl border-2 ${
                    theme === 'dark'
                      ? 'bg-[#0d1117] border-[#30363d] text-white placeholder-gray-500 focus:border-blue-500'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                  } focus:ring-4 focus:ring-blue-500/20 transition-all outline-none`}
                  autoFocus
                />
              </div>

              {/* Preview */}
              {onboardingData.name && (
                <div className={`p-4 rounded-xl border-2 ${
                  theme === 'dark' ? 'bg-[#0d1117] border-[#30363d]' : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className={`text-xs font-semibold mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    PREVIEW
                  </p>
                  <div className="flex items-center space-x-3">
                    {onboardingData.avatar ? (
                      <img 
                        src={onboardingData.avatar} 
                        alt="Preview" 
                        className="w-11 h-11 rounded-full object-cover shadow-lg border-2 border-blue-500"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {onboardingData.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {onboardingData.name}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                        Just now
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={completeOnboarding}
                disabled={!onboardingData.name.trim()}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-xl transition-all font-bold text-lg shadow-xl"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Modal for Dev */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[80] p-4">
          <div className={`${
            theme === 'dark' ? 'bg-[#161b22]' : 'bg-white'
          } rounded-3xl shadow-2xl max-w-sm w-full p-8`}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Dev Access
              </h2>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Enter PIN to continue as Dev
              </p>
            </div>

            <div className="space-y-6">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && verifyPin()}
                placeholder="Enter PIN"
                maxLength={4}
                autoComplete="new-password"
                data-lpignore="true"
                data-form-type="other"
                className={`w-full px-5 py-3.5 rounded-xl border-2 text-center text-2xl tracking-widest ${
                  theme === 'dark'
                    ? 'bg-[#0d1117] border-[#30363d] text-white placeholder-gray-500 focus:border-red-500'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-red-500'
                } focus:ring-4 focus:ring-red-500/20 transition-all outline-none`}
                autoFocus
              />

              <div className="flex space-x-3">
                <button
                  onClick={verifyPin}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl transition-all font-bold shadow-xl"
                >
                  Verify
                </button>
                <button
                  onClick={() => {
                    setShowPinModal(false)
                    setPinInput('')
                    setOnboardingData({ name: '', avatar: '' })
                  }}
                  className={`px-6 py-3 rounded-xl transition-all font-semibold ${
                    theme === 'dark'
                      ? 'bg-[#21262d] hover:bg-[#30363d] text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0d1117]' : 'bg-gray-50'} transition-colors duration-300`}>
      <header className={`sticky top-0 z-50 backdrop-blur-xl ${
        theme === 'dark' ? 'bg-[#161b22]/90 border-[#30363d]' : 'bg-white/90 border-gray-200'
      } border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="relative">
              </div>
              <div>
                <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  CodeShare
                </h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                  Community Code Snippets
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="group relative px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Post</span>
                </span>
              </button>

              <button
                onClick={openSettings}
                className={`p-2.5 rounded-xl transition-all ${
                  theme === 'dark' 
                    ? 'bg-[#21262d] hover:bg-[#30363d] text-gray-300' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="relative mb-4">
              <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Loading posts...
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className={`text-center py-40 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <div className="relative inline-block mb-8">
              <svg className="w-32 h-32 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h2 className={`text-3xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              No posts yet
            </h2>
            <p className="text-lg mb-8">Be the first to share your code with the community</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all font-semibold shadow-lg"
            >
              Create First Post
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {posts.map((post) => {
              const isCopied = copiedPost === post.id
              
              return (
                <article
                  key={post.id}
                  className={`group ${
                    theme === 'dark' ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-gray-200'
                  } rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          {userAvatars[post.author_id]?.avatar ? (
                            <img 
                              src={userAvatars[post.author_id].avatar} 
                              alt={post.author}
                              className="w-12 h-12 rounded-full object-cover shadow-lg border-2 border-blue-500"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                              {post.author.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {post.author}
                          </h3>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                            {formatTimestamp(post.timestamp)}
                          </p>
                        </div>
                      </div>
                      {(post.author_id === userId || userProfile?.isDev) && (
                        <button
                          onClick={() => setDeleteModalPost(post.id)}
                          className={`p-2 rounded-lg transition-all ${
                            theme === 'dark' 
                              ? 'text-gray-500 hover:text-red-400 hover:bg-red-400/10' 
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {post.title}
                    </h2>
                  </div>

                  <div className={`${expandedPost === post.id ? 'h-[600px]' : 'h-80'} transition-all duration-500 border-y ${
                    theme === 'dark' ? 'border-[#30363d]' : 'border-gray-200'
                  }`}>
                    <Editor
                      height="100%"
                      language={post.language}
                      value={post.code}
                      theme={theme === 'dark' ? 'vs-dark' : 'light'}
                      loading={
                        <div className="flex items-center justify-center h-full">
                          <div className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            Loading...
                          </div>
                        </div>
                      }
                      options={{
                        readOnly: true,
                        minimap: { enabled: expandedPost === post.id },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: 'on',
                        padding: { top: 20, bottom: 20 },
                        renderLineHighlight: 'none',
                        overviewRulerBorder: false,
                        hideCursorInOverviewRuler: true,
                        smoothScrolling: true,
                        scrollbar: {
                          vertical: 'auto',
                          horizontal: 'auto',
                          alwaysConsumeMouseWheel: false, // Allow page scroll when mouse is over editor
                        },
                      }}
                      beforeMount={(monaco) => {
                        // Disable all language validation
                        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                          noSemanticValidation: true,
                          noSyntaxValidation: true,
                        })
                        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                          noSemanticValidation: true,
                          noSyntaxValidation: true,
                        })
                      }}
                    />
                  </div>

                  <div className="p-5">
                    {/* Reactions Display (Facebook/Discord style) */}
                    <div className="space-y-3 mb-4">
                      {/* Emoji Summary - Show active reactions */}
                      {getActiveReactions(post).length > 0 && (
                        <div className="flex items-center flex-wrap gap-1.5">
                          {getActiveReactions(post).map((reactionType) => {
                            const reaction = post.reactions?.[reactionType]
                            if (!reaction || reaction.count === 0) return null
                            
                            const hasReacted = reaction.users.some(u => u.id === userId)
                            const isTooltipVisible = showReactionTooltip?.postId === post.id && showReactionTooltip?.reactionType === reactionType
                            
                            return (
                              <div key={reactionType} className="relative">
                                <button
                                  onClick={() => toggleReaction(post.id, reactionType)}
                                  onMouseEnter={() => setShowReactionTooltip({ postId: post.id, reactionType })}
                                  onMouseLeave={() => setShowReactionTooltip(null)}
                                  className={`group flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 ${
                                    hasReacted
                                      ? theme === 'dark'
                                        ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                                        : 'bg-blue-50 border border-blue-500/50 text-blue-600'
                                      : theme === 'dark'
                                      ? 'bg-[#21262d] border border-[#30363d] text-gray-400 hover:bg-[#30363d] hover:border-[#3f4147]'
                                      : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
                                  }`}
                                >
                                  <span className="text-base leading-none">{reactionEmojis[reactionType]}</span>
                                  <span className={`text-xs font-semibold leading-none ${hasReacted ? 'text-blue-500' : ''}`}>
                                    {reaction.count}
                                  </span>
                                </button>
                                
                                {/* Custom Tooltip */}
                                {isTooltipVisible && (
                                  <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg shadow-xl z-50 whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-200 ${
                                    theme === 'dark' ? 'bg-[#2b2d31] border border-[#3f4147] text-gray-200' : 'bg-white border border-gray-200 text-gray-800'
                                  }`}>
                                    <div className="text-xs font-medium">
                                      {reaction.users.map(u => u.name).join(', ')}
                                    </div>
                                    {/* Arrow */}
                                    <div className={`absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 rotate-45 ${
                                      theme === 'dark' ? 'bg-[#2b2d31] border-r border-b border-[#3f4147]' : 'bg-white border-r border-b border-gray-200'
                                    }`} />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Add Reaction Button */}
                      <div className="relative">
                        <button
                          data-reaction-button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowReactionPicker(showReactionPicker === post.id ? null : post.id)
                          }}
                          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all hover:scale-110 ${
                            showReactionPicker === post.id
                              ? theme === 'dark'
                                ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400'
                                : 'bg-blue-50 border-2 border-blue-500 text-blue-600'
                              : theme === 'dark'
                              ? 'bg-[#21262d] border-2 border-[#30363d] text-gray-400 hover:bg-[#30363d] hover:border-[#3f4147] hover:text-gray-300'
                              : 'bg-gray-50 border-2 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>

                        {/* Emoji Picker (Facebook style - simple) */}
                        {showReactionPicker === post.id && (
                          <div 
                            data-reaction-picker
                            className={`absolute bottom-full left-0 mb-2 ${
                              theme === 'dark' ? 'bg-[#2b2d31] border-[#3f4147]' : 'bg-white border-gray-200'
                            } border-2 rounded-2xl shadow-2xl p-3 z-50 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              {(['like', 'love', 'wow', 'sad', 'angry'] as ReactionType[]).map((reaction) => {
                                const hasReacted = post.reactions?.[reaction]?.users.some(u => u.id === userId)
                                
                                return (
                                  <button
                                    key={reaction}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleReaction(post.id, reaction)
                                    }}
                                    className={`relative p-2 rounded-full transition-all hover:scale-125 hover:-translate-y-1 ${
                                      hasReacted
                                        ? theme === 'dark'
                                          ? 'bg-blue-500/20 ring-2 ring-blue-500'
                                          : 'bg-blue-100 ring-2 ring-blue-500'
                                        : theme === 'dark'
                                        ? 'hover:bg-[#35373c]'
                                        : 'hover:bg-gray-100'
                                    }`}
                                    title={reaction}
                                  >
                                    <span className="text-3xl leading-none block">{reactionEmojis[reaction]}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyCode(post.code, post.id)}
                        className={`group flex items-center space-x-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                          isCopied
                            ? theme === 'dark'
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-green-50 text-green-600'
                            : theme === 'dark'
                            ? 'text-gray-400 hover:bg-[#21262d]'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {isCopied ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          )}
                        </svg>
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          ({post.copies.toLocaleString()})
                        </span>
                      </button>

                      <button
                        onClick={() => downloadCode(post.code, post.title, post.language, post.id)}
                        className={`group flex items-center space-x-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                          theme === 'dark'
                            ? 'text-gray-400 hover:bg-[#21262d]'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download</span>
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          ({post.downloads.toLocaleString()})
                        </span>
                      </button>

                      <button
                        onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                        className={`group flex items-center space-x-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                          theme === 'dark'
                            ? 'text-gray-400 hover:bg-[#21262d]'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <svg className={`w-4 h-4 transition-transform duration-300 ${expandedPost === post.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        <span>{expandedPost === post.id ? 'Collapse' : 'Expand'}</span>
                      </button>

                      <button
                        onClick={() => toggleComments(post.id)}
                        className={`group flex items-center space-x-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                          showComments === post.id
                            ? theme === 'dark'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-blue-50 text-blue-600'
                            : theme === 'dark'
                            ? 'text-gray-400 hover:bg-[#21262d]'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>Comment</span>
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          ({(post.comment_count || 0).toLocaleString()})
                        </span>
                      </button>
                    </div>

                    {/* Comments Section */}
                    {showComments === post.id && (
                      <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-[#30363d]' : 'border-gray-200'}`}>
                        {/* Comment Input */}
                        <CommentInput
                          postId={post.id}
                          userProfile={userProfile}
                          theme={theme}
                          onSubmit={handleAddComment}
                        />

                        {/* Comments List */}
                        <div className="space-y-3">
                          {comments[post.id]?.map((comment) => (
                            <div key={comment.id} className={`flex items-start space-x-3 p-3 rounded-lg ${
                              theme === 'dark' ? 'bg-[#0d1117]' : 'bg-gray-50'
                            }`}>
                              {comment.user_avatar ? (
                                <img 
                                  src={comment.user_avatar} 
                                  alt={comment.user_name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-sm">
                                  {comment.user_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                      {comment.user_name}
                                    </span>
                                    <span className={`text-xs ml-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                      {formatTimestamp(new Date(comment.created_at).getTime())}
                                    </span>
                                  </div>
                                  {(comment.user_id === userId || userProfile?.isDev) && (
                                    <button
                                      onClick={() => deleteComment(comment.id, post.id)}
                                      className={`text-xs ${theme === 'dark' ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-600'} transition-colors`}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                                <p className={`text-sm mt-1 whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))}
                          {comments[post.id]?.length === 0 && (
                            <p className={`text-center text-sm py-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                              No comments yet. Be the first to comment!
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${
            theme === 'dark' ? 'bg-[#0d1117] border-[#21262d]' : 'bg-white border-gray-100'
          } rounded-2xl border shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden`}>
            {/* Header */}
            <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-[#21262d]' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Share Your Code
                    </h2>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                      Post your code snippet to the community
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`p-2 rounded-lg transition-all ${
                    theme === 'dark' ? 'text-gray-500 hover:text-white hover:bg-[#21262d]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className={`flex-1 overflow-y-auto px-6 py-5 ${theme === 'dark' ? 'dark-scrollbar' : 'light-scrollbar'}`}>
              <div className="space-y-5">
                {/* Title Input */}
                <div>
                  <label className={`flex items-center space-x-2 text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>TITLE</span>
                    <span className={`text-xs font-normal ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    placeholder="Give your code a descriptive title..."
                    className={`w-full px-4 py-3 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#161b22] border-[#21262d] text-white placeholder-gray-600 focus:border-blue-500'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                    } focus:ring-2 focus:ring-blue-500/20 transition-all outline-none`}
                  />
                </div>

                {/* Code Editor */}
                <div>
                  <label className={`flex items-center space-x-2 text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span>CODE</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className={`border rounded-lg overflow-hidden ${
                    theme === 'dark' ? 'border-[#21262d]' : 'border-gray-200'
                  }`} style={{ height: '450px' }}>
                    <Editor
                      height="100%"
                      defaultLanguage="javascript"
                      value={newPost.code}
                      onChange={(value) => setNewPost({ ...newPost, code: value || '' })}
                      theme={theme === 'dark' ? 'vs-dark' : 'light'}
                      loading={
                        <div className="flex items-center justify-center h-full">
                          <div className="flex flex-col items-center space-y-3">
                            <div className="w-10 h-10 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                              Loading editor...
                            </div>
                          </div>
                        </div>
                      }
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        wordWrap: 'on',
                        formatOnPaste: true,
                        formatOnType: true,
                        padding: { top: 16, bottom: 16 },
                        smoothScrolling: true,
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on',
                        scrollbar: {
                          vertical: 'auto',
                          horizontal: 'auto',
                          verticalScrollbarSize: 8,
                          horizontalScrollbarSize: 8,
                          alwaysConsumeMouseWheel: false, // Allow page scroll when mouse is over editor
                        },
                      }}
                      beforeMount={(monaco) => {
                        // Disable all language validation
                        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                          noSemanticValidation: true,
                          noSyntaxValidation: true,
                        })
                        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                          noSemanticValidation: true,
                          noSyntaxValidation: true,
                        })
                      }}
                    />
                  </div>
                  {!newPost.code.trim() && (
                    <p className={`mt-2 text-xs flex items-center space-x-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Start typing or paste your code here</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-[#21262d] bg-[#0d1117]' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center justify-end">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    disabled={uploading}
                    className={`px-5 py-2.5 rounded-lg transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                      theme === 'dark'
                        ? 'bg-[#21262d] hover:bg-[#30363d] text-gray-300'
                        : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createPost}
                    disabled={!newPost.code.trim() || uploading}
                    className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-all font-semibold text-sm shadow-lg hover:shadow-xl hover:shadow-green-500/20 hover:scale-[1.02] disabled:hover:scale-100 flex items-center justify-center space-x-2 min-w-[130px]"
                  >
                    {uploading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Publish Post</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className={`${
            theme === 'dark' ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-gray-200'
          } rounded-2xl border shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Settings
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className={`p-2 rounded-lg transition-all ${
                  theme === 'dark' 
                    ? 'text-gray-400 hover:text-white hover:bg-[#30363d]' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Theme Toggle */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                  Theme
                </label>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center space-x-2 ${
                      theme === 'light'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                        : theme === 'dark'
                        ? 'border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-blue-500/50'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-blue-500/50'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="font-medium">Light</span>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center space-x-2 ${
                      theme === 'dark'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-blue-500/50'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    <span className="font-medium">Dark</span>
                  </button>
                </div>
              </div>

              {/* Profile Picture */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                  Profile Picture
                </label>
                <div className="flex items-center space-x-4">
                  <label className="cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSettingsAvatarUpload}
                      className="hidden"
                    />
                    {settingsData.avatar ? (
                      <div className="relative">
                        <img 
                          src={settingsData.avatar} 
                          alt="Avatar" 
                          className="w-20 h-20 rounded-full object-cover border-4 border-blue-500 group-hover:border-blue-600 transition-all shadow-lg"
                        />
                        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 group-hover:from-gray-500 group-hover:to-gray-700 flex items-center justify-center text-white text-2xl font-bold transition-all shadow-lg border-4 ${
                        theme === 'dark' ? 'border-[#30363d] group-hover:border-blue-500' : 'border-gray-300 group-hover:border-blue-500'
                      }`}>
                        {settingsData.name.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </label>
                  <div className="flex-1">
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                      Click to change your profile picture
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      Max 2MB • JPG, PNG, GIF
                    </p>
                  </div>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={settingsData.name}
                  onChange={(e) => setSettingsData({ ...settingsData, name: e.target.value })}
                  placeholder="Enter your name"
                  className={`w-full px-4 py-3 rounded-xl border-2 ${
                    theme === 'dark'
                      ? 'bg-[#0d1117] border-[#30363d] text-white placeholder-gray-500 focus:border-blue-500'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                  } focus:ring-4 focus:ring-blue-500/20 transition-all outline-none`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={saveSettings}
                  disabled={!settingsData.name.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-xl transition-all font-semibold shadow-lg"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className={`px-6 py-3 rounded-xl transition-all font-semibold ${
                    theme === 'dark'
                      ? 'bg-[#21262d] hover:bg-[#30363d] text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteModal
        show={deleteModalPost !== null}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalPost(null)}
        theme={theme}
      />
    </div>
    </>
  )
}

export default App
