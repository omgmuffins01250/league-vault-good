import type { LegacyRow, Payload, SeasonSlim } from "../types/payload";

export type Platform = "ESPN" | "SLEEPER";

export type LeagueEntry = {
  leagueId: string | number;
  leagueName: string;
  platform: Platform;
  seasons: SeasonSlim[];
  legacyRows: LegacyRow[];
  legacySeasonsLite: any[];
  rostersByYear: Payload["rostersByYear"];
  lineupSlotsByYear: Payload["lineupSlotsByYear"];
  currentWeekByYear: Payload["currentWeekByYear"];
  rosterAcqByYear: Payload["rosterAcqByYear"];
  ownerByTeamByYear: Payload["ownerByTeamByYear"];
  teamNamesByOwner: Payload["teamNamesByOwner"];
  adpByYear: Payload["adpByYear"];
  adpRichByYear: Payload["adpRichByYear"];
  proTeamsByYear: Payload["proTeamsByYear"];
};

export type LeagueState = {
  leagues: Record<string, LeagueEntry>;
  activeLeagueId?: string | number;
};

export const UPSERT_LEAGUE = "league/upsertLeagueFromExtension" as const;
export const SET_ACTIVE_LEAGUE = "league/setActiveLeague" as const;

export type UpsertLeagueAction = {
  type: typeof UPSERT_LEAGUE;
  payload: Payload & { platform?: Platform };
};

export type SetActiveLeagueAction = {
  type: typeof SET_ACTIVE_LEAGUE;
  payload: string | number | undefined;
};

export type LeagueAction = UpsertLeagueAction | SetActiveLeagueAction | { type: "@@INIT" };

export const STORAGE_KEY = "FL_STORE_v2";
const LEGACY_STORAGE_KEY = "FL_STORE_v1";

const initialEntry: LeagueEntry = {
  leagueId: "",
  leagueName: "",
  platform: "ESPN",
  seasons: [],
  legacyRows: [],
  legacySeasonsLite: [],
  rostersByYear: {},
  lineupSlotsByYear: {},
  currentWeekByYear: {},
  rosterAcqByYear: {},
  ownerByTeamByYear: {},
  teamNamesByOwner: {},
  adpByYear: {},
  adpRichByYear: {},
  proTeamsByYear: {},
};

export const initialState: LeagueState = { leagues: {} };

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn("Failed to parse stored league state", error);
    return null;
  }
}

function legacyEntryToLeague(leagueId: string, value: any): LeagueEntry {
  const legacyOwners =
    value?.espnOwnerByTeamByYear || value?.espnOwnerMapByYear || {};
  const platform: Platform = value?.platform === "SLEEPER" ? "SLEEPER" : "ESPN";
  return {
    ...initialEntry,
    leagueId: value?.leagueId ?? leagueId,
    leagueName:
      value?.leagueName || value?.name || value?.settings?.name || `League ${leagueId}`,
    platform,
    seasons: Array.isArray(value?.seasons) ? value.seasons : [],
    legacyRows: Array.isArray(value?.rows) ? value.rows : Array.isArray(value?.legacyRows) ? value.legacyRows : [],
    legacySeasonsLite: Array.isArray(value?.legacySeasonsLite) ? value.legacySeasonsLite : [],
    rostersByYear: value?.rostersByYear || value?.espnRostersByYear || {},
    lineupSlotsByYear: value?.lineupSlotsByYear || value?.espnLineupSlotsByYear || {},
    currentWeekByYear: value?.currentWeekByYear || value?.espnCurrentWeekBySeason || {},
    rosterAcqByYear: value?.rosterAcqByYear || value?.espnRosterAcqByYear || {},
    ownerByTeamByYear: legacyOwners,
    teamNamesByOwner: value?.teamNamesByOwner || value?.espnTeamNamesByOwner || {},
    adpByYear: value?.adpByYear || {},
    adpRichByYear: value?.adpRichByYear || value?.adpSourceByYear || {},
    proTeamsByYear: value?.proTeamsByYear || {},
  };
}

function migrateLegacyState(raw: any): LeagueState {
  if (!raw || typeof raw !== "object") return initialState;
  if (raw.leagues && typeof raw.leagues === "object") {
    return {
      leagues: Object.fromEntries(
        Object.entries(raw.leagues).map(([id, value]) => [
          id,
          legacyEntryToLeague(id, value),
        ])
      ),
      activeLeagueId: raw.activeLeagueId,
    };
  }

  if (!raw.leaguesById || typeof raw.leaguesById !== "object") {
    return initialState;
  }

  const leagues = Object.fromEntries(
    Object.entries(raw.leaguesById).map(([id, value]) => [
      id,
      legacyEntryToLeague(id, value),
    ])
  );

  return { leagues, activeLeagueId: raw.lastSelectedLeagueId };
}

export function loadInitialState(): LeagueState {
  if (typeof window === "undefined") return initialState;
  const stored = safeParse<LeagueState>(window.localStorage.getItem(STORAGE_KEY));
  if (stored && stored.leagues) {
    return migrateLegacyState(stored);
  }
  const legacy = safeParse<any>(window.localStorage.getItem(LEGACY_STORAGE_KEY));
  if (legacy) {
    const migrated = migrateLegacyState(legacy);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    } catch (error) {
      console.warn("Failed to persist migrated league store", error);
    }
    return migrated;
  }
  return initialState;
}

export function persistState(state: LeagueState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Failed to persist league state", error);
  }
}

function mergeSeasons(prev: SeasonSlim[] = [], next: SeasonSlim[] = []): SeasonSlim[] {
  const map = new Map<number, SeasonSlim>();
  prev.forEach((season) => {
    if (season && typeof season.seasonId === "number") {
      map.set(season.seasonId, season);
    }
  });
  next.forEach((season) => {
    if (season && typeof season.seasonId === "number") {
      map.set(season.seasonId, season);
    }
  });
  return Array.from(map.values()).sort((a, b) => a.seasonId - b.seasonId);
}

function mergeLegacyRows(prev: LegacyRow[] = [], next: LegacyRow[] = []): LegacyRow[] {
  const keyFor = (row: LegacyRow) =>
    [row.season, row.week ?? "", row.manager ?? "", row.opponent ?? "", row.team_name ?? ""].join("|");
  const map = new Map<string, LegacyRow>();
  prev.forEach((row) => {
    if (!row) return;
    map.set(keyFor(row), row);
  });
  next.forEach((row) => {
    if (!row) return;
    map.set(keyFor(row), row);
  });
  return Array.from(map.values());
}

function mergeShallowRecords<T>(prev: Record<string, T> = {}, next: Record<string, T> = {}): Record<string, T> {
  return { ...prev, ...next };
}

function mergeNestedRecords(prev: Record<string, any> = {}, next: Record<string, any> = {}): Record<string, any> {
  const out: Record<string, any> = { ...prev };
  for (const [key, value] of Object.entries(next || {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = mergeNestedRecords(prev?.[key] || {}, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function mergeRosters(
  prev: Payload["rostersByYear"] = {},
  next: Payload["rostersByYear"] = {}
): Payload["rostersByYear"] {
  const out: Payload["rostersByYear"] = { ...prev };
  for (const [season, teams] of Object.entries(next || {})) {
    const prevTeams = prev?.[season] || {};
    const mergedTeams: Record<string, any> = { ...prevTeams };
    for (const [teamId, weeks] of Object.entries(teams || {})) {
      const prevWeeks = prevTeams?.[teamId] || {};
      const mergedWeeks: Record<string, any> = { ...prevWeeks };
      for (const [week, players] of Object.entries(weeks || {})) {
        mergedWeeks[week] = Array.isArray(players) ? players.map((p) => ({ ...p })) : players;
      }
      mergedTeams[teamId] = mergedWeeks;
    }
    out[season] = mergedTeams;
  }
  return out;
}

function mergeRosterAcq(
  prev: Payload["rosterAcqByYear"] = {},
  next: Payload["rosterAcqByYear"] = {}
): Payload["rosterAcqByYear"] {
  const out: Payload["rosterAcqByYear"] = { ...prev };
  for (const [season, teams] of Object.entries(next || {})) {
    const prevTeams = prev?.[season] || {};
    const mergedTeams: Record<string, any> = { ...prevTeams };
    for (const [teamId, players] of Object.entries(teams || {})) {
      mergedTeams[teamId] = mergeNestedRecords(prevTeams?.[teamId] || {}, players || {});
    }
    out[season] = mergedTeams;
  }
  return out;
}

function detectPlatform(payload: Payload & { platform?: Platform }, fallback?: Platform): Platform {
  if (payload.platform === "ESPN" || payload.platform === "SLEEPER") {
    return payload.platform;
  }
  if (fallback === "ESPN" || fallback === "SLEEPER") {
    return fallback;
  }

  const hasProj = Object.values(payload.rostersByYear || {}).some((teams) =>
    Object.values(teams || {}).some((weeks: any) =>
      Object.values(weeks || {}).some((players: any) =>
        Array.isArray(players) &&
        players.some((player) => Number(player?.proj ?? player?.projStart ?? 0) > 0)
      )
    )
  );
  if (hasProj) return "ESPN";

  const hasProTeams = Object.values(payload.proTeamsByYear || {}).some(
    (teamMap) => teamMap && Object.keys(teamMap).length > 0
  );
  if (hasProTeams) return "ESPN";

  return "SLEEPER";
}

export function upsertLeagueFromExtension(payload: Payload & { platform?: Platform }): UpsertLeagueAction {
  return { type: UPSERT_LEAGUE, payload };
}

export function setActiveLeague(leagueId: string | number | undefined): SetActiveLeagueAction {
  return { type: SET_ACTIVE_LEAGUE, payload: leagueId };
}

export function leagueReducer(state: LeagueState = initialState, action: LeagueAction): LeagueState {
  switch (action.type) {
    case UPSERT_LEAGUE: {
      const payload = action.payload;
      if (!payload || payload.leagueId == null) {
        return state;
      }
      const leagueKey = String(payload.leagueId);
      const prev = state.leagues[leagueKey];
      const platform = detectPlatform(payload, prev?.platform);

      const mergedEntry: LeagueEntry = {
        ...initialEntry,
        ...prev,
        leagueId: payload.leagueId,
        leagueName: payload.leagueName || prev?.leagueName || `League ${leagueKey}`,
        platform,
        seasons: mergeSeasons(prev?.seasons, payload.seasons || []),
        legacyRows: mergeLegacyRows(prev?.legacyRows, payload.legacyRows || []),
        legacySeasonsLite: Array.isArray(payload.legacySeasonsLite)
          ? payload.legacySeasonsLite
          : prev?.legacySeasonsLite || [],
        rostersByYear: mergeRosters(prev?.rostersByYear, payload.rostersByYear || {}),
        lineupSlotsByYear: mergeNestedRecords(prev?.lineupSlotsByYear || {}, payload.lineupSlotsByYear || {}),
        currentWeekByYear: mergeShallowRecords(prev?.currentWeekByYear || {}, payload.currentWeekByYear || {}),
        rosterAcqByYear: mergeRosterAcq(prev?.rosterAcqByYear, payload.rosterAcqByYear || {}),
        ownerByTeamByYear: mergeNestedRecords(prev?.ownerByTeamByYear || {}, payload.ownerByTeamByYear || {}),
        teamNamesByOwner: mergeNestedRecords(prev?.teamNamesByOwner || {}, payload.teamNamesByOwner || {}),
        adpByYear: mergeShallowRecords(prev?.adpByYear || {}, payload.adpByYear || {}),
        adpRichByYear: mergeNestedRecords(prev?.adpRichByYear || {}, payload.adpRichByYear || {}),
        proTeamsByYear: mergeNestedRecords(prev?.proTeamsByYear || {}, payload.proTeamsByYear || {}),
      };

      return {
        leagues: { ...state.leagues, [leagueKey]: mergedEntry },
        activeLeagueId: state.activeLeagueId ?? payload.leagueId,
      };
    }
    case SET_ACTIVE_LEAGUE: {
      return { ...state, activeLeagueId: action.payload };
    }
    default:
      return state;
  }
}
