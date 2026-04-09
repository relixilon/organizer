import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null

/**
 * Returns a lazily-constructed Supabase client. Throws on first call if the
 * required env vars are missing — fast feedback during dev without breaking
 * test imports that inject their own client.
 */
export function getSupabase(): SupabaseClient {
  if (cached) return cached
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment. ' +
        'Copy .env.example to .env.local and fill in your Supabase project credentials.',
    )
  }
  cached = createClient(url, anonKey)
  return cached
}
