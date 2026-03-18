import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface Parecer {
    id: string
    user_id: string
    title: string
    description: string | null
    content: string | null
    created_at: string
}
