import { createClient } from '@supabase/supabase-js';

// Pulled from your .env (Vite requires VITE_ prefix)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a single client for the whole app
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,        // stay logged in on refresh
    autoRefreshToken: true,      // keep session fresh
    detectSessionInUrl: true,    // handle email-link/OAuth redirects if you enable them
  },
});

// TEMP: expose client for quick console testing (remove later)
if (typeof window !== 'undefined') {
  window.__sb = supabase;
}
