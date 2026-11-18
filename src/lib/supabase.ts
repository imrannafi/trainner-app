import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Vite only exposes variables whose prefix is listed in `envPrefix` (vite.config.ts: VITE_ and NEXT_PUBLIC_).
// Several names are accepted so the app works whichever naming the hosting provider was set up with.
// Only public values belong here: the project URL and the publishable / anon key. Never the service-role key.
const firstSet = (...values: Array<string | undefined>) =>
  values.map((v) => (typeof v === 'string' ? v.trim() : '')).find((v) => v.length > 0);

const env = import.meta.env as Record<string, string | undefined>;

const url = firstSet(env.VITE_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_URL);
const anonKey = firstSet(
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  env.VITE_SUPABASE_ANON_KEY,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const isSupabaseConfigured = Boolean(url && anonKey);

// Created with placeholders when unconfigured so imports never throw; App shows a setup screen instead.
export const supabase: SupabaseClient = createClient(
  url || 'http://localhost:54321',
  anonKey || 'missing-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }
);
