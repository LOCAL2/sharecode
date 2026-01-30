import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  created_at?: string
}
