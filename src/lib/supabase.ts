import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.error('Missing Supabase environment variables:', {
    VITE_SUPABASE_URL: supabaseUrl || 'NOT SET',
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'SET' : 'NOT SET'
  })
}

// Only create client if properly configured
// Otherwise create a mock client that will be caught by the UI
let supabaseClient: SupabaseClient | null = null

if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
}

// Export a proxy that throws helpful errors if not configured
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!supabaseClient) {
      throw new Error('Supabase is not configured. Please check environment variables.')
    }
    return supabaseClient[prop as keyof SupabaseClient]
  }
})