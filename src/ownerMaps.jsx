let _cache = {}; // { [season:number]: { [teamId:number|string]: { name: "Owner Name", handle?: string|null, ownerId: string|null, teamId: number } } }
let _aliasMap = null; // Map<normalized alias, "Owner Name"> (global canonicalizer)
let _canonMergeFns = []; // Array<function(name) -> canonical name|null>
let _lastKey = "";
let _seasonCache = [];
let _manualAliasHistory = {};
let _manualAliasDatasetKey = "";

const OWNERMAPS_STORAGE_KEY = "fl_ownerMaps::state::v1";

function _safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function _persistOwnerMapsState() {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      cache: _cache,
      aliasEntries: Array.from((_aliasMap || new Map()).entries()),
      lastKey: _lastKey,
      seasonCache: Array.isArray(_seasonCache) ? _seasonCache : [],
      manualAliasHistory:
        _manualAliasHistory && typeof _manualAliasHistory === "object"
          ? _manualAliasHistory
          : {},
      manualAliasDatasetKey: _manualAliasDatasetKey,
    };
    window.localStorage?.setItem(OWNERMAPS_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("ownerMaps persist failed", err);
  }
}

function _hydrateOwnerMapsState() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage?.getItem(OWNERMAPS_STORAGE_KEY);
    if (!raw) return;
    const parsed = _safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== "object") return;
    if (parsed.cache && typeof parsed.cache === "object") {
      _cache = parsed.cache;
    }
    if (Array.isArray(parsed.aliasEntries)) {
      _aliasMap = new Map(parsed.aliasEntries);
    } else if (_aliasMap == null) {
      _aliasMap = new Map();
    }
    if (typeof parsed.lastKey === "string") {
      _lastKey = parsed.lastKey;
    }
    if (Array.isArray(parsed.seasonCache)) {
      _seasonCache = parsed.seasonCache.slice();
    }
    if (
      parsed.manualAliasHistory &&
      typeof parsed.manualAliasHistory === "object"
    ) {
      _manualAliasHistory = parsed.manualAliasHistory;
    }
    if (typeof parsed.manualAliasDatasetKey === "string") {
      _manualAliasDatasetKey = parsed.manualAliasDatasetKey;
    }
  } catch (err) {
    console.warn("ownerMaps hydrate failed", err);
  }
}

_hydrateOwnerMapsState();

// ----------------------- helpers ------------------------------
const _norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[\s._-]+/g, "") // smash spaces/._- together
    .replace(/[^a-z0-9]/g, ""); // strip everything else

function _canonFromMergeHelpers(leagueLike) {
  const leagueId =
    leagueLike?.meta?.id ??
    leagueLike?.meta?.leagueId ??
    leagueLike?.meta?.espnLeagueId ??
    null;

  // returns a function(name) -> canonical name OR null
  return (name) => {
    try {
      const mh =
        (typeof window !== "undefined" && window.FL_mergeHelpers) || {};
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
    const s =
      (typeof window !== "undefined" && window.__FL_ESPN?.seasons) || null;
    if (Array.isArray(s)) return s;
  } catch {}
  // 1b) window.__espnSeasons (flat array stash)
  try {
    const s = (typeof window !== "undefined" && window.__espnSeasons) || null;
    if (Array.isArray(s)) return s;
  } catch {}

  // 2) window.__FL_PAYLOAD (some apps stash here)
  try {
    const s =
      (typeof window !== "undefined" && window.__FL_PAYLOAD?.seasons) || null;
    if (Array.isArray(s)) return s;
  } catch {}

  // 3) window.name (your prior approach)
  try {
    const payload = parsePayloadString(
      typeof window !== "undefined" ? window.name : ""
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
function _buildAliasMap({
  league,
  selectedLeague,
  manualAliases,
  espnSeasons,
}) {
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
  const seasons = Array.isArray(espnSeasons) ? espnSeasons : _readEspnSeasons();
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
  Object.entries(manualAliases || {}).forEach(([alias, target]) =>
    add(alias, target)
  );

  return map;
}

// exported
export function canonicalizeOwner(raw) {
  let value = String(raw || "").trim();
  if (!value) return value;

  if (Array.isArray(_canonMergeFns) && _canonMergeFns.length) {
    for (const fn of _canonMergeFns) {
      if (typeof fn !== "function") continue;
      try {
        const merged = fn(value);
        if (merged && typeof merged === "string") {
          const trimmed = merged.trim();
          if (trimmed) value = trimmed;
        }
      } catch {}
    }
  }

  const k = _norm(value);
  if (k && _aliasMap && _aliasMap.has(k)) return _aliasMap.get(k);
  return value;
}

// ----------------------- season map builder -------------------
function _buildSeasonMap({
  season,
  league,
  selectedLeague,
  espnOwnerByTeamByYear,
  canonOwner,
  espnSeasons,
  existingSeasonMap,
}) {
  const s = Number(season);
  const out = {};

  // 1) explicit per-season map passed in
  const direct = espnOwnerByTeamByYear?.[s];
  if (direct && Object.keys(direct).length) {
    Object.entries(direct).forEach(([tid, nm]) => {
      out[tid] = {
        name: canonOwner(nm),
        handle: String(nm || null), // ← keep the ESPN handle
        ownerId: null,
        teamId: Number(tid),
      };
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
      if (!out[tid]) {
        out[tid] = {
          name: canonOwner(nm),
          handle: String(nm || null), // ← preserve handle
          ownerId: null,
          teamId: Number(tid),
        };
      }
    });
  }

  // 3) team-name join using teamNamesByOwner (if you maintain it)
  const seasons = Array.isArray(espnSeasons) ? espnSeasons : _readEspnSeasons();
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
      if (owner)
        out[teamId] = {
          name: canonOwner(owner),
          ownerId: null,
          teamId: Number(teamId),
        };
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

      const guid =
        (Array.isArray(t?.owners) && t.owners[0]) || t?.primaryOwner || null;
      const bestName = guid ? guidToName.get(guid) : null;

      // Ensure an entry object exists
      if (!out[teamId])
        out[teamId] = { name: null, ownerId: null, teamId: Number(teamId) };
      if (!out[teamId].teamId) out[teamId].teamId = Number(teamId);

      // Fill/merge name and ownerId without nuking a better existing name
      if (guid && !out[teamId].ownerId) out[teamId].ownerId = guid;

      // prefer member real/display name, but always keep any existing handle
      const fallback = t?.name ? String(t.name) : `Team ${teamId}`;
      const preferred = bestName || fallback;

      // name becomes the nice/canonical name…
      out[teamId].name = canonOwner(preferred);

      // …and DO NOT overwrite handle if we already set it earlier.
      // If you also want a fallback handle from team name, you could set it here,
      // but usually we only set handle from ownerByTeamByYear.
      if (out[teamId].handle == null) {
        // leave as null; handle should come from ownerByTeamByYear
      }
    });
  }

  const previousEntries = existingSeasonMap && typeof existingSeasonMap === "object"
    ? existingSeasonMap
    : null;
  if (previousEntries) {
    Object.entries(previousEntries).forEach(([tid, prevRaw]) => {
      if (!prevRaw || typeof prevRaw !== "object") return;
      const prev = {
        name: prevRaw.name || null,
        handle: prevRaw.handle || null,
        ownerId: prevRaw.ownerId || null,
        teamId: Number(prevRaw.teamId ?? tid),
      };

      const current = out[tid];
      if (!current) {
        out[tid] = { ...prev };
        return;
      }

      const merged = { ...current };
      const prevName = typeof prev.name === "string" ? prev.name.trim() : "";
      const hasPrevName = !!prevName;
      const currentName = typeof merged.name === "string" ? merged.name.trim() : "";
      const currentHandle = typeof merged.handle === "string" ? merged.handle.trim() : "";

      if (
        hasPrevName &&
        (!currentName ||
          currentName.toLowerCase() === "unknown" ||
          (currentName && currentName === currentHandle))
      ) {
        merged.name = prevName;
      }

      if (!merged.ownerId && prev.ownerId) {
        merged.ownerId = prev.ownerId;
      }

      if ((merged.handle == null || merged.handle === "") && prev.handle) {
        merged.handle = prev.handle;
      }

      out[tid] = merged;
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
  espnSeasons = null,
}) {
  const seasonsInput = Array.isArray(espnSeasons) ? espnSeasons : null;
  if (seasonsInput && seasonsInput.length) {
    _seasonCache = seasonsInput.slice();
  }

  let seasons = _seasonCache.slice();
  if (!seasons.length) {
    seasons = _readEspnSeasons();
    if (Array.isArray(seasons) && seasons.length) {
      _seasonCache = seasons.slice();
    } else {
      seasons = [];
    }
  }

  const normalizeOwners = (lg) =>
    Array.isArray(lg?.owners)
      ? lg.owners
          .map((o) => String(o || "").trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
      : [];
  const ownerSigA = normalizeOwners(league).join("|");
  const ownerSigB = normalizeOwners(selectedLeague).join("|");
  const leagueIdSig = String(
    league?.meta?.id ??
      league?.meta?.leagueId ??
      league?.meta?.espnLeagueId ??
      ""
  ).trim();
  const selectedLeagueIdSig = String(
    selectedLeague?.meta?.id ??
      selectedLeague?.meta?.leagueId ??
      selectedLeague?.meta?.espnLeagueId ??
      ""
  ).trim();
  const seasonSig = seasons
    .map((s) => Number(s?.seasonId) || 0)
    .filter(Boolean)
    .sort((a, b) => a - b)
    .join("|");
  const propSeasonSig = Object.keys(espnOwnerByTeamByYear || {})
    .map((k) => Number(k) || 0)
    .filter(Boolean)
    .sort((a, b) => a - b)
    .join("|");

  const datasetKey = JSON.stringify({
    leagueIdSig,
    selectedLeagueIdSig,
    ownerSigA,
    ownerSigB,
    seasonSig,
    propSeasonSig,
  });
  if (datasetKey !== _manualAliasDatasetKey) {
    _manualAliasHistory = {};
    _manualAliasDatasetKey = datasetKey;
  }

  const mergedManualAliases = {
    ..._manualAliasHistory,
    ...(manualAliases || {}),
  };
  _manualAliasHistory = mergedManualAliases;
  const manualAliasKey = Object.entries(mergedManualAliases)
    .map(([alias, target]) => `${_norm(alias)}=>${String(target || "").trim()}`)
    .sort()
    .join("|");

  const canonMergeFns = [];
  if (league) canonMergeFns.push(_canonFromMergeHelpers(league));
  if (selectedLeague)
    canonMergeFns.push(_canonFromMergeHelpers(selectedLeague));
  _canonMergeFns = canonMergeFns;

  const canonByMergeLeague = _canonFromMergeHelpers(
    league || selectedLeague || {}
  );
  const canonOwner = (name) => {
    // 1) merge-helpers canonicalizer (if configured in your app)
    const m = canonByMergeLeague(name);
    if (m) return m;
    // 2) global alias map
    return canonicalizeOwner(name);
  };

  // Build alias map once per “shape” of the data
  const key = JSON.stringify({
    datasetKey,
    seasonsCount: seasons.length,
    manualAliasKey,
  });

  if (key !== _lastKey) {
    _aliasMap = _buildAliasMap({
      league,
      selectedLeague,
      manualAliases: mergedManualAliases,
      espnSeasons: seasons,
    });
    const seasonsToBuild = new Set();
    seasons.forEach((s) => seasonsToBuild.add(Number(s?.seasonId)));
    Object.keys(espnOwnerByTeamByYear || {}).forEach((s) =>
      seasonsToBuild.add(Number(s))
    );

    const previousCache = _cache || {};
    const next = {};
    for (const s of seasonsToBuild) {
      next[s] = _buildSeasonMap({
        season: s,
        league,
        selectedLeague,
        espnOwnerByTeamByYear,
        canonOwner,
        espnSeasons: seasons,
        existingSeasonMap: previousCache?.[Number(s)],
      });
    }

    _cache = next;
    _lastKey = key;

    if (typeof window !== "undefined") {
      console.debug("ownerMaps primed", {
        seasons: Array.from(seasonsToBuild).sort(),
        sampleSeason: Array.from(seasonsToBuild).sort()[0] || "—",
      });
    }
  }

  _persistOwnerMapsState();
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
export function ownerHandle(season, teamId) {
  const m = _cache?.[Number(season)];
  const raw = m ? m[teamId] || m[String(teamId)] : null;
  return raw ? raw.handle || null : null;
}

if (typeof window !== "undefined") {
  window.__ownerMaps = {
    prime: primeOwnerMaps,
    mapFor: ownerMapFor,
    name: ownerName,
    id: ownerId, // Returns the GUID (ownerId)
    handle: ownerHandle,
    canon: canonicalizeOwner,
    // show which teamIds still don't resolve to a real name
    diff(season) {
      const m = ownerMapFor(season) || {};
      const missing = Object.entries(m).filter(
        ([, v]) => !v.name || v.name === "Unknown"
      );
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
