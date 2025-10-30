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

// ------------ helpers we can reuse everywhere ------------

// save or update 1 league for current user
export async function saveLeagueForCurrentUser({ league_key, league_name, payload }) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { error: userErr || new Error('Not signed in') };
  }

  const { error } = await supabase
    .from('leagues')
    .upsert(
      {
        user_id: user.id,
        league_key,
        league_name,
        payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,league_key' }
    );

  return { error };
}

// get all leagues for current user
export async function getLeaguesForCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: null };

  const { data, error } = await supabase
    .from('leagues')
    .select('league_key, league_name, payload, updated_at')
    .order('updated_at', { ascending: false });

  return { data: data || [], error };
}
