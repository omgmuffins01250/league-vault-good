import { createClient } from '@supabase/supabase-js';

// These values will come from your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // keep user logged in on refresh
    autoRefreshToken: true,      // refresh tokens automatically
    detectSessionInUrl: true,    // handle auth redirects
  },
});
