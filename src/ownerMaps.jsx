
let _cache = {};     // { [season:number]: { [teamId:number|string]: { name: "Owner Name", ownerId: string|null, teamId: number } } }
let _aliasMap = null; // Map<normalized alias, "Owner Name"> (global canonicalizer)
let _lastKey = "";

// ----------------------- helpers ------------------------------
const _norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[\s._-]+/g, "")     // smash spaces/._- together
    .replace(/[^a-z0-9]/g, "");   // strip everything else

function _canonFromMergeHelpers(leagueLike) {
  const leagueId =
    leagueLike?.meta?.id ??
    leagueLike?.meta?.leagueId ??
    leagueLike?.meta?.espnLeagueId ??
    null;

  // returns a function(name) -> canonical name OR null
  return (name) => {
    try {
      const mh = (typeof window !== "undefined" && window.FL_mergeHelpers) || {};
      const map =
        leagueId && typeof mh.loadMergeMap === "function"
          ? mh.loadMergeMap(leagueId)
          : {};
      if (typeof mh.canonicalize === "function") {
        const c = mh.canonicalize(String(name || ""), map || {});
        return c || null;
      }
    } catch {}
    return null;
  };
}

// try to read the ESPN league JSON you already have in the app.
// we support multiple stash locations to be flexible.
function _readEspnSeasons() {
  // 1) window.__FL_ESPN (preferred if you set this anywhere)
  try {
    const s = (typeof window !== "undefined" && window.__FL_ESPN?.seasons) || null;
    if (Array.isArray(s)) return s;
  } catch {}
  // 1b) window.__espnSeasons (flat array stash)
  try {
    const s = (typeof window !== "undefined" && window.__espnSeasons) || null;
    if (Array.isArray(s)) return s;
  } catch {}
  

  // 2) window.__FL_PAYLOAD (some apps stash here)
  try {
    const s = (typeof window !== "undefined" && window.__FL_PAYLOAD?.seasons) || null;
    if (Array.isArray(s)) return s;
  } catch {}

  // 3) window.name (your prior approach)
  try {
    const payload = JSON.parse(
      (typeof window !== "undefined" ? window.name : "") || "{}"
    );
    return Array.isArray(payload?.seasons) ? payload.seasons : [];
  } catch {}

  return [];
}

// Useful for joining by ESPNs team display name (location + nickname)
const _normTeamName = (t) => {
  const nm =
    (t?.location && t?.nickname
      ? `${t.location} ${t.nickname}`.trim()
      : t?.name || `Team ${t?.id ?? ""}`) || "";
  return _norm(nm);
};

// Build a lookup from *any* teamNameByOwner structure we may already have
function _buildNameKeyToOwner(src, season, canonOwner) {
  const out = {};
  Object.entries(src || {}).forEach(([owner, byYear]) => {
    const teamName = byYear?.[Number(season)];
    if (!teamName) return;
    const key = _norm(String(teamName));
    if (key) out[key] = canonOwner(owner);
  });
  return out;
}

// ----------------------- canonicalizer ------------------------
/**
 * Build a global alias map:
 * - Owners list (league.owners)
 * - ESPN members: displayName, first+last, nickname
 * - manualAliases (param)
 * - merge-helpers canonicalizer (if present)
 */
function _buildAliasMap({ league, selectedLeague, manualAliases }) {
  const map = new Map();
  const add = (alias, target) => {
    const k = _norm(alias);
    const v = String(target || "").trim();
    if (!k || !v) return;
    if (map.has(k) && map.get(k) !== v) return; // don't fight existing winner
    map.set(k, v);
  };

  const candidates = [league, selectedLeague].filter(Boolean);

  // owners array (often your preferred display)
  candidates.forEach((lg) => (lg?.owners || []).forEach((o) => add(o, o)));

  // ESPN members: displayName + first/last + nickname
  const seasons = _readEspnSeasons();
  // prefer the current season's members block if present
  const seasonObj =
    seasons.find((s) => Array.isArray(s?.members) && s.members.length) || null;

  if (seasonObj) {
    (seasonObj.members || []).forEach((m) => {
      const disp = (m?.displayName || "").toString().trim();
      const real = [m?.firstName, m?.lastName].filter(Boolean).join(" ").trim();
      const best = real || disp || "Unknown";
      if (disp) add(disp, best);
      if (real) add(real, best);
      if (m?.nickname) add(m.nickname, best);
      if (m?.userName) add(m.userName, best);
      if (m?.username) add(m.username, best);
    });
  }

  // manual overrides LAST (highest priority)
  Object.entries(manualAliases || {}).forEach(([alias, target]) => add(alias, target));

  return map;
}

// exported
export function canonicalizeOwner(raw) {
  const k = _norm(raw);
  if (!k) return String(raw || "").trim();
  if (_aliasMap && _aliasMap.has(k)) return _aliasMap.get(k);
  return String(raw || "").trim();
}

// ----------------------- season map builder -------------------
function _buildSeasonMap({
  season,
  league,
  selectedLeague,
  espnOwnerByTeamByYear,
  canonOwner,
}) {
  const s = Number(season);
  const out = {};

  // 1) explicit per-season map passed in
  const direct = espnOwnerByTeamByYear?.[s];
  if (direct && Object.keys(direct).length) {
    Object.entries(direct).forEach(([tid, nm]) => {
      out[tid] = { name: canonOwner(nm), ownerId: null, teamId: Number(tid) };
    });
  }
  
  // 2) reuse maps produced elsewhere in the app
  const reuse = [
    league?.ownerByTeamByYear?.[s],
    selectedLeague?.ownerByTeamByYear?.[s],
    league?.ownersByTeamByYear?.[s],
    selectedLeague?.ownersByTeamByYear?.[s],
  ];
  for (const cand of reuse) {
    if (!cand) continue;
    Object.entries(cand).forEach(([tid, nm]) => {
      if (!out[tid]) out[tid] = { name: canonOwner(nm), ownerId: null, teamId: Number(tid) };
    });
  }
  

  // 3) team-name join using teamNamesByOwner (if you maintain it)
  const seasons = _readEspnSeasons();
  const seasonObj = seasons.find((ss) => Number(ss?.seasonId) === s);

  const tnameJoin =
    _buildNameKeyToOwner(league?.teamNamesByOwner, s, canonOwner) || {};
  const tnameJoin2 =
    _buildNameKeyToOwner(selectedLeague?.teamNamesByOwner, s, canonOwner) || {};
  const nameKeyToOwner = { ...tnameJoin, ...tnameJoin2 };

  if (seasonObj && Object.keys(nameKeyToOwner).length) {
    (seasonObj.teams || []).forEach((t) => {
      const teamId = t?.id;
      if (teamId == null || out[teamId]) return;
      const key = _normTeamName(t);
      const owner = nameKeyToOwner[key];
      if (owner) out[teamId] = { name: canonOwner(owner), ownerId: null, teamId: Number(teamId) };
    });
  }
  

 // 4) map teamId → ownerId (GUID) and name using members + teams
if (seasonObj) {
  // GUID → best real/display name
  const guidToName = new Map();
  (seasonObj.members || []).forEach((m) => {
    const real = [m?.firstName, m?.lastName].filter(Boolean).join(" ").trim();
    const disp = (m?.displayName || "").toString().trim();
    const best = real || disp || "Unknown";
    if (m?.id) guidToName.set(m.id, best);
  });

  (seasonObj.teams || []).forEach((t) => {
    const teamId = t?.id;
    if (teamId == null) return;
  
    const guid = (Array.isArray(t?.owners) && t.owners[0]) || t?.primaryOwner || null;
    const bestName = guid ? guidToName.get(guid) : null;
  
    // Ensure an entry object exists
    if (!out[teamId]) out[teamId] = { name: null, ownerId: null, teamId: Number(teamId) };
    if (!out[teamId].teamId) out[teamId].teamId = Number(teamId);
  
    // Fill/merge name and ownerId without nuking a better existing name
    if (guid && !out[teamId].ownerId) out[teamId].ownerId = guid;
    if (!out[teamId].name) {
      const fallback = t?.name ? String(t.name) : `Team ${teamId}`;
      out[teamId].name = canonOwner(bestName || fallback);
    }
  });
  
}

  return out;
}

// ----------------------- public API ---------------------------
/**
 * Build/refresh the global caches.
 * Pass `manualAliases` to pin tricky usernames: e.g. { "Omgmuffins1": "Michael Doto" }
 */
export function primeOwnerMaps({
  league,
  selectedLeague,
  espnOwnerByTeamByYear = {},
  manualAliases = {},
}) {
  const canonByMergeLeague = _canonFromMergeHelpers(league || selectedLeague || {});
  const canonOwner = (name) => {
    // 1) merge-helpers canonicalizer (if configured in your app)
    const m = canonByMergeLeague(name);
    if (m) return m;
    // 2) global alias map
    return canonicalizeOwner(name);
  };

  // Build alias map once per “shape” of the data
  const key = JSON.stringify({
    ownersA: (league?.owners || []).length,
    ownersB: (selectedLeague?.owners || []).length,
    seasonsObj: (_readEspnSeasons() || []).length,
    propSeasons: Object.keys(espnOwnerByTeamByYear || {}).length,
    manualAliases: Object.keys(manualAliases || {}).length,
  });

  if (key !== _lastKey) {
    _aliasMap = _buildAliasMap({ league, selectedLeague, manualAliases });
    const seasonsToBuild = new Set();
    _readEspnSeasons().forEach((s) => seasonsToBuild.add(Number(s?.seasonId)));
    Object.keys(espnOwnerByTeamByYear || {}).forEach((s) =>
      seasonsToBuild.add(Number(s))
    );

    const next = {};
    for (const s of seasonsToBuild) {
      next[s] = _buildSeasonMap({
        season: s,
        league,
        selectedLeague,
        espnOwnerByTeamByYear,
        canonOwner,
      });
    }

    _cache = next;
    _lastKey = key;

    if (typeof window !== "undefined") {
      console.debug("ownerMaps primed", {
        seasons: Array.from(seasonsToBuild).sort(),
        sampleSeason:
          Array.from(seasonsToBuild).sort()[0] || "—",
      });
    }
  }
}

/** Resolve one owner name (season + teamId) – always canonicalize on read */
export function ownerName(season, teamId) {
  const m = _cache?.[Number(season)];
  const raw = m ? m[teamId] || m[String(teamId)] : null;
  return raw ? raw.name : null;
}

/** Resolve ownerId (GUID) for a given season and teamId */
export function ownerId(season, teamId) {
  const m = _cache?.[Number(season)];
  const raw = m ? m[teamId] || m[String(teamId)] : null;
  return raw ? raw.ownerId : null;
}

/** Whole map for a season (for debugging) */
export function ownerMapFor(season) {
  return _cache?.[Number(season)] || {};
}

if (typeof window !== "undefined") {
  window.__ownerMaps = {
    prime: primeOwnerMaps,
    mapFor: ownerMapFor,
    name: ownerName,
    id: ownerId, // Returns the GUID (ownerId)
    canon: canonicalizeOwner,
    // show which teamIds still don't resolve to a real name
    diff(season) {
      const m = ownerMapFor(season) || {};
      const missing = Object.entries(m).filter(([, v]) => !v.name || v.name === "Unknown");
      return missing.map(([teamId]) => Number(teamId));
    },
    // 👇 NEW: debug helpers
    aliasDump() {
      // returns { normalizedKey: "Target Full Name", ... }
      return Object.fromEntries((_aliasMap || new Map()).entries());
    },
    cacheDump() {
      // returns the full season->teamId->owner map object
      return JSON.parse(JSON.stringify(_cache || {}));
    },
  };
}