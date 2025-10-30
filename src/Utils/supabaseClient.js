import { createClient } from '@supabase/supabase-js';

// Grab environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Expose globally for quick console testing
if (typeof window !== 'undefined') {
  window.__sb = supabase;
  console.log('✅ Supabase client ready:', SUPABASE_URL);
}
