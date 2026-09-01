import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type ReactionType = 'like' | 'love' | 'wow' | 'sad' | 'angry'

export interface ReactionUser {
  id: string
  name: string
}

export interface Reactions {
  [key: string]: { count: number; users: ReactionUser[] }
}

export interface CodePost {
  id: string
  code: string
  language: string
  title: string
  author: string
  author_id: string
  timestamp: number
  likes: number
  liked_by: string[]
  copies: number
  copied_by: string[]
  downloads: number
  downloaded_by: string[]
  reactions?: Reactions
  comment_count?: number
  created_at?: string
  edited_at?: string
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  user_name: string
  user_avatar: string | null
  content: string
  created_at: string
  updated_at: string
}

export interface PostEditHistory {
  id: string
  post_id: string
  old_code: string
  new_code: string
  old_title: string
  new_title: string
  created_at: string
}
