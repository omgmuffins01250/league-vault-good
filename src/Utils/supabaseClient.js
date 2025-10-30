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

// save or update 1 league for current user (old way – full payload in DB)
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

// ================== NEW STORAGE-AWARE HELPERS ==================

// 1) upload BIG JSON to Storage
export async function uploadLeagueBlob({ userId, leagueKey, blob }) {
  if (!userId) throw new Error('uploadLeagueBlob: missing userId');
  if (!leagueKey) throw new Error('uploadLeagueBlob: missing leagueKey');

  const path = `${userId}/${leagueKey}.json`;

  const { error } = await supabase.storage
    .from('league-payloads')
    .upload(path, blob, {
      upsert: true,
      contentType: 'application/json',
    });

  if (error) {
    console.error('[supabase] uploadLeagueBlob failed', error);
    throw error;
  }

  return { path };
}

// 2) write the SMALL row to public.leagues, pointing to Storage
export async function saveLeagueRow({ userId, leagueKey, leagueName, storagePath, meta = {} }) {
  const { error } = await supabase
    .from('leagues')
    .upsert(
      {
        user_id: userId,
        league_key: leagueKey,
        league_name: leagueName,
        payload: {
          ...meta,
          storage_path: storagePath,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,league_key' }
    );

  if (error) {
    console.error('[supabase] saveLeagueRow failed', error);
    throw error;
  }
}

// 3) one-shot helper: take a full league payload → storage + row
export async function saveFullLeagueToSupabase(fullLeaguePayload) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not signed in – cannot save league');
  }

  const leagueKey =
    fullLeaguePayload.leagueKey ||
    fullLeaguePayload.league_id ||
    fullLeaguePayload.leagueId ||
    fullLeaguePayload.league_key ||
    'UNKNOWN_LEAGUE';

  const leagueName =
    fullLeaguePayload.leagueName ||
    fullLeaguePayload.league_name ||
    fullLeaguePayload.name ||
    'Unknown League';

  const json = JSON.stringify(fullLeaguePayload);
  const blob = new Blob([json], { type: 'application/json' });

  const { path } = await uploadLeagueBlob({
    userId: user.id,
    leagueKey,
    blob,
  });

  await saveLeagueRow({
    userId: user.id,
    leagueKey,
    leagueName,
    storagePath: path,
    meta: {
      platform: fullLeaguePayload.platform,
      seasons: fullLeaguePayload.seasons,
    },
  });

  console.log('[supabase] saved league via storage →', { leagueKey, path });
}

// 👇 ADD THIS SO YOU CAN CALL IT FROM THE BROWSER CONSOLE ON PROD
if (typeof window !== 'undefined') {
  window.__saveFullLeagueToSupabase = saveFullLeagueToSupabase;
}
